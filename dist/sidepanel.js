"use strict";
(() => {
  // src/storage/store.ts
  var STORAGE_KEY = "portalescrapper_articles";
  async function getAllArticles() {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    return res[STORAGE_KEY] || [];
  }
  async function saveArticle(article) {
    const existing = await getAllArticles();
    const without = existing.filter((a) => a.id !== article.id);
    without.unshift(article);
    await chrome.storage.local.set({ [STORAGE_KEY]: without });
  }
  async function deleteArticle(id) {
    const list = await getAllArticles();
    const filtered = list.filter((a) => a.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }
  async function clearAll() {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
  async function clearStorageCompletely() {
    await chrome.storage.local.clear();
    console.log("[PortalScrapper] chrome.storage.local completamente borrado (forzar pruebas API)");
  }
  async function updateBadge(count) {
    const total = count ?? (await getAllArticles()).length;
    await chrome.action.setBadgeText({ text: total > 0 ? String(total) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  }

  // src/utils/clipboard.ts
  function copyToClipboard(text) {
    if (!text) return Promise.resolve(false);
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  // src/utils/export.ts
  function toMexicoCityLocalISO(input) {
    if (!input) {
      const now = /* @__PURE__ */ new Date();
      return now.toISOString().slice(0, 19);
    }
    try {
      const date = typeof input === "string" ? new Date(input) : input;
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const get = (type) => parts.find((p) => p.type === type)?.value || "";
      return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
    } catch {
      const now = /* @__PURE__ */ new Date();
      return now.toISOString().slice(0, 19);
    }
  }
  function normalizeTranscription(text) {
    if (!text) return "";
    let t = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
    if (!t.includes("\n") && t.length > 200) {
      t = t.replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÑÜ"'])/g, "$1\n\n");
    }
    return t.replace(/\n{3,}/g, "\n\n").trim();
  }
  function csvEscape(val) {
    if (val === null || val === void 0) return "";
    const str = Array.isArray(val) ? val.join("; ") : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  function exportToJSON(articles) {
    const normalizedArticles = articles.map((a2) => ({
      ...a2,
      fecha: toMexicoCityLocalISO(a2.fecha),
      fecha_transcripcion: toMexicoCityLocalISO(a2.fecha_transcripcion || a2.fecha),
      texto: normalizeTranscription(a2.texto)
    }));
    const payload = {
      exportDate: (/* @__PURE__ */ new Date()).toISOString(),
      version: "1.0.0",
      totalArticles: articles.length,
      articles: normalizedArticles
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portalescrapper-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportToCSV(articles) {
    const headers = [
      "id",
      "medio",
      "fecha",
      "fecha_transcripcion",
      "superabstract",
      "autor",
      "texto",
      "url",
      "emisora",
      "emision",
      "evento",
      "pendiente",
      "seccion",
      "tags",
      "clasificaciones",
      "notas",
      "extractionMethod",
      "confidence",
      "status",
      "dbRecordId"
    ];
    const rows = articles.map(
      (a2) => [
        csvEscape(a2.id),
        csvEscape(a2.medio),
        csvEscape(toMexicoCityLocalISO(a2.fecha)),
        csvEscape(toMexicoCityLocalISO(a2.fecha_transcripcion || a2.fecha)),
        csvEscape(a2.superabstract),
        csvEscape(a2.autor),
        csvEscape(normalizeTranscription(a2.texto)),
        csvEscape(a2.url),
        csvEscape(a2.emisora),
        csvEscape(a2.emision),
        csvEscape(a2.evento),
        csvEscape(a2.pendiente),
        csvEscape(a2.seccion),
        csvEscape(a2.tags),
        csvEscape(a2.clasificaciones),
        csvEscape(a2.notas),
        csvEscape(a2.extractionMethod),
        csvEscape(a2.confidence),
        csvEscape(a2.status),
        csvEscape(a2.dbRecordId)
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portalescrapper-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // src/api/client.ts
  var BASE_URL = "https://api.medialog.com.mx/v1";
  async function fetchWithTimeout(url, options = {}, timeoutMs = 15e3) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      if (err.name === "AbortError") {
        throw new APIMedialogError(408, "El servidor tard\xF3 demasiado en responder (Timeout).");
      }
      throw err;
    }
  }
  var APIMedialogError = class extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
      this.name = "APIMedialogError";
    }
  };
  async function getToken(username, password) {
    const res = await fetchWithTimeout(`${BASE_URL}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${username}:${password}`)
      },
      body: new URLSearchParams({ username, password }).toString()
    });
    if (!res.ok) throw new APIMedialogError(res.status, await res.text());
    const data = await res.json();
    return { access_token: data.access_token || data.data?.access_token, usuario: username };
  }
  async function resolvePortalByDomain(token, baseDomain, fullHostname) {
    const url = `${BASE_URL}/portales/?dominio=${encodeURIComponent(baseDomain)}`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new APIMedialogError(res.status, "Error resolving portal");
    const json = await res.json();
    const portals = json.data || [];
    console.log(`[PortalScrapper] === Portal Resolution ===`);
    console.log(`[PortalScrapper] Query: /portales/?dominio=${baseDomain}`);
    console.log(`[PortalScrapper] Full hostname from URL: ${fullHostname || "N/A"}`);
    console.log(`[PortalScrapper] Candidates returned by API:`, portals.map((p) => ({
      portal: p.portal,
      dominio: p.dominio,
      nombre_portal: p.nombre_portal,
      pais: p.pais,
      emisora: p.emisora
    })));
    if (portals.length === 0) {
      console.warn(`[PortalScrapper] No portals found for dominio=${baseDomain}`);
      return null;
    }
    let chosen = null;
    let reason = "";
    if (fullHostname && fullHostname !== baseDomain) {
      const exactSubdomainMatch = portals.find((p) => p.dominio === fullHostname);
      if (exactSubdomainMatch) {
        chosen = exactSubdomainMatch;
        reason = `exact subdomain match (URL contains ${fullHostname})`;
      }
    }
    if (!chosen) {
      const exactBaseMatch = portals.find((p) => p.dominio === baseDomain);
      if (exactBaseMatch) {
        chosen = exactBaseMatch;
        reason = `exact baseDomain match (${baseDomain})`;
      }
    }
    if (!chosen) {
      chosen = portals[0];
      reason = "fallback to first result (no exact match found)";
      console.warn(`[PortalScrapper] WARNING: No exact domain match found. Using first result.`);
    }
    console.log(`[PortalScrapper] \u2705 FINAL CHOSEN:`, {
      portal: chosen.portal,
      dominio: chosen.dominio,
      nombre_portal: chosen.nombre_portal,
      pais: chosen.pais,
      emisora: chosen.emisora
    }, `| Reason: ${reason}`);
    console.log(`[PortalScrapper] ===========================`);
    return {
      emisora: chosen.emisora,
      portal: chosen.portal,
      nombre_portal: chosen.nombre_portal,
      pais: chosen.pais
    };
  }
  async function grabarMedialog(token, payload) {
    const res = await fetchWithTimeout(`${BASE_URL}/medialogs/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new APIMedialogError(401, "Token expirado o inv\xE1lido");
      }
      throw new APIMedialogError(res.status, body);
    }
    const json = await res.json();
    return json.data?.medialog || json.medialog || json.data?.id || 0;
  }
  function toYMD(raw) {
    if (!raw) return "";
    const cleaned = raw.replace(/\|.*/g, "").trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      return cleaned.split("T")[0];
    }
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m2 = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m2}-${day}`;
    }
    const m = cleaned.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    const now = /* @__PURE__ */ new Date();
    return now.toISOString().split("T")[0];
  }
  async function resolveEmisionPorEmisoraYFecha(token, emisora, rawFecha) {
    try {
      const fecha = toYMD(rawFecha);
      const fechaInicio = fecha;
      const fechaFin = fecha;
      const url = `${BASE_URL}/emisiones/emisora/${emisora}?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
      const res = await fetchWithTimeout(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new APIMedialogError(res.status, "Token expirado o inv\xE1lido");
        }
        console.warn(`[PortalScrapper] Error al consultar emisiones: ${res.status}`);
        return null;
      }
      const json = await res.json();
      const primeraEmision = json?.data?.emisiones?.[0]?.emision;
      if (primeraEmision) {
        console.log(`[PortalScrapper] Emisi\xF3n encontrada para emisora ${emisora}: ${primeraEmision}`);
        return primeraEmision;
      }
      return null;
    } catch (e) {
      if (e instanceof APIMedialogError && (e.status === 401 || e.status === 403)) {
        throw e;
      }
      console.error("[PortalScrapper] Error en resolveEmisionPorEmisoraYFecha:", e);
      return null;
    }
  }
  async function buscarMedialogDuplicado(token, emisora, fecha, superabstract, url) {
    async function intentarBusquedaPorUrl(token2, liga2, fechaInicio2, fechaFin2, emisoraParam) {
      try {
        const params = new URLSearchParams({
          abstract: liga2,
          fecha_inicio: fechaInicio2,
          fecha_fin: fechaFin2,
          tamano_pagina: "500"
          // required – backend default 50 cuts off many exact matches
        });
        if (emisoraParam) params.set("emisora", emisoraParam);
        const urlBusqueda = `${BASE_URL}/medialogs/?${params.toString()}`;
        console.log(`[PortalScrapper] B\xFAsqueda URL ${emisoraParam ? "con" : "sin"} emisora: ${urlBusqueda}`);
        const res = await fetchWithTimeout(urlBusqueda, {
          headers: { Authorization: `Bearer ${token2}` }
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new APIMedialogError(res.status, "Token expirado o inv\xE1lido");
          }
          return null;
        }
        const json = await res.json();
        console.log("[PortalScrapper] RAW respuesta URL search:", JSON.stringify(json).slice(0, 300));
        const registros = json?.data?.registros || [];
        if (registros.length > 0) {
          const primero = registros[0];
          const id = primero?.medialog || primero?.id || primero?.medialog_id || 0;
          if (id > 0) return id;
        }
        return null;
      } catch (e) {
        if (e instanceof APIMedialogError && (e.status === 401 || e.status === 403)) {
          throw e;
        }
        return null;
      }
    }
    const day = toYMD(fecha);
    if (!day || !emisora) return null;
    const fechaInicio = day;
    const nextDay = /* @__PURE__ */ new Date(day + "T12:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const fechaFin = nextDay.toISOString().slice(0, 10);
    let titulo = (superabstract || "").trim();
    const delimiterMatch = titulo.match(/[:|\-]/);
    if (delimiterMatch && delimiterMatch.index && delimiterMatch.index > 15) {
      titulo = titulo.substring(0, delimiterMatch.index).trim();
    }
    if (titulo.length > 60) {
      titulo = titulo.substring(0, 60);
      const lastSpace = titulo.lastIndexOf(" ");
      if (lastSpace > 15) {
        titulo = titulo.substring(0, lastSpace);
      }
    }
    const liga = (url || "").trim();
    async function intentarBusquedaPorTitulo(token2, titulo2, fechaInicio2, fechaFin2, emisoraParam) {
      try {
        const params = new URLSearchParams({
          superabstract: titulo2,
          fecha_inicio: fechaInicio2,
          fecha_fin: fechaFin2,
          tamano_pagina: "200"
          // CRITICAL: backend defaults to 50; without this many exact title searches return 0
        });
        if (emisoraParam) params.set("emisora", emisoraParam);
        const urlBusqueda = `${BASE_URL}/medialogs/?${params.toString()}`;
        console.log(`[PortalScrapper] B\xFAsqueda t\xEDtulo ${emisoraParam ? "con" : "sin"} emisora: ${urlBusqueda}`);
        const res = await fetchWithTimeout(urlBusqueda, {
          headers: { Authorization: `Bearer ${token2}` }
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new APIMedialogError(res.status, "Token expirado o inv\xE1lido");
          }
          return null;
        }
        const json = await res.json();
        console.log("[PortalScrapper] RAW respuesta t\xEDtulo search:", JSON.stringify(json).slice(0, 300));
        const registros = json?.data?.registros || [];
        if (registros.length > 0) {
          const primero = registros[0];
          const id = primero?.medialog || primero?.id || primero?.medialog_id || 0;
          if (id > 0) return id;
        }
        return null;
      } catch (e) {
        if (e instanceof APIMedialogError && (e.status === 401 || e.status === 403)) {
          throw e;
        }
        return null;
      }
    }
    if (titulo.length > 0) {
      let dup = await intentarBusquedaPorTitulo(token, titulo, fechaInicio, fechaFin, String(emisora));
      if (!dup) {
        dup = await intentarBusquedaPorTitulo(token, titulo, fechaInicio, fechaFin);
      }
      if (dup) {
        console.log(`[PortalScrapper] \u2705 Duplicado (Paso 1 - superabstract): #${dup}`);
        return dup;
      }
    }
    if (liga.length > 0) {
      let foundId = await intentarBusquedaPorUrl(token, liga, fechaInicio, fechaFin, String(emisora));
      if (!foundId) {
        foundId = await intentarBusquedaPorUrl(token, liga, fechaInicio, fechaFin);
      }
      if (foundId) {
        console.log(`[PortalScrapper] \u2705 Duplicado (Paso 2 - URL): #${foundId}`);
        return foundId;
      }
    }
    console.log("[PortalScrapper] No se encontr\xF3 duplicado en los dos pasos.");
    return null;
  }
  async function crearRelacionMedialog(token, medialog, clasificacion, fecha, tipo = "R") {
    try {
      const payload = {
        medialog,
        clasificacion,
        fecha,
        tipo
      };
      const res = await fetchWithTimeout(`${BASE_URL}/relaciones/medialogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new APIMedialogError(res.status, "Token expirado o inv\xE1lido");
        }
        const errText = await res.text();
        console.warn(`[PortalScrapper] Error al crear relaci\xF3n medialog=${medialog} clasificacion=${clasificacion}: ${res.status} - ${errText}`);
        return false;
      }
      console.log(`[PortalScrapper] \u2705 Relaci\xF3n creada: medialog=${medialog}, clasificacion=${clasificacion}, tipo=${tipo}`);
      return true;
    } catch (e) {
      if (e instanceof APIMedialogError && (e.status === 401 || e.status === 403)) {
        throw e;
      }
      console.error("[PortalScrapper] Error creando relaci\xF3n:", e);
      return false;
    }
  }

  // src/api/auth.ts
  var STORAGE_KEY_TOKEN = "medialog_token";
  var STORAGE_KEY_USER = "medialog_usuario";
  var STORAGE_KEY_EXPIRES = "medialog_token_expires";
  async function login(username, password) {
    try {
      const data = await getToken(username, password);
      if (!data.access_token) {
        return { success: false, error: "Token no recibido" };
      }
      const expiresAt = Date.now() + 1e3 * 60 * 60 * 2;
      await chrome.storage.local.set({
        [STORAGE_KEY_TOKEN]: data.access_token,
        [STORAGE_KEY_USER]: data.usuario || username,
        [STORAGE_KEY_EXPIRES]: expiresAt
      });
      return { success: true, usuario: data.usuario || username };
    } catch (e) {
      return { success: false, error: e.message || "Error de autenticaci\xF3n" };
    }
  }
  async function logout() {
    await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER, STORAGE_KEY_EXPIRES]);
  }
  async function getCurrentUser() {
    const data = await chrome.storage.local.get([STORAGE_KEY_USER, STORAGE_KEY_TOKEN, STORAGE_KEY_EXPIRES]);
    if (!data[STORAGE_KEY_TOKEN] || !data[STORAGE_KEY_USER]) return null;
    const exp = data[STORAGE_KEY_EXPIRES] || 0;
    if (Date.now() > exp) return null;
    return { usuario: data[STORAGE_KEY_USER], token: data[STORAGE_KEY_TOKEN] };
  }

  // src/config/portalClassifications.ts
  var PORTAL_CLASSIFICATIONS = {
    // El País (portal 4014)
    4014: [25609],
    // Financial Times - PressReader (portal 10725)
    10725: [25872]
    // Ejemplos de otros portales (agrega los que necesites):
    // 1234: [1001, 1002],
    // 9999: [500],
    // 0: [], // sin clasificaciones automáticas
  };

  // src/sidepanel/sidepanel.ts
  (function initElasticSizing() {
    const initialWidth = Math.max(380, Math.round(window.screen.availWidth * 0.4));
    document.documentElement.style.minWidth = `${initialWidth}px`;
    document.body.style.minWidth = `${initialWidth}px`;
    setTimeout(() => {
      document.documentElement.style.minWidth = "320px";
      document.body.style.minWidth = "320px";
      console.log(`[PortalScrapper] Sidepanel set to elastic (min 320px), opened at ${initialWidth}px`);
    }, 600);
  })();
  var currentArticle = {};
  var currentUser = null;
  var currentToken = null;
  var editingDirty = false;
  var el = (id) => document.getElementById(id);
  var THEME_KEY = "portalescrapper_theme";
  var ZOOM_KEY = "portalescrapper_zoom";
  var currentZoom = 1;
  var isResolving = false;
  var lastResolvedDomain = "";
  var lastCheckedUrl = "";
  function toMexicoCityLocalISO2(input) {
    if (!input) {
      const now = /* @__PURE__ */ new Date();
      return now.toISOString().slice(0, 19);
    }
    try {
      const date = typeof input === "string" ? new Date(input) : input;
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const get = (type) => parts.find((p) => p.type === type)?.value || "";
      return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
    } catch {
      const now = /* @__PURE__ */ new Date();
      return now.toISOString().slice(0, 19);
    }
  }
  function normalizeTranscription2(text) {
    if (!text) return "";
    let t = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
    if (!t.includes("\n") && t.length > 200) {
      t = t.replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÑÜ"'])/g, "$1\n\n");
    }
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    return t;
  }
  window.addEventListener("error", (ev) => {
    console.error("[PortalScrapper] UNCAUGHT ERROR (panel frozen risk):", ev.error || ev.message);
    showToast("Error grave \u2013 recarga el panel (F5) o desactiva/activ a la extensi\xF3n");
  });
  window.addEventListener("unhandledrejection", (ev) => {
    console.error("[PortalScrapper] UNHANDLED PROMISE REJECTION (panel frozen risk):", ev.reason);
    showToast("Error as\xEDncrono grave \u2013 recarga el panel inmediatamente");
  });
  function withButtonLoading(buttonId, fn) {
    return async () => {
      const btn = el(buttonId);
      if (btn) btn.disabled = true;
      try {
        await fn();
      } catch (e) {
        console.error(`[PortalScrapper] Error en handler de ${buttonId}:`, e);
        showToast("Error \u2013 recarga el panel si no responde");
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }
  async function ensureValidSession() {
    const sess = await getCurrentUser();
    if (!sess) {
      console.warn("[PortalScrapper] Session invalid or expired \u2013 forcing login screen");
      showToast("Sesi\xF3n expirada o inv\xE1lida. Inicia sesi\xF3n de nuevo.");
      showScreen("login");
      currentToken = null;
      currentUser = null;
      return false;
    }
    currentToken = sess.token;
    currentUser = sess.usuario;
    return true;
  }
  function isAuthError(err) {
    if (!err) return false;
    if (err.status === 401 || err.status === 403) return true;
    const msg = (err.message || err.toString()).toLowerCase();
    return msg.includes("401") || msg.includes("403") || msg.includes("token") || msg.includes("expir");
  }
  async function checkAndHandleAuthError(err) {
    if (isAuthError(err)) {
      console.warn("[PortalScrapper] Auth error detected \u2013 logging out", err);
      showToast("Sesi\xF3n expirada o inv\xE1lida. Inicia sesi\xF3n de nuevo.");
      await handleLogout();
      return true;
    }
    return false;
  }
  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    const btn = el("theme-toggle");
    if (btn) btn.textContent = theme === "light" ? "\u2600\uFE0F" : "\u{1F319}";
  }
  async function initTheme() {
    const res = await chrome.storage.local.get(THEME_KEY);
    const saved = res[THEME_KEY];
    const theme = saved || "dark";
    applyTheme(theme);
    const btn = el("theme-toggle");
    if (btn) {
      btn.onclick = async () => {
        const current = document.body.classList.contains("light") ? "light" : "dark";
        const next = current === "light" ? "dark" : "light";
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
  function getBaseDomain(hostname) {
    let domain = hostname.replace(/^www\./, "");
    const parts = domain.split(".");
    if (parts.length <= 2) {
      return domain;
    }
    const secondLevelTlds = ["com", "org", "net", "edu", "gob", "mil", "co", "ac", "info"];
    const secondToLast = parts[parts.length - 2];
    if (secondLevelTlds.includes(secondToLast)) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  }
  function updatePortalHeader() {
    const header = el("portal-header");
    const nameEl = el("portal-name");
    const countryEl = el("portal-country");
    if (!header || !nameEl) return;
    if (currentArticle.nombre_portal) {
      nameEl.textContent = currentArticle.nombre_portal;
      if (countryEl) countryEl.textContent = currentArticle.pais ? `(${currentArticle.pais})` : "";
      header.style.display = "block";
    } else {
      header.style.display = "none";
    }
  }
  async function initZoom() {
    const res = await chrome.storage.local.get(ZOOM_KEY);
    currentZoom = res[ZOOM_KEY] || 1;
    applyZoom();
    document.addEventListener("keydown", async (e) => {
      if (!e.ctrlKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        currentZoom = Math.min(currentZoom + 0.1, 2);
        applyZoom();
        await saveZoom();
      } else if (e.key === "-") {
        e.preventDefault();
        currentZoom = Math.max(currentZoom - 0.1, 0.6);
        applyZoom();
        await saveZoom();
      } else if (e.key === "0") {
        e.preventDefault();
        currentZoom = 1;
        applyZoom();
        await saveZoom();
      }
    });
    document.addEventListener("wheel", async (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) {
        currentZoom = Math.min(currentZoom + 0.05, 2);
      } else {
        currentZoom = Math.max(currentZoom - 0.05, 0.6);
      }
      applyZoom();
      await saveZoom();
    }, { passive: false });
  }
  function showScreen(screen) {
    const login2 = el("login-screen");
    const main = el("main-screen");
    if (login2) login2.classList.remove("active");
    if (main) main.classList.remove("active");
    if (screen === "login") {
      if (login2) login2.classList.add("active");
    } else {
      if (main) main.classList.add("active");
    }
  }
  function setVersion() {
    const ver = el("version");
    if (ver) ver.textContent = "v" + chrome.runtime.getManifest().version;
    const loginVer = el("login-version");
    if (loginVer) loginVer.textContent = "v" + chrome.runtime.getManifest().version;
  }
  function showToast(msg, timeout = 2400, extraClass = "") {
    const t = el("toast");
    t.textContent = msg;
    if (extraClass) t.classList.add(...extraClass.split(" "));
    t.classList.add("show");
    setTimeout(() => {
      t.classList.remove("show");
      if (extraClass) t.classList.remove(...extraClass.split(" "));
    }, timeout);
  }
  async function renderHistory() {
    const container = el("history-list");
    if (!container) return;
    container.innerHTML = "";
    const list = await getAllArticles();
    list.slice(0, 18).forEach((article) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
      <div style="flex:1; min-width:0;">
        <span style="font-size:12px;">${article.superabstract?.slice(0, 38) || article.url}</span><br>
        <span style="font-size:10px;color:#777;">${article.medio || ""} \u2022 ${article.status}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
        <span class="badge">${article.dbRecordId ? "#" + article.dbRecordId : article.status}</span>
        <button data-del="${article.id}" style="background:#3b0b0b; color:white; font-size:10px; padding:1px 4px;">\u{1F5D1}</button>
      </div>
    `;
      div.onclick = (ev) => {
        if (ev.target.hasAttribute("data-del")) return;
        loadArticleIntoUI(article);
      };
      const delBtn = div.querySelector("[data-del]");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteArticle(article.id).then(() => {
            renderHistory();
            updateBadge();
          });
        });
      }
      container.appendChild(div);
    });
  }
  function populateUI(article) {
    const setVal = (id, val) => {
      const input = el(id);
      if (input) input.value = val;
    };
    setVal("superabstract", article.superabstract || "");
    setVal("url", article.url || "");
    setVal("emisora", String(article.emisora || ""));
    setVal("portal", String(article.portal ?? article.pendiente ?? ""));
    setVal("emision", String(article.emision || 4659889));
    setVal("fecha", article.fecha || "");
    setVal("fecha_transcripcion", article.fecha_transcripcion || "");
    setVal("dbRecordId", String(article.dbRecordId || ""));
    setVal("medio", article.medio || "");
    setVal("autor", article.autor || "");
    setVal("texto", article.texto || "");
    renderClasificaciones(article.clasificaciones || []);
    updatePortalHeader();
  }
  function readFormIntoArticle() {
    const id = currentArticle.id || crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const getVal = (id2) => el(id2)?.value?.trim() || "";
    return {
      id,
      source: currentArticle.source || "",
      url: getVal("url"),
      urlWithParams: getVal("url"),
      emisora: parseInt(getVal("emisora"), 10) || 0,
      emision: parseInt(getVal("emision"), 10) || 4659889,
      fecha: currentArticle.fecha || toMexicoCityLocalISO2(now),
      fecha_transcripcion: toMexicoCityLocalISO2(getVal("fecha_transcripcion") || getVal("fecha") || now),
      usuario: currentUser || "anon",
      evento: 1,
      superabstract: getVal("superabstract"),
      pendiente: parseInt(getVal("portal"), 10) || parseInt(getVal("pendiente"), 10) || 0,
      portal: parseInt(getVal("portal"), 10) || void 0,
      abstract: getVal("url"),
      texto: normalizeTranscription2(getVal("texto")),
      autor: getVal("autor"),
      medio: getVal("medio"),
      clasificaciones: currentArticle.clasificaciones || [],
      notas: currentArticle.notas || "",
      nombre_portal: currentArticle.nombre_portal,
      pais: currentArticle.pais,
      capturedAt: currentArticle.capturedAt || now,
      lastModified: now,
      extractionMethod: currentArticle.extractionMethod || "manual",
      confidence: currentArticle.confidence || 0.5,
      isFullContent: currentArticle.isFullContent ?? (currentArticle.texto || "").length > 180,
      paywallDetected: !!currentArticle.paywallDetected,
      status: currentArticle.status || "draft",
      dbRecordId: parseInt(getVal("dbRecordId"), 10) || currentArticle.dbRecordId
    };
  }
  function collectClipboardTargets() {
    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async (ev) => {
        const target = ev.currentTarget.getAttribute("data-target");
        let val = "";
        const getVal = (id) => el(id)?.value || "";
        if (target === "superabstract") val = getVal("superabstract");
        else if (target === "url") val = getVal("url");
        else if (target === "texto") val = getVal("texto");
        const ok = await copyToClipboard(val);
        if (ok) showToast("Copiado");
      });
    });
  }
  var clasificaciones = [];
  function renderClasificaciones(list) {
    clasificaciones = [...list];
    const cont = el("clasificaciones");
    if (!cont) return;
    cont.innerHTML = "";
    clasificaciones.forEach((n, idx) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = String(n);
      chip.onclick = () => {
        clasificaciones.splice(idx, 1);
        renderClasificaciones(clasificaciones);
      };
      cont.appendChild(chip);
    });
  }
  function attachClasificacionHandlers() {
    const input = el("add-clasificacion");
    const btn = el("btn-add-clas");
    if (!btn || !input) return;
    btn.onclick = () => {
      const v = parseInt(input.value, 10);
      if (!isNaN(v) && !clasificaciones.includes(v)) {
        clasificaciones.push(v);
        renderClasificaciones(clasificaciones);
      }
      input.value = "";
    };
  }
  function markDirty() {
    editingDirty = true;
  }
  function attachFormDirtyWatchers() {
    ["input", "change"].forEach((ev) => {
      document.querySelectorAll("input, textarea").forEach((f) => {
        f.addEventListener(ev, markDirty);
      });
    });
  }
  async function autoResolveEmisora(url, force = false) {
    if (isResolving) {
      console.log("[PortalScrapper] autoResolveEmisora skipped (already running)");
      return;
    }
    let baseDomain = "";
    let fullHost = "";
    try {
      fullHost = new URL(url).hostname;
      baseDomain = getBaseDomain(fullHost);
    } catch (e) {
      return;
    }
    if (!force && lastResolvedDomain === baseDomain) {
      console.log(`[PortalScrapper] autoResolveEmisora skipped (domain ${baseDomain} already resolved)`);
      return;
    }
    isResolving = true;
    lastResolvedDomain = baseDomain;
    try {
      if (!await ensureValidSession()) {
        isResolving = false;
        return;
      }
      if (!currentToken) {
        isResolving = false;
        return;
      }
      console.log(`[PortalScrapper] Resolviendo portal \u2192 baseDomain: ${baseDomain} (hostname original: ${fullHost})`);
      const result = await resolvePortalByDomain(currentToken, baseDomain, fullHost);
      if (result) {
        const emisoraInput = el("emisora");
        const portalInput = el("portal");
        if (emisoraInput) {
          emisoraInput.value = String(result.emisora);
        }
        if (portalInput) {
          portalInput.value = String(result.portal);
          showToast(`Portal auto-resuelto: ${result.portal} (Emisora: ${result.emisora})`);
        }
        currentArticle.emisora = result.emisora;
        currentArticle.portal = result.portal;
        currentArticle.pendiente = result.portal;
        if (result.nombre_portal) {
          currentArticle.nombre_portal = result.nombre_portal;
        }
        if (result.pais) {
          currentArticle.pais = result.pais;
        }
        updatePortalHeader();
        if (result.emisora && currentArticle.fecha_transcripcion) {
          const emisionInput = el("emision");
          const emision = await resolveEmisionPorEmisoraYFecha(
            currentToken,
            result.emisora,
            currentArticle.fecha_transcripcion
          );
          if (emision && emisionInput) {
            emisionInput.value = String(emision);
            currentArticle.emision = emision;
            console.log(`[PortalScrapper] Emisi\xF3n autocompletada: ${emision}`);
          }
        }
      }
    } catch (e) {
      console.error("[PortalScrapper] autoResolveEmisora error:", e);
      await checkAndHandleAuthError(e);
    } finally {
      isResolving = false;
    }
  }
  async function checkDuplicateNow(force = false) {
    if (!await ensureValidSession()) return;
    const article = readFormIntoArticle();
    const currentUrl = article.url || article.urlWithParams || "";
    const normalizedUrl = currentUrl.split("#")[0].split("?")[0];
    if (!force && lastCheckedUrl === normalizedUrl) {
      return;
    }
    lastCheckedUrl = normalizedUrl;
    const existingDbId = parseInt(el("dbRecordId")?.value || "0", 10);
    if (existingDbId > 0) {
      try {
        await navigator.clipboard.writeText(String(existingDbId));
        showToast(`\u26A0\uFE0F Nota REPETIDA (ya en Medialog #${existingDbId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota REPETIDA (ya en Medialog #${existingDbId}).`, 3e3, "large green");
      }
      return;
    }
    let localDuplicateId = 0;
    if (normalizedUrl && !window.FORCE_API) {
      const all = await getAllArticles();
      const yaGuardadoLocal = all.find((a) => {
        const au = (a.url || a.urlWithParams || "").trim();
        const an = au.split("#")[0].split("?")[0];
        return an === normalizedUrl && (a.dbRecordId || 0) > 0;
      });
      if (yaGuardadoLocal) {
        localDuplicateId = yaGuardadoLocal.dbRecordId || 0;
      }
    }
    const duplicadoId = await buscarMedialogDuplicado(
      currentToken,
      article.emisora || 0,
      article.fecha_transcripcion || "",
      article.superabstract || "",
      currentUrl
    );
    if (duplicadoId && duplicadoId > 0) {
      article.dbRecordId = duplicadoId;
      article.status = "synced";
      await saveArticle(article);
      try {
        await navigator.clipboard.writeText(String(duplicadoId));
        showToast(`\u26A0\uFE0F Nota REPETIDA en Medialog (#${duplicadoId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota REPETIDA en Medialog (#${duplicadoId}).`, 3e3, "large green");
      }
      populateUI(article);
      renderHistory();
      updateBadge();
      return;
    }
    if (localDuplicateId > 0) {
      try {
        await navigator.clipboard.writeText(String(localDuplicateId));
        showToast(`\u26A0\uFE0F Nota REPETIDA local (#${localDuplicateId})`, 2400);
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota REPETIDA local (#${localDuplicateId})`, 2400);
      }
    } else {
      showToast("Nota NO encontrada en Medialog", 3e3, "large");
    }
  }
  async function performAutoChecks(url, force = false) {
    if (!url) return;
    await autoResolveEmisora(url, force);
    await checkDuplicateNow(force);
  }
  async function requestExtractionWithRetries(attempts = 4) {
    for (let i = 0; i < attempts; i++) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const sendP = chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_ARTICLE" });
          const timeoutP = new Promise(
            (_, rej) => setTimeout(() => rej(new Error("content-script timeout")), 7e3)
          );
          await Promise.race([sendP, timeoutP]);
          return;
        }
      } catch (e) {
        console.warn(`[PortalScrapper] Content-script reachability problem (attempt ${i + 1}):`, e);
      }
      await new Promise((res) => setTimeout(res, 400 + i * 700));
    }
  }
  async function handleGrabarAPI() {
    if (!await ensureValidSession()) {
      return;
    }
    const article = readFormIntoArticle();
    const existingDbId = parseInt(el("dbRecordId")?.value || "0", 10);
    if (existingDbId > 0) {
      try {
        await navigator.clipboard.writeText(String(existingDbId));
        showToast(`\u26A0\uFE0F Nota REPETIDA (ya en Medialog #${existingDbId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota REPETIDA (ya en Medialog #${existingDbId}).`, 3e3, "large green");
      }
      return;
    }
    const currentUrl = el("url")?.value?.trim() || "";
    const normalizedUrl = currentUrl.split("#")[0].split("?")[0];
    const currentFormDbId = parseInt(el("dbRecordId")?.value || "0", 10);
    let localDuplicateId = 0;
    if (normalizedUrl && currentFormDbId === 0 && !window.FORCE_API) {
      const all = await getAllArticles();
      const yaGuardadoLocal = all.find((a) => {
        const au = (a.url || a.urlWithParams || "").trim();
        const an = au.split("#")[0].split("?")[0];
        return an === normalizedUrl && (a.dbRecordId || 0) > 0;
      });
      if (yaGuardadoLocal) {
        localDuplicateId = yaGuardadoLocal.dbRecordId || 0;
      }
    }
    const duplicadoId = await buscarMedialogDuplicado(
      currentToken,
      article.emisora || 0,
      article.fecha_transcripcion || "",
      article.superabstract || "",
      article.url || article.urlWithParams || ""
    );
    if (duplicadoId && duplicadoId > 0) {
      article.dbRecordId = duplicadoId;
      article.status = "synced";
      await saveArticle(article);
      try {
        await navigator.clipboard.writeText(String(duplicadoId));
        showToast(`\u26A0\uFE0F Nota REPETIDA en Medialog (#${duplicadoId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota REPETIDA en Medialog (#${duplicadoId}).`, 3e3, "large green");
      }
      populateUI(article);
      renderHistory();
      updateBadge();
      return;
    }
    if (localDuplicateId > 0) {
      console.log(`[PortalScrapper] Nota repetida localmente (#${localDuplicateId}), pero no en BDD. Procediendo a grabar en API...`);
    }
    article.fecha = toMexicoCityLocalISO2(/* @__PURE__ */ new Date());
    article.status = "draft";
    article.usuario = currentUser;
    await saveArticle(article);
    renderHistory();
    const urlParaAbstract = el("url")?.value?.trim() || (article.url || article.urlWithParams || "").trim();
    if (!urlParaAbstract) {
      console.error("[PortalScrapper][FATAL] La URL del art\xEDculo est\xE1 vac\xEDa \u2013 no se puede poner en abstract");
    }
    article.abstract = urlParaAbstract;
    const payload = {
      emisora: article.emisora,
      emision: article.emision,
      fecha: article.fecha,
      fecha_transcripcion: article.fecha_transcripcion,
      usuario: article.usuario,
      evento: article.evento,
      superabstract: article.superabstract.slice(0, 200),
      pendiente: article.portal ?? article.pendiente,
      abstract: urlParaAbstract,
      // ← URL REAL, nunca vacío
      transcripcion: article.texto || "",
      analisis: article.notas || void 0
    };
    console.log("[PortalScrapper][DEBUG] Payload para POST /v1/medialogs/", {
      abstract: payload.abstract,
      superabstract: payload.superabstract.substring(0, 60) + "...",
      emisora: payload.emisora,
      fecha: payload.fecha
    });
    try {
      const dbId = await grabarMedialog(currentToken, payload);
      if (dbId > 0) {
        article.dbRecordId = dbId;
        article.status = "synced";
        await saveArticle(article);
        try {
          await navigator.clipboard.writeText(String(dbId));
          showToast(`\u2705 Grabado OK correctamente registro en la BDD y copiado al Clipboard (ID #${dbId})`, 3e3, "large");
        } catch (e) {
          showToast(`\u2705 Grabado OK correctamente registro en la BDD (ID #${dbId}), pero no se pudo copiar al Clipboard`, 3e3, "large");
        }
        currentArticle = article;
        populateUI(article);
        renderHistory();
        updateBadge();
        const portalId = article.portal ?? article.pendiente ?? 0;
        const clasificaciones2 = PORTAL_CLASSIFICATIONS[portalId] || [];
        if (clasificaciones2.length > 0) {
          console.log(`[PortalScrapper] Creando ${clasificaciones2.length} relaci\xF3n(es) para portal ${portalId}...`);
          for (const clasificacion of clasificaciones2) {
            await crearRelacionMedialog(
              currentToken,
              dbId,
              clasificacion,
              article.fecha || payload.fecha || "",
              "R"
            );
          }
        }
      }
    } catch (err) {
      const handled = await checkAndHandleAuthError(err);
      if (!handled) {
        showToast("Error API: " + (err.message || err));
      }
    }
  }
  async function handleReExtract() {
    if (!await ensureValidSession()) return;
    if (editingDirty) {
      if (!confirm("Tienes cambios sin guardar. \xBFRe-extraer y sobrescribir?")) return;
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const sendP = chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_NOW" });
        const tmo = new Promise((_, rj) => setTimeout(() => rj(new Error("timeout")), 6e3));
        await Promise.race([sendP, tmo]);
      }
    } catch (e) {
      console.warn("[PortalScrapper] Re-extract content-script call failed:", e);
    }
    editingDirty = false;
    setTimeout(() => requestExtractionWithRetries(1), 800);
  }
  function loadArticleIntoUI(article) {
    currentArticle = { ...article };
    if (currentArticle.fecha_transcripcion) {
      currentArticle.fecha_transcripcion = toMexicoCityLocalISO2(currentArticle.fecha_transcripcion);
    }
    if (currentArticle.texto) {
      currentArticle.texto = normalizeTranscription2(currentArticle.texto);
    }
    editingDirty = false;
    populateUI(currentArticle);
    clasificaciones = article.clasificaciones || [];
    renderClasificaciones(clasificaciones);
  }
  function setupSidePanelMessageListener() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "ARTICLE_EXTRACTED" && msg.payload) {
        const previousUrl = currentArticle.url || "";
        currentArticle = { ...currentArticle, ...msg.payload };
        if (!currentArticle.id) currentArticle.id = crypto.randomUUID();
        if (msg.payload.fecha) {
          currentArticle.fecha_transcripcion = msg.payload.fecha;
          delete currentArticle.fecha;
        }
        if (currentArticle.fecha_transcripcion) {
          currentArticle.fecha_transcripcion = toMexicoCityLocalISO2(
            currentArticle.fecha_transcripcion.replace(/\|.*/g, "").trim()
          );
        }
        if (currentArticle.texto) {
          currentArticle.texto = normalizeTranscription2(currentArticle.texto);
        }
        const newUrl = currentArticle.url || "";
        const normalizedNew = newUrl.split("#")[0].split("?")[0];
        const normalizedPrev = previousUrl.split("#")[0].split("?")[0];
        if (normalizedNew && normalizedNew !== normalizedPrev) {
          currentArticle.dbRecordId = void 0;
          const dbIdInput = el("dbRecordId");
          if (dbIdInput) dbIdInput.value = "";
        }
        populateUI(currentArticle);
        editingDirty = false;
        const url = el("url").value;
        if (url) performAutoChecks(url).catch(console.error);
        showToast("Art\xEDculo extra\xEDdo");
      }
      if (msg.type === "SITE_DETECTED") {
        const info = el("detected-site");
        if (info) info.textContent = msg.payload.name + " (" + msg.payload.site + ")";
        const meta = el("detected-meta");
        if (meta) meta.textContent = "Listo para extraer. Presiona Grabar o Re-extraer.";
        requestExtractionWithRetries(4);
      }
    });
  }
  async function loadRememberedCredentials() {
    const creds = await chrome.storage.local.get(["remembered_user", "remembered_pass", "remembered_enabled"]);
    const userEl = el("login-user");
    const passEl = el("login-pass");
    const rememberEl = el("login-remember");
    if (creds.remembered_enabled) {
      if (userEl && creds.remembered_user) userEl.value = creds.remembered_user;
      if (passEl && creds.remembered_pass) passEl.value = creds.remembered_pass;
      if (rememberEl) rememberEl.checked = true;
    } else {
      if (rememberEl) rememberEl.checked = false;
      if (userEl && creds.remembered_user) userEl.value = creds.remembered_user;
      if (passEl) passEl.value = "";
    }
  }
  async function handleLogin() {
    const user = el("login-user").value.trim();
    const pass = el("login-pass").value;
    const errorBox = el("login-error");
    if (errorBox) errorBox.textContent = "";
    if (!user || !pass) {
      if (errorBox) errorBox.textContent = "Ingresa usuario y contrase\xF1a";
      return;
    }
    const result = await login(user, pass);
    if (result.success && result.usuario) {
      currentUser = result.usuario;
      const sess = await getCurrentUser();
      currentToken = sess?.token || null;
      el("logged-user").textContent = currentUser;
      const rememberChk = el("login-remember");
      if (rememberChk && rememberChk.checked) {
        await chrome.storage.local.set({
          remembered_user: user,
          remembered_pass: pass,
          remembered_enabled: true
        });
      } else {
        await chrome.storage.local.set({
          remembered_enabled: false
        });
        await chrome.storage.local.remove(["remembered_pass"]);
      }
      showScreen("main");
      await renderHistory();
    } else {
      if (errorBox) errorBox.textContent = result.error || "Credenciales inv\xE1lidas";
    }
  }
  async function handleLogout() {
    await logout();
    currentUser = null;
    currentToken = null;
    showScreen("login");
    await loadRememberedCredentials();
  }
  async function initMainUI() {
    const sess = await getCurrentUser();
    if (!sess) {
      showScreen("login");
      return;
    }
    currentUser = sess.usuario;
    currentToken = sess.token;
    const userLine = el("logged-user");
    if (userLine) userLine.textContent = currentUser;
    showScreen("main");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try {
        const host = new URL(tab.url).hostname;
        const siteEl = el("detected-site");
        if (siteEl) siteEl.textContent = host;
      } catch {
      }
    }
    collectClipboardTargets();
    attachClasificacionHandlers();
    attachFormDirtyWatchers();
    const emisoraInputForListener = el("emisora");
    if (emisoraInputForListener) {
      emisoraInputForListener.addEventListener("change", async () => {
        try {
          if (!await ensureValidSession()) return;
          if (!currentToken) return;
          const fecha = el("fecha_transcripcion")?.value;
          const newEmisora = parseInt(emisoraInputForListener.value, 10);
          const emisionInput = el("emision");
          if (newEmisora > 0 && fecha && emisionInput) {
            const emision = await resolveEmisionPorEmisoraYFecha(currentToken, newEmisora, fecha);
            if (emision) {
              emisionInput.value = String(emision);
              currentArticle.emision = emision;
              currentArticle.emisora = newEmisora;
              console.log(`[PortalScrapper] Emisi\xF3n re-resuelta por cambio manual de Emisora \u2192 ${emision}`);
            }
          }
        } catch (err) {
          console.error("[PortalScrapper] Error al cambiar emisora manualmente:", err);
          await checkAndHandleAuthError(err);
        }
      });
    }
    const fechaInput = el("fecha_transcripcion");
    if (fechaInput) {
      fechaInput.addEventListener("blur", () => {
        if (fechaInput.value) {
          const normalized = toMexicoCityLocalISO2(fechaInput.value);
          if (normalized !== fechaInput.value) {
            fechaInput.value = normalized;
          }
          currentArticle.fecha_transcripcion = normalized;
        }
      });
    }
    const wire = (id, handler) => {
      const btn = el(id);
      if (btn) btn.onclick = handler;
    };
    wire("btn-grabar", withButtonLoading("btn-grabar", handleGrabarAPI));
    wire("btn-checar", withButtonLoading("btn-checar", async () => {
      const url = el("url")?.value;
      if (url) {
        await performAutoChecks(url, true);
      } else {
        showToast("No hay URL para checar");
      }
    }));
    wire("btn-reextract", withButtonLoading("btn-reextract", handleReExtract));
    wire("btn-export-json", withButtonLoading("btn-export-json", async () => {
      const arts = await getAllArticles();
      exportToJSON(arts);
    }));
    wire("btn-export-csv", withButtonLoading("btn-export-csv", async () => {
      const arts = await getAllArticles();
      exportToCSV(arts);
    }));
    wire("btn-clear-all", withButtonLoading("btn-clear-all", async () => {
      if (confirm("\xBFBorrar TODO el historial local?")) {
        await clearAll();
        await renderHistory();
        updateBadge();
      }
    }));
    wire("btn-clear-storage", withButtonLoading("btn-clear-storage", async () => {
      if (confirm("\u26A0\uFE0F Esto borrar\xE1 TODO (token, historial, tema, zoom, etc.). \xBFQuieres continuar?")) {
        await clearStorageCompletely();
        await renderHistory();
        updateBadge();
        showToast("Storage borrado. Recarga el panel.");
        location.reload();
      }
    }));
    wire("btn-logout", handleLogout);
    wire("btn-generate-link", () => {
      const id = currentArticle.dbRecordId || 0;
      if (id > 0) {
        const lnk = `https://api.medialog.com.mx/v1/medialogs/hash/${id}`;
        navigator.clipboard.writeText(lnk).then(() => showToast("Liga copiada"));
      } else {
        showToast("A\xFAn no sincronizado con API");
      }
    });
    wire("btn-open-url", () => {
      const url = el("url")?.value.trim();
      if (url) window.open(url, "_blank");
    });
    setTimeout(() => {
      requestExtractionWithRetries(2);
    }, 2500);
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
      showScreen("login");
      await loadRememberedCredentials();
      const loginBtn = el("btn-login");
      if (loginBtn) {
        loginBtn.onclick = async () => {
          loginBtn.disabled = true;
          try {
            await handleLogin();
          } finally {
            loginBtn.disabled = false;
          }
        };
      }
      const loginPass = el("login-pass");
      if (loginPass) {
        loginPass.addEventListener("keydown", async (ev) => {
          if (ev.key === "Enter") {
            if (loginBtn) loginBtn.disabled = true;
            try {
              await handleLogin();
            } finally {
              if (loginBtn) loginBtn.disabled = false;
            }
          }
        });
      }
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
//# sourceMappingURL=sidepanel.js.map
