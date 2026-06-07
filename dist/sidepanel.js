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
    await chrome.action.setBadgeText({ text: "" });
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
  async function patchMedialog(token, medialogId, payload) {
    const res = await fetchWithTimeout(`${BASE_URL}/medialogs/${medialogId}`, {
      method: "PATCH",
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
    return true;
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
  async function getMedialogHash(token, medialogId) {
    const url = `${BASE_URL}/medialogs/hash/${medialogId}`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new APIMedialogError(res.status, "Token expirado o inv\xE1lido");
      }
      throw new APIMedialogError(res.status, "Error fetching medialog hash");
    }
    const json = await res.json();
    return json?.data?.[0]?.hash || json?.hash || null;
  }
  async function cargarPDF(medialogId, pdfBlob) {
    const formData = new FormData();
    formData.append("archivo", pdfBlob, `${medialogId}.pdf`);
    formData.append("medialog", String(medialogId));
    const url = `${BASE_URL}/mediarchivos/cargapdf`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "X-API-Key": "ak_live_accesoapi_h3CvobFBGaJfVgKh1uJxSqtGz8H3u2r5Sk3KPRcayek"
      },
      body: formData
    }, 45e3);
    if (!res.ok) {
      const body = await res.text();
      throw new APIMedialogError(res.status, body || "Error al subir el archivo PDF");
    }
    return true;
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
  var lastSavedFormState = {};
  var hasRegisteredTabListeners = false;
  function setupTabChangeListeners() {
    if (hasRegisteredTabListeners) return;
    hasRegisteredTabListeners = true;
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab && tab.url) {
          handleTabChanged(tab);
        }
      } catch (e) {
        console.warn("[PortalScrapper] Error onActivated:", e);
      }
    });
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.active) {
        handleTabChanged(tab);
      }
    });
  }
  async function handleTabChanged(tab) {
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) return;
    try {
      const host = new URL(tab.url).hostname;
      const siteEl = el("detected-site");
      if (siteEl) siteEl.textContent = host;
      lastResolvedDomain = "";
      lastCheckedUrl = "";
      console.log(`[PortalScrapper] Tab changed/reloaded to: ${host}. Waiting for explicit extraction click.`);
    } catch (e) {
      console.warn("[PortalScrapper] handleTabChanged error:", e);
    }
  }
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
  function updateEditarButtonState() {
    const dbIdInput = el("dbRecordId");
    const dbIdVal = dbIdInput?.value || "";
    const btnEditar = el("btn-editar");
    if (btnEditar) {
      const numericId = parseInt(dbIdVal, 10);
      btnEditar.disabled = !dbIdVal || isNaN(numericId) || numericId <= 0;
    }
  }
  function updateGrabarButtonState() {
    const dbIdInput = el("dbRecordId");
    const dbIdVal = dbIdInput?.value || "";
    const numericId = parseInt(dbIdVal, 10);
    const btnGrabar = el("btn-grabar");
    if (btnGrabar) {
      if (dbIdVal && !isNaN(numericId) && numericId > 0) {
        btnGrabar.textContent = "\u{1F4BE} Actualizar";
      } else {
        btnGrabar.textContent = "\u{1F4BE} Grabar";
      }
    }
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
    setVal("fecha_transcripcion", article.fecha_transcripcion || "");
    setVal("dbRecordId", String(article.dbRecordId || ""));
    setVal("medio", article.medio || "");
    setVal("autor", article.autor || "");
    setVal("texto", article.texto || "");
    renderClasificaciones(article.clasificaciones || []);
    updatePortalHeader();
    updateEditarButtonState();
    updateGrabarButtonState();
    if (article.dbRecordId && article.dbRecordId > 0) {
      lastSavedFormState = readFormIntoArticle();
    } else {
      lastSavedFormState = {};
    }
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
      fecha_transcripcion: toMexicoCityLocalISO2(getVal("fecha_transcripcion") || now),
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
        showToast(`\u26A0\uFE0F Nota EXISTENTE (ya en Medialog #${existingDbId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota EXISTENTE (ya en Medialog #${existingDbId}).`, 3e3, "large green");
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
      currentArticle.dbRecordId = duplicadoId;
      currentArticle.status = "synced";
      const articleToSave = readFormIntoArticle();
      articleToSave.dbRecordId = duplicadoId;
      articleToSave.status = "synced";
      await saveArticle(articleToSave);
      try {
        await navigator.clipboard.writeText(String(duplicadoId));
        showToast(`\u26A0\uFE0F Nota EXISTENTE en Medialog (#${duplicadoId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota EXISTENTE en Medialog (#${duplicadoId}).`, 3e3, "large green");
      }
      const dbIdInput = el("dbRecordId");
      if (dbIdInput) {
        dbIdInput.value = String(duplicadoId);
        updateEditarButtonState();
        updateGrabarButtonState();
      }
      lastSavedFormState = readFormIntoArticle();
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
  async function handleActualizarAPI(dbRecordId) {
    if (!await ensureValidSession()) {
      return;
    }
    const current = readFormIntoArticle();
    if (!lastSavedFormState || lastSavedFormState.dbRecordId !== dbRecordId) {
      lastSavedFormState = {};
    }
    const patchPayload = {};
    if (current.superabstract !== lastSavedFormState.superabstract) {
      patchPayload.superabstract = current.superabstract.slice(0, 200);
    }
    if (current.url !== lastSavedFormState.url) {
      patchPayload.abstract = current.url;
    }
    if (current.emisora !== lastSavedFormState.emisora) {
      patchPayload.emisora = current.emisora;
    }
    if (current.portal !== lastSavedFormState.portal) {
      patchPayload.pendiente = current.portal ?? current.pendiente;
    }
    if (current.emision !== lastSavedFormState.emision) {
      patchPayload.emision = current.emision;
    }
    if (current.fecha_transcripcion !== lastSavedFormState.fecha_transcripcion) {
      patchPayload.fecha_transcripcion = current.fecha_transcripcion;
    }
    if (current.texto !== lastSavedFormState.texto) {
      patchPayload.transcripcion = current.texto;
    }
    const changedKeys = Object.keys(patchPayload);
    if (changedKeys.length === 0) {
      try {
        await navigator.clipboard.writeText(String(dbRecordId));
        showToast(`Medialog #${dbRecordId} sin cambios detectados. ID copiado al Clipboard.`, 3e3);
      } catch (e) {
        showToast(`Medialog #${dbRecordId} sin cambios detectados.`, 3e3);
      }
      return;
    }
    console.log(`[PortalScrapper][DEBUG] Payload para PATCH /v1/medialogs/${dbRecordId}`, patchPayload);
    try {
      const success = await patchMedialog(currentToken, dbRecordId, patchPayload);
      if (success) {
        current.dbRecordId = dbRecordId;
        current.status = "synced";
        await saveArticle(current);
        try {
          await navigator.clipboard.writeText(String(dbRecordId));
          showToast(`Medialog #${dbRecordId} Actualizado`, 3e3, "large green");
        } catch (e) {
          showToast(`Medialog #${dbRecordId} Actualizado (no se pudo copiar al Clipboard)`, 3e3, "large green");
        }
        currentArticle = current;
        populateUI(current);
        renderHistory();
        updateBadge();
      }
    } catch (err) {
      const handled = await checkAndHandleAuthError(err);
      if (!handled) {
        showToast("Error al actualizar: " + (err.message || err));
      }
    }
  }
  async function handleGrabarAPI() {
    if (!await ensureValidSession()) {
      return;
    }
    const existingDbId = parseInt(el("dbRecordId")?.value || "0", 10);
    if (existingDbId > 0) {
      await handleActualizarAPI(existingDbId);
      return;
    }
    const article = readFormIntoArticle();
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
        showToast(`\u26A0\uFE0F Nota EXISTENTE en Medialog (#${duplicadoId}). ID copiado al Clipboard.`, 3e3, "large green");
      } catch (e) {
        showToast(`\u26A0\uFE0F Nota EXISTENTE en Medialog (#${duplicadoId}).`, 3e3, "large green");
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
  async function handleGeneratePDF() {
    if (!await ensureValidSession()) return;
    const btn = el("btn-pdf");
    const originalText = btn ? btn.textContent : "\u{1F4C4} PDF";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Generando PDF...";
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("chrome-extension://")) {
        showToast("\u26A0\uFE0F Navega a un portal de noticias v\xE1lido antes de generar el PDF", 4e3);
        return;
      }
      const editedFields = {
        superabstract: el("superabstract")?.value || "",
        texto: el("texto")?.value || "",
        autor: el("autor")?.value || "",
        fecha: el("fecha_transcripcion")?.value || "",
        medio: el("medio")?.value || "",
        medialogId: el("dbRecordId")?.value || ""
      };
      const response = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Timeout esperando respuesta del content script (7 segundos)"));
        }, 7e3);
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "GET_CLEAN_SNAPSHOT",
            payload: editedFields
          },
          (res) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!res) {
              reject(new Error("No se recibi\xF3 respuesta del content script. \xBFEst\xE1 inyectado en la p\xE1gina actual?"));
            } else if (!res.ok) {
              reject(new Error(res.error || "Error al obtener snapshot"));
            } else if (!res.payload) {
              reject(new Error("La respuesta no contiene el payload del snapshot"));
            } else {
              resolve(res);
            }
          }
        );
      });
      if (!response || !response.payload) {
        throw new Error("No se recibi\xF3 el contenido del snapshot");
      }
      const { html } = response.payload;
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showToast("Error: Ventana emergente bloqueada por el navegador");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      const setupListeners = () => {
        const closeBtn = printWindow.document.getElementById("btn-snapshot-close");
        const printBtn = printWindow.document.getElementById("btn-snapshot-print");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            printWindow.close();
          });
        }
        if (printBtn) {
          printBtn.addEventListener("click", async () => {
            try {
              const dbIdInput = el("dbRecordId");
              const dbIdVal = dbIdInput?.value || "";
              const medialogId = parseInt(dbIdVal, 10);
              if (medialogId && !isNaN(medialogId)) {
                const result = await chrome.storage.local.get("pdfDefaultFolder");
                const defaultFolder = result.pdfDefaultFolder || "\\\\10.0.5.225\\rec24h\\mediarchivos\\medialogs";
                const fullNetworkPath = `${defaultFolder}\\${medialogId}.pdf`;
                await navigator.clipboard.writeText(fullNetworkPath);
                showToast("\u{1F4CB} Ruta de red y nombre copiados al clipboard", 2500, "large green");
              }
            } catch (clipErr) {
              console.warn("Error copying print path to clipboard:", clipErr);
            }
            printWindow.print();
          });
        }
        const saveBtn = printWindow.document.getElementById("btn-snapshot-save");
        if (saveBtn) {
          saveBtn.addEventListener("click", () => {
            const cleanTitle = (response.payload.title || "snapshot").replace(/[/\\?%*:|"<>]/g, "-").trim();
            const filename = `${cleanTitle}.html`;
            let savedHtml = html;
            try {
              const docParser = new DOMParser().parseFromString(html, "text/html");
              const actionBar = docParser.querySelector(".action-bar");
              if (actionBar) {
                actionBar.remove();
              }
              savedHtml = "<!DOCTYPE html>\n" + docParser.documentElement.outerHTML;
            } catch (e) {
              console.warn("[PortalScrapper] Error cleaning action-bar from saved HTML:", e);
            }
            const blob = new Blob([savedHtml], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = printWindow.document.createElement("a");
            a.href = url;
            a.download = filename;
            printWindow.document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              printWindow.document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 100);
          });
        }
        const uploadPdfBtn = printWindow.document.getElementById("btn-snapshot-upload-pdf");
        const statusSpan = printWindow.document.getElementById("snapshot-status");
        if (uploadPdfBtn) {
          uploadPdfBtn.addEventListener("click", async () => {
            const medialogId = parseInt(response.payload.medialogId, 10);
            if (!medialogId || isNaN(medialogId)) {
              if (statusSpan) {
                statusSpan.textContent = "\u26A0\uFE0F Error: Debe grabar la nota primero.";
                statusSpan.style.display = "inline";
                statusSpan.style.color = "#e11d48";
              }
              showToast("\u26A0\uFE0F Grabe primero la nota en Medialog", 4e3);
              return;
            }
            uploadPdfBtn.disabled = true;
            if (statusSpan) {
              statusSpan.textContent = "\u23F3 Generando PDF...";
              statusSpan.style.display = "inline";
              statusSpan.style.color = "#475569";
            }
            try {
              if (statusSpan) {
                statusSpan.textContent = "\u23F3 Generando PDF (motor nativo)...";
                statusSpan.style.color = "#475569";
              }
              const allTabs = await chrome.tabs.query({});
              const snapshotTab = allTabs.find((t) => {
                if (!t.url) return false;
                try {
                  return new URL(t.url).hostname === "";
                } catch {
                  return false;
                }
              }) || allTabs.find((t) => t.url?.startsWith("blob:"));
              if (!snapshotTab?.id) {
                throw new Error("No se encontr\xF3 la pesta\xF1a del snapshot. \xBFEst\xE1 abierta?");
              }
              const swResp = await chrome.runtime.sendMessage({
                type: "PRINT_TAB_TO_PDF",
                payload: { tabId: snapshotTab.id }
              });
              if (!swResp?.ok || !swResp?.payload?.data) {
                throw new Error(swResp?.error || "No se pudo generar el PDF via CDP.");
              }
              const b64 = swResp.payload.data;
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const pdfBlob = new Blob([bytes], { type: "application/pdf" });
              if (pdfBlob.size > 10.5 * 1024 * 1024) {
                throw new Error("El archivo PDF generado excede el l\xEDmite m\xE1ximo de 10.5 MB.");
              }
              if (statusSpan) {
                statusSpan.textContent = `\u23F3 Subiendo PDF (${(pdfBlob.size / 1024).toFixed(1)} KB)...`;
                statusSpan.style.color = "#3b82f6";
              }
              const success = await cargarPDF(medialogId, pdfBlob);
              if (success) {
                playBellSound();
                if (statusSpan) {
                  statusSpan.textContent = "\u2705 PDF guardado con \xE9xito en el servidor.";
                  statusSpan.style.color = "#10b981";
                }
                showToast("\u2705 PDF guardado con \xE9xito en el servidor", 3e3, "large green");
              } else {
                throw new Error("El servidor rechaz\xF3 la carga del PDF.");
              }
            } catch (error) {
              console.error("[PortalScrapper] Error al generar/subir PDF:", error);
              if (statusSpan) {
                statusSpan.textContent = `\u274C Error: ${error.message || String(error)}`;
                statusSpan.style.color = "#e11d48";
              }
              showToast(`\u274C Error: ${error.message || String(error)}`, 5e3);
            } finally {
              uploadPdfBtn.disabled = false;
            }
          });
        }
        try {
          const dbIdInput = el("dbRecordId");
          const dbIdVal = dbIdInput?.value || "";
          const medialogId = parseInt(dbIdVal, 10);
          if (medialogId && !isNaN(medialogId)) {
            printWindow.document.title = `${medialogId}`;
          }
        } catch (titleErr) {
          console.warn("Error setting document title:", titleErr);
        }
      };
      if (printWindow.document.readyState === "complete") {
        setupListeners();
      } else {
        printWindow.addEventListener("load", setupListeners);
      }
      showToast("Snapshot generado con \xE9xito");
    } catch (err) {
      console.error("[PortalScrapper] PDF generation error:", err);
      showToast("Error al generar PDF: " + (err.message || err));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  }
  async function handleReExtract() {
    if (!await ensureValidSession()) return;
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
        const newUrl = msg.payload.url || "";
        const normalizedNew = newUrl.split("#")[0].split("?")[0];
        const normalizedPrev = previousUrl.split("#")[0].split("?")[0];
        let isSameDomain = false;
        try {
          if (newUrl && previousUrl) {
            const prevDomain = getBaseDomain(new URL(previousUrl).hostname);
            const nextDomain = getBaseDomain(new URL(newUrl).hostname);
            if (prevDomain === nextDomain) isSameDomain = true;
          }
        } catch (e) {
        }
        if (normalizedNew && normalizedNew !== normalizedPrev) {
          currentArticle.dbRecordId = void 0;
          const dbIdInput = el("dbRecordId");
          if (dbIdInput) {
            dbIdInput.value = "";
            updateEditarButtonState();
          }
        }
        if (isSameDomain) {
          if (msg.payload.emisora === 0) delete msg.payload.emisora;
          if (msg.payload.emision === 4659889) delete msg.payload.emision;
          if (!msg.payload.portal) delete msg.payload.portal;
          if (!msg.payload.nombre_portal) delete msg.payload.nombre_portal;
          if (!msg.payload.pais) delete msg.payload.pais;
        } else {
          currentArticle.emisora = void 0;
          currentArticle.emision = void 0;
          currentArticle.portal = void 0;
          currentArticle.nombre_portal = void 0;
          currentArticle.pais = void 0;
        }
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
        if (!editingDirty || msg.isManualRefresh) {
          populateUI(currentArticle);
          editingDirty = false;
        }
        const url = el("url").value;
        if (url) performAutoChecks(url).catch(console.error);
        showToast("Art\xEDculo extra\xEDdo");
      }
      if (msg.type === "SITE_DETECTED") {
        const info = el("detected-site");
        if (info) info.textContent = msg.payload.name + " (" + msg.payload.site + ")";
        const meta = el("detected-meta");
        if (meta) meta.textContent = "Listo para extraer. Presiona Grabar o Extraer.";
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
      const logoutBtn = el("btn-logout");
      if (logoutBtn) logoutBtn.textContent = `\u{1F464} ${currentUser}`;
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
      await initMainUI();
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
  function playTicSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1e3, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.03);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("[PortalScrapper] Sound feedback failed:", e);
    }
  }
  function playBellSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("[PortalScrapper] Bell sound failed:", e);
    }
  }
  async function initMainUI() {
    const sess = await getCurrentUser();
    if (!sess) {
      showScreen("login");
      return;
    }
    currentUser = sess.usuario;
    currentToken = sess.token;
    const logoutBtn = el("btn-logout");
    if (logoutBtn && currentUser) logoutBtn.textContent = `\u{1F464} ${currentUser}`;
    showScreen("main");
    setupTabChangeListeners();
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
    wire("btn-generate-link", withButtonLoading("btn-generate-link", async () => {
      if (!await ensureValidSession()) return;
      if (!currentToken) return;
      const dbIdInput = el("dbRecordId");
      const dbIdVal = dbIdInput?.value || "";
      const id = parseInt(dbIdVal, 10) || (currentArticle.dbRecordId || 0);
      if (id > 0) {
        try {
          const hash = await getMedialogHash(currentToken, id);
          if (hash) {
            const lnk = `https://www.medialog.com.mx/mx.asp?h=${hash}&E=MnBkanlvYmM=&X=dXlwZGp5b2Jj`;
            window.open(lnk, "_blank");
            try {
              await navigator.clipboard.writeText(lnk);
              showToast("\u2705 Link copiado al Clipboard y abierto en nueva pesta\xF1a", 3e3, "large");
            } catch (e) {
              showToast("Link abierto en nueva pesta\xF1a (error al copiar al Clipboard)", 3e3);
            }
          } else {
            showToast("No se pudo obtener el hash del medialog");
          }
        } catch (err) {
          const handled = await checkAndHandleAuthError(err);
          if (!handled) {
            showToast("Error al obtener hash: " + (err.message || err));
          }
        }
      } else {
        showToast("A\xFAn no sincronizado con API");
      }
    }));
    wire("btn-editar", () => {
      const dbIdInput = el("dbRecordId");
      const dbIdVal = dbIdInput?.value || "";
      const numericId = parseInt(dbIdVal, 10);
      if (!isNaN(numericId) && numericId > 0) {
        const lnk = `https://www.medialog.com.mx/lgg/EditaNotaScrapper.asp?m=${numericId}`;
        window.open(lnk, "_blank");
      } else {
        showToast("No hay n\xFAmero de medialog v\xE1lido");
      }
    });
    wire("btn-open-url", () => {
      const url = el("url")?.value.trim();
      if (url) window.open(url, "_blank");
    });
    wire("btn-pdf", handleGeneratePDF);
    const dbRecordIdInput = el("dbRecordId");
    if (dbRecordIdInput) {
      ["input", "change"].forEach((ev) => {
        dbRecordIdInput.addEventListener(ev, () => {
          updateEditarButtonState();
          updateGrabarButtonState();
        });
      });
    }
    ["btn-reextract", "btn-grabar", "btn-checar", "btn-editar", "btn-generate-link", "btn-pdf"].forEach((id) => {
      const btn = el(id);
      if (btn) btn.addEventListener("click", playTicSound);
    });
    updateEditarButtonState();
    updateGrabarButtonState();
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
