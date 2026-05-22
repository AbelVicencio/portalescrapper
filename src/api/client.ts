const BASE_URL = 'https://api.medialog.com.mx/v1';

export class APIMedialogError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIMedialogError';
  }
}

export async function getToken(username: string, password: string): Promise<{ access_token: string; usuario: string }> {
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${username}:${password}`),
    },
    body: new URLSearchParams({ username, password }).toString(),
  });
  if (!res.ok) throw new APIMedialogError(res.status, await res.text());
  const data = await res.json();
  return { access_token: data.access_token || data.data?.access_token, usuario: username };
}

export async function resolvePortalByDomain(
  token: string, 
  baseDomain: string, 
  fullHostname?: string
): Promise<{
  emisora: number;
  portal: number;
  nombre_portal?: string;
  pais?: string;
} | null> {
  const url = `${BASE_URL}/portales/?dominio=${encodeURIComponent(baseDomain)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new APIMedialogError(res.status, 'Error resolving portal');

  const json = await res.json();
  const portals: any[] = json.data || [];

  console.log(`[PortalScrapper] === Portal Resolution ===`);
  console.log(`[PortalScrapper] Query: /portales/?dominio=${baseDomain}`);
  console.log(`[PortalScrapper] Full hostname from URL: ${fullHostname || 'N/A'}`);
  console.log(`[PortalScrapper] Candidates returned by API:`, portals.map(p => ({
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

  let chosen: any = null;
  let reason = '';

  // Prioridad 1: Coincidencia exacta con el hostname completo de la URL (solo si tiene subdominio)
  if (fullHostname && fullHostname !== baseDomain) {
    const exactSubdomainMatch = portals.find(p => p.dominio === fullHostname);
    if (exactSubdomainMatch) {
      chosen = exactSubdomainMatch;
      reason = `exact subdomain match (URL contains ${fullHostname})`;
    }
  }

  // Prioridad 2: Coincidencia exacta con el baseDomain (siempre preferida si la URL no tiene subdominio)
  if (!chosen) {
    const exactBaseMatch = portals.find(p => p.dominio === baseDomain);
    if (exactBaseMatch) {
      chosen = exactBaseMatch;
      reason = `exact baseDomain match (${baseDomain})`;
    }
  }

  // Fallback: primer resultado (último recurso)
  if (!chosen) {
    chosen = portals[0];
    reason = 'fallback to first result (no exact match found)';
    console.warn(`[PortalScrapper] WARNING: No exact domain match found. Using first result.`);
  }

  console.log(`[PortalScrapper] ✅ FINAL CHOSEN:`, {
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

export async function grabarMedialog(token: string, payload: import('./types').GrabarMedialogPayload): Promise<number> {
  const res = await fetch(`${BASE_URL}/medialogs/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new APIMedialogError(401, 'Token expirado o inválido');
    }
    throw new APIMedialogError(res.status, body);
  }
  const json = await res.json();
  return json.data?.medialog || json.medialog || json.data?.id || 0;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

  // Re-export so side panel can import GrabarMedialogPayload cleanly from here
  export type { GrabarMedialogPayload } from './types';

  /**
   * Convierte cualquier fecha cruda a YYYY-MM-DD (usado tanto para emisiones como para búsquedas de duplicados).
   */
  function toYMD(raw: string): string {
    if (!raw) return '';
    const cleaned = raw.replace(/\|.*/g, '').trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      return cleaned.split('T')[0];
    }

    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    const m = cleaned.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  export async function resolveEmisionPorEmisoraYFecha(
    token: string,
    emisora: number,
    rawFecha: string
  ): Promise<number | null> {
    try {
      const fecha = toYMD(rawFecha);
      const fechaInicio = fecha;
      const fechaFin = fecha;

      const url = `${BASE_URL}/emisiones/emisora/${emisora}?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn(`[PortalScrapper] Error al consultar emisiones: ${res.status}`);
        return null;
      }

      const json = await res.json();
      const primeraEmision = json?.data?.emisiones?.[0]?.emision;

      if (primeraEmision) {
        console.log(`[PortalScrapper] Emisión encontrada para emisora ${emisora}: ${primeraEmision}`);
        return primeraEmision;
      }

      return null;
    } catch (e) {
      console.error('[PortalScrapper] Error en resolveEmisionPorEmisoraYFecha:', e);
      return null;
    }
  }

  /**
   * Busca si ya existe un medialog para evitar duplicados.
   * Paso 1: busca por emisora + superabstract (titular) en el día de la nota.
   * Paso 2 (si no encontró): busca por emisora + abstract (URL) en el mismo día.
   * Devuelve el ID del medialog encontrado o null.
   */
  export async function buscarMedialogDuplicado(
    token: string,
    emisora: number,
    fecha: string,
    superabstract: string,
    url: string
  ): Promise<number | null> {
    // Helper defined inside for proper scope
    async function intentarBusquedaPorUrl(
      token: string,
      liga: string,
      fechaInicio: string,
      fechaFin: string,
      emisoraParam?: string
    ): Promise<number | null> {
      try {
        const params = new URLSearchParams({
          abstract: liga,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          tamano_pagina: '500',   // required – backend default 50 cuts off many exact matches
        });
        if (emisoraParam) params.set('emisora', emisoraParam);

        const urlBusqueda = `${BASE_URL}/medialogs/?${params.toString()}`;
        console.log(`[PortalScrapper] Búsqueda URL ${emisoraParam ? 'con' : 'sin'} emisora: ${urlBusqueda}`);

        const res = await fetch(urlBusqueda, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;

        const json = await res.json();
        console.log('[PortalScrapper] RAW respuesta URL search:', JSON.stringify(json).slice(0, 300));

        const registros: any[] = json?.data?.registros || [];
        if (registros.length > 0) {
          const primero = registros[0];
          const id = primero?.medialog || primero?.id || primero?.medialog_id || 0;
          if (id > 0) return id;
        }
        return null;
      } catch {
        return null;
      }
    }

    const day = toYMD(fecha);
    if (!day || !emisora) return null;

    // Widen the range to avoid timezone / hour cut-off issues when records
    // are stored with a time that crosses the day boundary on the server
    const fechaInicio = day;
    const nextDay = new Date(day + 'T12:00:00');   // noon to avoid DST edge cases
    nextDay.setDate(nextDay.getDate() + 1);
    const fechaFin = nextDay.toISOString().slice(0, 10); // YYYY-MM-DD of the next day

    const titulo = (superabstract || '').trim();
    const liga = (url || '').trim();

    // Helper for title (superabstract) search – mirrors intentarBusquedaPorUrl but for title
    async function intentarBusquedaPorTitulo(
      token: string,
      titulo: string,
      fechaInicio: string,
      fechaFin: string,
      emisoraParam?: string
    ): Promise<number | null> {
      try {
        const params = new URLSearchParams({
          superabstract: titulo,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          tamano_pagina: '200',   // CRITICAL: backend defaults to 50; without this many exact title searches return 0
        });
        if (emisoraParam) params.set('emisora', emisoraParam);

        const urlBusqueda = `${BASE_URL}/medialogs/?${params.toString()}`;
        console.log(`[PortalScrapper] Búsqueda título ${emisoraParam ? 'con' : 'sin'} emisora: ${urlBusqueda}`);

        const res = await fetch(urlBusqueda, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;

        const json = await res.json();
        console.log('[PortalScrapper] RAW respuesta título search:', JSON.stringify(json).slice(0, 300));

        const registros: any[] = json?.data?.registros || [];
        if (registros.length > 0) {
          const primero = registros[0];
          const id = primero?.medialog || primero?.id || primero?.medialog_id || 0;
          if (id > 0) return id;
        }
        return null;
      } catch {
        return null;
      }
    }

    // === PASO 1: por superabstract (titular) – título + fecha es lo más fiable para Internet/Portales ===
    if (titulo.length > 0) {
      let dup = await intentarBusquedaPorTitulo(token, titulo, fechaInicio, fechaFin, String(emisora));
      if (!dup) {
        dup = await intentarBusquedaPorTitulo(token, titulo, fechaInicio, fechaFin); // sin emisora (importante para Portales)
      }
      if (dup) {
        console.log(`[PortalScrapper] ✅ Duplicado (Paso 1 - superabstract): #${dup}`);
        return dup;
      }
    }

    // === PASO 2: por abstract (URL) ===
    if (liga.length > 0) {
      // First try with the resolved emisora
      let foundId = await intentarBusquedaPorUrl(token, liga, fechaInicio, fechaFin, String(emisora));

      // Fallback: search without emisora filter (in case the record was saved under a different emisora)
      if (!foundId) {
        foundId = await intentarBusquedaPorUrl(token, liga, fechaInicio, fechaFin);
      }

      if (foundId) {
        console.log(`[PortalScrapper] ✅ Duplicado (Paso 2 - URL): #${foundId}`);
        return foundId;
      }
    }

    console.log('[PortalScrapper] No se encontró duplicado en los dos pasos.');
    return null;
  }

  /**
   * Crea una relación (clasificación) para un medialog recién guardado.
   * Usado para clasificar automáticamente según el portal.
   */
  export async function crearRelacionMedialog(
    token: string,
    medialog: number,
    clasificacion: number,
    fecha: string,
    tipo: string = 'R'
  ): Promise<boolean> {
    try {
      const payload = {
        medialog,
        clasificacion,
        fecha,
        tipo,
      };

      const res = await fetch(`${BASE_URL}/relaciones/medialogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[PortalScrapper] Error al crear relación medialog=${medialog} clasificacion=${clasificacion}: ${res.status} - ${errText}`);
        return false;
      }

      console.log(`[PortalScrapper] ✅ Relación creada: medialog=${medialog}, clasificacion=${clasificacion}, tipo=${tipo}`);
      return true;
    } catch (e) {
      console.error('[PortalScrapper] Error creando relación:', e);
      return false;
    }
  }

