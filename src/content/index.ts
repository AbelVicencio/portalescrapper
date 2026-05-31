import { runExtractionCascade } from '../extractors/cascade';
import type { NewsArticle, ExtensionMessage } from '../types';
import { generateUUID } from '../utils/uuid';
import { getCleanSnapshotHTML } from '../extractors/snapshot';

function getHostname(): string {
  return window.location.hostname.replace('www.', '');
}

function detectSite(): { site: string; name: string } | null {
  const host = getHostname();

  // Portales conocidos con nombre curado
  const known: Record<string, string> = {
    'wsj.com': 'Wall Street Journal',
    'nytimes.com': 'New York Times',
    'reuters.com': 'Reuters',
    'ft.com': 'Financial Times',
    'pressreader.com': 'PressReader',
    'bloomberg.com': 'Bloomberg',
    'washingtonpost.com': 'Washington Post',
    'elpais.com': 'El País',
    'reforma.com': 'Reforma',
    'milenio.com': 'Milenio',
    'eluniversal.com.mx': 'El Universal',
  };
  for (const [key, val] of Object.entries(known)) {
    if (host.includes(key)) return { site: key, name: val };
  }

  // Sitio desconocido — devolver resultado genérico para permitir extracción
  // Solo en páginas que parecen tener contenido (no APIs, imágenes, etc.)
  const pathname = window.location.pathname;
  if (pathname.length > 1) {
    // Generar un nombre legible a partir del hostname
    const displayName = host
      .replace(/^(www|m|mobile|amp)\./, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return { site: host, name: `${displayName} (genérico)` };
  }

  return null;
}

function getCleanUrl(): string {
  // 1. Try canonical link
  try {
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      const href = canonicalEl.getAttribute('href');
      if (href) {
        const absoluteUrl = new URL(href, window.location.href).href;
        if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
          return absoluteUrl;
        }
      }
    }
  } catch (e) {
    console.warn('[PortalScrapper] Error resolving canonical URL:', e);
  }

  // 2. Try OG URL meta tag
  try {
    const ogUrlEl = document.querySelector('meta[property="og:url"]');
    if (ogUrlEl) {
      const content = ogUrlEl.getAttribute('content');
      if (content) {
        const absoluteUrl = new URL(content, window.location.href).href;
        if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
          return absoluteUrl;
        }
      }
    }
  } catch (e) {
    console.warn('[PortalScrapper] Error resolving OG URL:', e);
  }

  // 3. Fallback: Strip common tracking query params
  try {
    const url = new URL(window.location.href);
    const trackers = [
      'mod', 'pos', 'page', 'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'ref', 'ref_', 'fbclid', 'gclid', 'yclid', 'pos', 'pos_'
    ];
    trackers.forEach(t => url.searchParams.delete(t));
    return url.toString();
  } catch {
    return window.location.href;
  }
}

function buildArticleFromExtraction(extracted: any): Partial<NewsArticle> {
  const now = new Date().toISOString();
  const host = getHostname();
  const cleanUrl = getCleanUrl();

  return {
    id: generateUUID(),
    source: host,
    url: cleanUrl,
    urlWithParams: window.location.href,

    emisora: 0,
    emision: 4659889,
    evento: 1,
    pendiente: 1,
    fecha: extracted.fecha || now,
    superabstract: extracted.superabstract || extracted.title || document.title || 'Sin título',
    autor: extracted.autor || '',
    medio: extracted.medio || detectSite()?.name || host,

    abstract: cleanUrl,
    texto: extracted.texto || extracted.content || '',
    subtitulo: extracted.subtitulo || '',
    seccion: extracted.seccion || '',
    clasificaciones: [],
    notas: '',

    isFullContent: extracted.isFullContent ?? ((extracted.texto || '').length > 200),
    paywallDetected: extracted.paywallDetected ?? false,
    extractionMethod: extracted.extractionMethod || 'manual',
    confidence: extracted.confidence || 0.5,

    capturedAt: now,
    lastModified: now,
    status: 'draft',
  };
}
let extractionLocked = false;
let lastExtractedText = '';

async function handleExtractionRequest(source: 'observer' | 'explicit' = 'explicit', isManualRefresh = false): Promise<void> {
  if (source === 'observer' && extractionLocked) {
    console.log('[PortalScrapper] Extraction locked. Skipping passive re-extraction.');
    return;
  }

  const { result, method, confidence } = runExtractionCascade();
  const partial = buildArticleFromExtraction(result);

  const newText = (partial.texto || '').trim();

  // If this is a passive observer trigger and the text hasn't changed, skip to avoid redundant messages
  if (source === 'observer' && newText === lastExtractedText) {
    return;
  }
  lastExtractedText = newText;

  // Lock if we extracted a substantial body of text (> 800 chars) and no paywall is detected
  const textLength = newText.length;
  if (textLength > 800 && !partial.paywallDetected) {
    extractionLocked = true;
    console.log(`[PortalScrapper] Lock activated. Successfully extracted complete article with ${textLength} chars.`);
  }

  const article: Partial<NewsArticle> = {
    ...partial,
    extractionMethod: method as any,
    confidence,
  };

  chrome.runtime.sendMessage({
    type: 'ARTICLE_EXTRACTED',
    payload: article,
    isManualRefresh
  } as any);
}

function notifySiteDetected(): void {
  const detected = detectSite();
  if (detected) {
    chrome.runtime.sendMessage({
      type: 'SITE_DETECTED',
      payload: detected,
    } as ExtensionMessage);
  }
}

function setupObservers(): void {
  const debounce = (fn: Function, delay = 1200) => {
    let t: number;
    return (...args: any[]) => {
      clearTimeout(t);
      t = window.setTimeout(() => fn(...args), delay);
    };
  };

  const observer = new MutationObserver(
    debounce(() => {
      // Incremental re-extraction on SPAs
      handleExtractionRequest('observer');
    })
  );

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
  });
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((msg: ExtensionMessage, sender, sendResponse) => {
    if (msg.type === 'EXTRACT_ARTICLE' || msg.type === 'EXTRACT_NOW') {
      if (msg.type === 'EXTRACT_NOW') {
        extractionLocked = false;
        lastExtractedText = '';
      }
      handleExtractionRequest('explicit', msg.type === 'EXTRACT_NOW');
    } else if (msg.type === 'GET_CLEAN_SNAPSHOT') {
      getCleanSnapshotHTML()
        .then((result) => {
          sendResponse(result);
        })
        .catch((err) => {
          console.error('[PortalScrapper] Error generating clean snapshot:', err);
          sendResponse({ error: err.message || String(err) });
        });
      return true; // Keep channel open for async response
    }
  });
}

function init(): void {
  notifySiteDetected();
  setupMessageListener();
  // setupObservers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
