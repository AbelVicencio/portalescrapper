import type { NewsArticle, ExtensionMessage } from '../types';
import * as storage from '../storage/store';
import * as clipboard from '../utils/clipboard';
import * as exportUtils from '../utils/export';
import { login, logout, getCurrentUser } from '../api/auth';
import { resolvePortalByDomain, resolveEmisionPorEmisoraYFecha, grabarMedialog, buscarMedialogDuplicado, crearRelacionMedialog, type GrabarMedialogPayload } from '../api/client';
import { PORTAL_CLASSIFICATIONS } from '../config/portalClassifications';

// ============================================================================
// Inicialización dinámica y elástica del ancho del Side Panel
// Abre al 40% del ancho disponible de la pantalla, luego se vuelve 100% elástico.
// ============================================================================
(function initElasticSizing() {
  const initialWidth = Math.max(380, Math.round(window.screen.availWidth * 0.4));
  document.documentElement.style.minWidth = `${initialWidth}px`;
  document.body.style.minWidth = `${initialWidth}px`;

  setTimeout(() => {
    document.documentElement.style.minWidth = '320px';
    document.body.style.minWidth = '320px';
    console.log(`[PortalScrapper] Sidepanel set to elastic (min 320px), opened at ${initialWidth}px`);
  }, 600);
})();

let currentArticle: Partial<NewsArticle> = {};
let currentUser: string | null = null;
let currentToken: string | null = null;
let editingDirty = false;

const el = (id: string) => document.getElementById(id) as HTMLElement | null;

const THEME_KEY = 'portalescrapper_theme';
const ZOOM_KEY = 'portalescrapper_zoom';

let currentZoom = 1;

let isResolving = false;   // global guard to drop duplicate concurrent resolutions (the #1 cause of "panel freezes" feeling)

// ========================================================
// Normalización de fecha a hora local de Ciudad de México
// ========================================================
function toMexicoCityLocalISO(input: string | Date | undefined | null): string {
  if (!input) {
    const now = new Date();
    return now.toISOString().slice(0, 19); // fallback
  }

  try {
    const date = typeof input === 'string' ? new Date(input) : input;

    // Obtenemos la hora "de pared" en America/Mexico_City
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';

    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    const now = new Date();
    return now.toISOString().slice(0, 19);
  }
}

// Normaliza el texto de transcripción para preservar saltos de párrafo con \n\n
function normalizeTranscription(text: string | undefined | null): string {
  if (!text) return '';

  let t = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  // Si no tiene saltos de párrafo (texto monolítico), intentamos separarlo heurísticamente
  if (!t.includes('\n') && t.length > 200) {
    // Divide después de punto + espacio + mayúscula o comilla de apertura
    t = t.replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÑÜ"'])/g, '$1\n\n');
  }

  // Limpieza final
  t = t.replace(/\n{3,}/g, '\n\n').trim();

  return t;
}

// ========================================================
// GLOBAL ERROR SAFETY NET + UNRESPONSIVE PANEL DETECTION
// ========================================================
window.addEventListener('error', (ev) => {
  console.error('[PortalScrapper] UNCAUGHT ERROR (panel frozen risk):', ev.error || ev.message);
  showToast('Error grave – recarga el panel (F5) o desactiva/activ a la extensión');
});

window.addEventListener('unhandledrejection', (ev) => {
  console.error('[PortalScrapper] UNHANDLED PROMISE REJECTION (panel frozen risk):', ev.reason);
  showToast('Error asíncrono grave – recarga el panel inmediatamente');
});

// Helper para botones con loading seguro (evita múltiples clics que congelan el panel)
function withButtonLoading(buttonId: string, fn: () => Promise<void>) {
  return async () => {
    const btn = el(buttonId) as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      await fn();
    } catch (e: any) {
      console.error(`[PortalScrapper] Error en handler de ${buttonId}:`, e);
      showToast('Error – recarga el panel si no responde');
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}

/**
 * Robust session validator used before EVERY network call after panel init.
 * Returns true if we have a fresh JWT, otherwise forces login screen and returns false.
 */
async function ensureValidSession(): Promise<boolean> {
  const sess = await getCurrentUser();
  if (!sess) {
    console.warn('[PortalScrapper] Session invalid or expired – forcing login screen');
    showToast('Sesión expirada o inválida. Inicia sesión de nuevo.');
    showScreen('login');
    currentToken = null;
    currentUser = null;
    return false;
  }
  currentToken = sess.token;
  currentUser = sess.usuario;
  return true;
}

/** Detects any 401/403/expired token error that comes from the API client */
function isAuthError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString()).toLowerCase();
  return msg.includes('401') || msg.includes('403') || msg.includes('token') || msg.includes('expir');
}

function applyTheme(theme: 'dark' | 'light') {
  document.body.classList.toggle('light', theme === 'light');
  const btn = el('theme-toggle') as HTMLButtonElement | null;
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}

async function initTheme() {
  const res: any = await chrome.storage.local.get(THEME_KEY);
  const saved = res[THEME_KEY] as 'dark' | 'light' | undefined;
  const theme = saved || 'dark';
  applyTheme(theme);

  const btn = el('theme-toggle') as HTMLButtonElement | null;
  if (btn) {
    btn.onclick = async () => {
      const current = document.body.classList.contains('light') ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      await chrome.storage.local.set({ [THEME_KEY]: next });
    };
  }
}

function applyZoom() {
  document.body.style.zoom = currentZoom.toString();
}

async function saveZoom() {
  await chrome.storage.local.set({ [ZOOM_KEY]: currentZoom });
}

function getBaseDomain(hostname: string): string {
  hostname = hostname.replace(/^www\./, '');
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}

function updatePortalHeader() {
  const header = el('portal-header');
  const nameEl = el('portal-name');
  const countryEl = el('portal-country');

  if (!header || !nameEl) return;

  if (currentArticle.nombre_portal) {
    nameEl.textContent = currentArticle.nombre_portal;
    if (countryEl) countryEl.textContent = currentArticle.pais ? `(${currentArticle.pais})` : '';
    header.style.display = 'block';
  } else {
    header.style.display = 'none';
  }
}

async function initZoom() {
  const res: any = await chrome.storage.local.get(ZOOM_KEY);
  currentZoom = res[ZOOM_KEY] || 1;
  applyZoom();

  // Ctrl + +/- / 0
  document.addEventListener('keydown', async (e: KeyboardEvent) => {
    if (!e.ctrlKey) return;

    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      currentZoom = Math.min(currentZoom + 0.1, 2.0);
      applyZoom();
      await saveZoom();
    } else if (e.key === '-') {
      e.preventDefault();
      currentZoom = Math.max(currentZoom - 0.1, 0.6);
      applyZoom();
      await saveZoom();
    } else if (e.key === '0') {
      e.preventDefault();
      currentZoom = 1;
      applyZoom();
      await saveZoom();
    }
  });

  // Ctrl + Wheel
  document.addEventListener('wheel', async (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    if (e.deltaY < 0) {
      currentZoom = Math.min(currentZoom + 0.05, 2.0);
    } else {
      currentZoom = Math.max(currentZoom - 0.05, 0.6);
    }
    applyZoom();
    await saveZoom();
  }, { passive: false });
}

function showScreen(screen: 'login' | 'main') {
  const login = el('login-screen');
  const main = el('main-screen');
  if (login) login.classList.remove('active');
  if (main) main.classList.remove('active');
  if (screen === 'login') {
    if (login) login.classList.add('active');
  } else {
    if (main) main.classList.add('active');
  }
}

function setVersion() {
  const ver = el('version') as HTMLSpanElement | null;
  if (ver) ver.textContent = 'v' + chrome.runtime.getManifest().version;
  const loginVer = el('login-version') as HTMLSpanElement | null;
  if (loginVer) loginVer.textContent = 'v' + chrome.runtime.getManifest().version;
}

function showToast(msg: string, timeout = 2400) {
  const t = el('toast') as HTMLDivElement;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), timeout);
}

async function renderHistory() {
  const container = el('history-list');
  if (!container) return;
  container.innerHTML = '';
  const list = await storage.getAllArticles();
  list.slice(0, 18).forEach((article) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div style="flex:1; min-width:0;">
        <span style="font-size:12px;">${article.superabstract?.slice(0, 38) || article.url}</span><br>
        <span style="font-size:10px;color:#777;">${article.medio || ''} • ${article.status}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
        <span class="badge">${article.dbRecordId ? '#' + article.dbRecordId : article.status}</span>
        <button data-del="${article.id}" style="background:#3b0b0b; color:white; font-size:10px; padding:1px 4px;">🗑</button>
      </div>
    `;
    div.onclick = (ev: MouseEvent) => {
      if ((ev.target as HTMLElement).hasAttribute('data-del')) return;
      loadArticleIntoUI(article);
    };
    const delBtn = div.querySelector('[data-del]');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        storage.deleteArticle(article.id).then(() => {
          renderHistory();
          storage.updateBadge();
        });
      });
    }
    container.appendChild(div);
  });
}

function populateUI(article: Partial<NewsArticle>) {
  const setVal = (id: string, val: string) => {
    const input = el(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) input.value = val;
  };

  setVal('superabstract', article.superabstract || '');
  setVal('url', article.url || '');
  setVal('emisora', String(article.emisora || ''));
  setVal('portal', String(article.portal ?? article.pendiente ?? ''));
  setVal('emision', String(article.emision || 4659889));
  setVal('fecha', article.fecha || '');
  setVal('dbRecordId', String(article.dbRecordId || ''));
  setVal('medio', article.medio || '');
  setVal('autor', article.autor || '');
  setVal('texto', article.texto || '');
  renderClasificaciones(article.clasificaciones || []);
  updatePortalHeader();
}

function readFormIntoArticle(): NewsArticle {
  const id = currentArticle.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const getVal = (id: string) => (el(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value?.trim() || '';

  return {
    id,
    source: currentArticle.source || '',
    url: getVal('url'),
    urlWithParams: getVal('url'),
    emisora: parseInt(getVal('emisora'), 10) || 0,
    emision: parseInt(getVal('emision'), 10) || 4659889,
    fecha: toMexicoCityLocalISO(getVal('fecha') || now),
    usuario: currentUser || 'anon',
    evento: 1,
    superabstract: getVal('superabstract'),
    pendiente: parseInt(getVal('portal'), 10) || parseInt(getVal('pendiente'), 10) || 0,
    portal: parseInt(getVal('portal'), 10) || undefined,
    abstract: getVal('url'),
    texto: normalizeTranscription(getVal('texto')),
    autor: getVal('autor'),
    medio: getVal('medio'),
    clasificaciones: currentArticle.clasificaciones || [],
    notas: currentArticle.notas || '',
    nombre_portal: currentArticle.nombre_portal,
    pais: currentArticle.pais,
    capturedAt: currentArticle.capturedAt || now,
    lastModified: now,
    extractionMethod: currentArticle.extractionMethod || 'manual',
    confidence: currentArticle.confidence || 0.5,
    isFullContent: currentArticle.isFullContent ?? ((currentArticle.texto || '').length > 180),
    paywallDetected: !!currentArticle.paywallDetected,
    status: currentArticle.status || 'draft',
    dbRecordId: parseInt(getVal('dbRecordId'), 10) || currentArticle.dbRecordId,
  } as NewsArticle;
}

function collectClipboardTargets() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      const target = (ev.currentTarget as HTMLElement).getAttribute('data-target');
      let val = '';
      const getVal = (id: string) => (el(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value || '';
      if (target === 'superabstract') val = getVal('superabstract');
      else if (target === 'url') val = getVal('url');
      else if (target === 'texto') val = getVal('texto');
      const ok = await clipboard.copyToClipboard(val);
      if (ok) showToast('Copiado');
    });
  });
}

let clasificaciones: number[] = [];

function renderClasificaciones(list: number[]) {
  clasificaciones = [...list];
  const cont = el('clasificaciones');
  if (!cont) return;
  cont.innerHTML = '';
  clasificaciones.forEach((n, idx) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = String(n);
    chip.onclick = () => {
      clasificaciones.splice(idx, 1);
      renderClasificaciones(clasificaciones);
    };
    cont.appendChild(chip);
  });
}

function attachClasificacionHandlers() {
  const input = el('add-clasificacion') as HTMLInputElement | null;
  const btn = el('btn-add-clas') as HTMLButtonElement | null;

  if (!btn || !input) return;

  btn.onclick = () => {
    const v = parseInt(input.value, 10);
    if (!isNaN(v) && !clasificaciones.includes(v)) {
      clasificaciones.push(v);
      renderClasificaciones(clasificaciones);
    }
    input.value = '';
  };
}

function markDirty() {
  editingDirty = true;
}

function attachFormDirtyWatchers() {
  ['input', 'change'].forEach((ev) => {
    document.querySelectorAll('input, textarea').forEach((f) => {
      f.addEventListener(ev, markDirty);
    });
  });
}

async function autoResolveEmisora(url: string) {
  if (isResolving) {
    console.log('[PortalScrapper] autoResolveEmisora skipped (already running)');
    return;
  }
  isResolving = true;
  try {
    if (!(await ensureValidSession())) {
      isResolving = false;
      return;
    }
    if (!currentToken) {
      isResolving = false;
      return;
    }

    const fullHost = new URL(url).hostname;
    const baseDomain = getBaseDomain(fullHost);

    console.log(`[PortalScrapper] Resolviendo portal → baseDomain: ${baseDomain} (hostname original: ${fullHost})`);

    const result = await resolvePortalByDomain(currentToken, baseDomain, fullHost);
    if (result) {
      const emisoraInput = el('emisora') as HTMLInputElement | null;
      const portalInput = el('portal') as HTMLInputElement | null;

      if (emisoraInput) {
        emisoraInput.value = String(result.emisora);
      }
      if (portalInput) {
        portalInput.value = String(result.portal);
        showToast(`Portal auto-resuelto: ${result.portal} (Emisora: ${result.emisora})`);
      }

      // Persist resolved values into the model so future populateUI calls don't revert them
      currentArticle.emisora = result.emisora;
      currentArticle.portal = result.portal;
      currentArticle.pendiente = result.portal;

      // Store extra info for display and JSON
      if (result.nombre_portal) {
        currentArticle.nombre_portal = result.nombre_portal;
      }
      if (result.pais) {
        currentArticle.pais = result.pais;
      }
      updatePortalHeader();

      // Resolver Emisión automáticamente (siempre, para que se actualice si el usuario cambió Emisora)
      if (result.emisora && currentArticle.fecha) {
        const emisionInput = el('emision') as HTMLInputElement | null;
      const emision = await resolveEmisionPorEmisoraYFecha(
        currentToken!,
        result.emisora,
        currentArticle.fecha
      );
        if (emision && emisionInput) {
          emisionInput.value = String(emision);
          currentArticle.emision = emision;
          console.log(`[PortalScrapper] Emisión autocompletada: ${emision}`);
        }
      }
    }
  } catch (e) {
    console.error('[PortalScrapper] autoResolveEmisora error:', e);
  } finally {
    isResolving = false;
  }
}

async function requestExtractionWithRetries(attempts: number = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const sendP = chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
        const timeoutP = new Promise((_, rej) =>
          setTimeout(() => rej(new Error('content-script timeout')), 7000)
        );
        await Promise.race([sendP, timeoutP]);
        return;
      }
    } catch (e) {
      console.warn(`[PortalScrapper] Content-script reachability problem (attempt ${i + 1}):`, e);
    }
    await new Promise(res => setTimeout(res, 400 + (i * 700)));
  }
}

async function handleGrabarAPI() {
  // Session guard first – prevents using expired token and freezes
  if (!(await ensureValidSession())) {
    return;
  }

  const article = readFormIntoArticle();

  // ========================================================
  // GUARDIA INMEDIATA: si el formulario ya tiene Medialog ID → no grabar de nuevo
  // Esto resuelve el caso de dar muchos clicks seguidos al botón
  // ========================================================
  const existingDbId = parseInt((el('dbRecordId') as HTMLInputElement | null)?.value || '0', 10);
  if (existingDbId > 0) {
    showToast(`⚠️ Esta nota ya fue guardada en Medialog (#${existingDbId}). No se creó duplicado.`);
    return;
  }

  // ========================================================
  // CHEQUEO LOCAL (solo para extracciones frescas)
  // ========================================================
  // Leemos la URL directamente del DOM para evitar estado sucio de extracciones anteriores
  const currentUrl = (el('url') as HTMLInputElement | null)?.value?.trim() || '';
  const normalizedUrl = currentUrl.split('#')[0].split('?')[0];

  // Si el formulario ya tiene un Medialog ID (recién guardado o cargado de historial),
  // no volvemos a hacer el chequeo local agresivo.
  const currentFormDbId = parseInt((el('dbRecordId') as HTMLInputElement | null)?.value || '0', 10);

  if (normalizedUrl && currentFormDbId === 0 && !(window as any).FORCE_API) {
    const all = await storage.getAllArticles();
    const yaGuardadoLocal = all.find(a => {
      const au = (a.url || a.urlWithParams || '').trim();
      const an = au.split('#')[0].split('?')[0];
      return an === normalizedUrl && (a.dbRecordId || 0) > 0;
    });

    if (yaGuardadoLocal) {
      // Mostramos el ID anterior pero NO bloqueamos si el usuario tiene FORCE_API
      // (aunque ya lo saltamos arriba). Dejamos el mensaje informativo.
      showToast(`⚠️ Esta URL ya fue guardada localmente (#${yaGuardadoLocal.dbRecordId}).`);
      // No retornamos aquí para que el usuario pueda forzar con FORCE_API si quiere
    }
  }

  // === Fallback: Verificación contra API (para duplicados de otras sesiones) ===
  const duplicadoId = await buscarMedialogDuplicado(
    currentToken!,
    article.emisora || 0,
    article.fecha || '',
    article.superabstract || '',
    article.url || article.urlWithParams || ''
  );

  if (duplicadoId && duplicadoId > 0) {
    article.dbRecordId = duplicadoId;
    article.status = 'synced';
    await storage.saveArticle(article);
    showToast(`⚠️ Esta nota ya existe en Medialog (#${duplicadoId}). No se creó duplicado.`);
    populateUI(article);
    renderHistory();
    storage.updateBadge();
    return; // No continuamos con el POST
  }

  // 1) Save local draft (solo si NO es duplicado)
  article.status = 'draft';
  article.usuario = currentUser!;
  await storage.saveArticle(article);
  renderHistory();

  // 2) Build API payload
  // ============================================================
  // CRÍTICO: abstract DEBE contener SIEMPRE la URL original
  // El campo abstract se usa para búsquedas LIKE en /v1/medialogs/
  // y es tipo TEXT por compatibilidad, pero aquí se trata como URL.
  // ============================================================
  // ============================================================
  // CRÍTICO: abstract DEBE ser **siempre** la URL original (string plano)
  // El backend /v1/medialogs/?abstract=... hace LIKE '%URL%'
  // y el campo es TEXT por compatibilidad retro.  NUNCA dejarlo vacío.
  // ============================================================
  const urlParaAbstract =
        (el('url') as HTMLInputElement | null)?.value?.trim() ||
        (article.url || article.urlWithParams || '').trim();

  if (!urlParaAbstract) {
    console.error('[PortalScrapper][FATAL] La URL del artículo está vacía – no se puede poner en abstract');
  }

  (article as any).abstract = urlParaAbstract;

  const payload: GrabarMedialogPayload = {
    emisora: article.emisora,
    emision: article.emision,
    fecha: article.fecha,
    usuario: article.usuario,
    evento: article.evento,
    superabstract: article.superabstract.slice(0, 200),
    pendiente: article.portal ?? article.pendiente,
    abstract: urlParaAbstract,               // ← URL REAL, nunca vacío
    transcripcion: article.texto || '',
    analisis: article.notas || undefined,
  };

  // DEBUG fuerte – visible en consola del sidepanel
  console.log('[PortalScrapper][DEBUG] Payload para POST /v1/medialogs/', {
    abstract: payload.abstract,
    superabstract: payload.superabstract.substring(0, 60) + '...',
    emisora: payload.emisora,
    fecha: payload.fecha,
  });

  try {
    const dbId = await grabarMedialog(currentToken!, payload);
    if (dbId > 0) {
      article.dbRecordId = dbId;
      article.status = 'synced';
      await storage.saveArticle(article);

      // Copiar el nuevo ID al portapapeles del usuario
      try {
        await navigator.clipboard.writeText(String(dbId));
        showToast(`✅ Medialog #${dbId} copiado al portapapeles`);
      } catch (e) {
        showToast(`✅ Guardado en API #${dbId} (no se pudo copiar)`);
      }

      currentArticle = article;
      populateUI(article);
      renderHistory();
      storage.updateBadge();

      // ========================================================
      // CREACIÓN AUTOMÁTICA DE RELACIONES (Clasificaciones)
      // ========================================================
      const portalId = article.portal ?? article.pendiente ?? 0;
      const clasificaciones = PORTAL_CLASSIFICATIONS[portalId] || [];

      if (clasificaciones.length > 0) {
        console.log(`[PortalScrapper] Creando ${clasificaciones.length} relación(es) para portal ${portalId}...`);

        for (const clasificacion of clasificaciones) {
          await crearRelacionMedialog(
            currentToken!,
            dbId,
            clasificacion,
            article.fecha || payload.fecha,
            'R'
          );
        }
      }
    }
  } catch (err: any) {
    showToast('Error API: ' + (err.message || err));
  }
}

async function handleReExtract() {
  if (!(await ensureValidSession())) return;
  if (editingDirty) {
    if (!confirm('Tienes cambios sin guardar. ¿Re-extraer y sobrescribir?')) return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const sendP = chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_NOW' });
      const tmo = new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 6000));
      await Promise.race([sendP, tmo]);
    }
  } catch (e) {
    console.warn('[PortalScrapper] Re-extract content-script call failed:', e);
  }
  editingDirty = false;

  // Extra safety retry
  setTimeout(() => requestExtractionWithRetries(1), 800);
}

function loadArticleIntoUI(article: NewsArticle) {
  currentArticle = { ...article };

  // Normalizamos la fecha al cargar desde historial
  if (currentArticle.fecha) {
    currentArticle.fecha = toMexicoCityLocalISO(currentArticle.fecha);
  }

  if (currentArticle.texto) {
    currentArticle.texto = normalizeTranscription(currentArticle.texto as string);
  }

  editingDirty = false;
  populateUI(currentArticle);
  clasificaciones = article.clasificaciones || [];
  renderClasificaciones(clasificaciones);
}

function setupSidePanelMessageListener() {
  chrome.runtime.onMessage.addListener((msg: ExtensionMessage) => {
    if (msg.type === 'ARTICLE_EXTRACTED' && msg.payload) {
      const previousUrl = currentArticle.url || '';
      currentArticle = { ...currentArticle, ...msg.payload };
      if (!currentArticle.id) currentArticle.id = crypto.randomUUID();

      // Normalización
      if (currentArticle.fecha) {
        currentArticle.fecha = toMexicoCityLocalISO(
          (currentArticle.fecha as string).replace(/\|.*/g, '').trim()
        );
      }
      if (currentArticle.texto) {
        currentArticle.texto = normalizeTranscription(currentArticle.texto as string);
      }

      // === LIMPIEZA DE ESTADO cuando es una nota diferente ===
      const newUrl = currentArticle.url || '';
      const normalizedNew = newUrl.split('#')[0].split('?')[0];
      const normalizedPrev = previousUrl.split('#')[0].split('?')[0];

      if (normalizedNew && normalizedNew !== normalizedPrev) {
        // Es una nota distinta → limpiamos cualquier ID anterior que pudiera quedar
        currentArticle.dbRecordId = undefined;
        const dbIdInput = el('dbRecordId') as HTMLInputElement | null;
        if (dbIdInput) dbIdInput.value = '';
      }

      populateUI(currentArticle);
      editingDirty = false;

      const url = (el('url') as HTMLInputElement).value;
      if (url) autoResolveEmisora(url);
      showToast('Artículo extraído');
    }
    if (msg.type === 'SITE_DETECTED') {
      const info = el('detected-site');
      if (info) info.textContent = msg.payload.name + ' (' + msg.payload.site + ')';
      const meta = el('detected-meta');
      if (meta) meta.textContent = 'Listo para extraer. Presiona Grabar o Re-extraer.';

      // Trigger extraction with retries (important for pages that were already loaded)
      requestExtractionWithRetries(4);
    }
  });
}

async function handleLogin() {
  const user = (el('login-user') as HTMLInputElement).value.trim();
  const pass = (el('login-pass') as HTMLInputElement).value;
  const errorBox = el('login-error');
  if (errorBox) errorBox.textContent = '';

  if (!user || !pass) {
    if (errorBox) errorBox.textContent = 'Ingresa usuario y contraseña';
    return;
  }

  const result = await login(user, pass);
  if (result.success && result.usuario) {
    currentUser = result.usuario;
    const sess = await getCurrentUser();
    currentToken = sess?.token || null;
    (el('logged-user') as HTMLElement).textContent = currentUser;
    showScreen('main');
    await renderHistory();
  } else {
    if (errorBox) errorBox.textContent = result.error || 'Credenciales inválidas';
  }
}

async function handleLogout() {
  await logout();
  currentUser = null;
  currentToken = null;
  showScreen('login');
}

async function initMainUI() {
  const sess = await getCurrentUser();
  if (!sess) {
    showScreen('login');
    return;
  }

  currentUser = sess.usuario;
  currentToken = sess.token;
  const userLine = el('logged-user');
  if (userLine) userLine.textContent = currentUser;
  showScreen('main');

  // initial detected site
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const host = new URL(tab.url).hostname;
      const siteEl = el('detected-site');
      if (siteEl) siteEl.textContent = host;
    } catch {}
  }

  collectClipboardTargets();
  attachClasificacionHandlers();
  attachFormDirtyWatchers();

  // Re-resolve emisión when the user manually edits the Emisora field
  const emisoraInputForListener = el('emisora') as HTMLInputElement | null;
  if (emisoraInputForListener) {
    emisoraInputForListener.addEventListener('change', async () => {
      if (!(await ensureValidSession())) return;
      if (!currentToken) return;
      const fecha = (el('fecha') as HTMLInputElement | null)?.value;
      const newEmisora = parseInt(emisoraInputForListener.value, 10);
      const emisionInput = el('emision') as HTMLInputElement | null;
      if (newEmisora > 0 && fecha && emisionInput) {
        const emision = await resolveEmisionPorEmisoraYFecha(currentToken!, newEmisora, fecha);
        if (emision) {
          emisionInput.value = String(emision);
          currentArticle.emision = emision;
          currentArticle.emisora = newEmisora;
          console.log(`[PortalScrapper] Emisión re-resuelta por cambio manual de Emisora → ${emision}`);
        }
      }
    });
  }

  // Normalizar fecha a hora CDMX cuando el usuario la edita manualmente
  const fechaInput = el('fecha') as HTMLInputElement | null;
  if (fechaInput) {
    fechaInput.addEventListener('blur', () => {
      if (fechaInput.value) {
        const normalized = toMexicoCityLocalISO(fechaInput.value);
        if (normalized !== fechaInput.value) {
          fechaInput.value = normalized;
        }
        currentArticle.fecha = normalized;
      }
    });
  }

  // Wire buttons safely
  const wire = (id: string, handler: () => void | Promise<void>) => {
    const btn = el(id) as HTMLButtonElement | null;
    if (btn) btn.onclick = handler;
  };

  wire('btn-grabar', withButtonLoading('btn-grabar', handleGrabarAPI));
  wire('btn-reextract', withButtonLoading('btn-reextract', handleReExtract));
  wire('btn-export-json', withButtonLoading('btn-export-json', async () => {
    const arts = await storage.getAllArticles();
    exportUtils.exportToJSON(arts);
  }));
  wire('btn-export-csv', withButtonLoading('btn-export-csv', async () => {
    const arts = await storage.getAllArticles();
    exportUtils.exportToCSV(arts);
  }));
  wire('btn-clear-all', withButtonLoading('btn-clear-all', async () => {
    if (confirm('¿Borrar TODO el historial local?')) {
      await storage.clearAll();
      await renderHistory();
      storage.updateBadge();
    }
  }));

  // Botón para borrar storage completo (útil para probar contra la API real)
  wire('btn-clear-storage', withButtonLoading('btn-clear-storage', async () => {
    if (confirm('⚠️ Esto borrará TODO (token, historial, tema, zoom, etc.). ¿Quieres continuar?')) {
      await storage.clearStorageCompletely();
      await renderHistory();
      storage.updateBadge();
      showToast('Storage borrado. Recarga el panel.');
      location.reload();
    }
  }));

  wire('btn-logout', handleLogout);
  wire('btn-generate-link', () => {
    const id = (currentArticle.dbRecordId || 0);
    if (id > 0) {
      const lnk = `https://api.medialog.com.mx/v1/medialogs/hash/${id}`;
      navigator.clipboard.writeText(lnk).then(() => showToast('Liga copiada'));
    } else {
      showToast('Aún no sincronizado con API');
    }
  });
  wire('btn-open-url', () => {
    const url = (el('url') as HTMLInputElement | null)?.value.trim();
    if (url) window.open(url, '_blank');
  });

  // Final safety net
  setTimeout(() => {
    requestExtractionWithRetries(2);
  }, 2500);

  // Resolution is triggered ONLY from ARTICLE_EXTRACTED listener (the reliable single path).
  // We deliberately removed the direct call that was causing the double-resolve right after reload.

  await renderHistory();
}

async function init() {
  await initTheme();
  await initZoom();
  setVersion();
  setupSidePanelMessageListener();

  const session = await getCurrentUser();
  if (session) {
    currentUser = session.usuario;
    currentToken = session.token;
    await initMainUI();
  } else {
    showScreen('login');
    const loginBtn = el('btn-login') as HTMLButtonElement | null;
    if (loginBtn) loginBtn.onclick = handleLogin;
    const loginPass = el('login-pass') as HTMLInputElement | null;
    if (loginPass) {
      loginPass.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') handleLogin();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
