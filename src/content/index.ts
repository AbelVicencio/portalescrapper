import { runExtractionCascade } from '../extractors/cascade';
import type { NewsArticle, ExtensionMessage } from '../types';
import { generateUUID } from '../utils/uuid';

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
    'washingtonpost.com': 'Washington Post',
    'elpais.com': 'El País',
    'reforma.com': 'Reforma',
    'milenio.com': 'Milenio',
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

function buildArticleFromExtraction(extracted: any): Partial<NewsArticle> {
  const now = new Date().toISOString();
  const host = getHostname();

  return {
    id: generateUUID(),
    source: host,
    url: window.location.href,
    urlWithParams: window.location.href,

    emisora: 0,
    emision: 4659889,
    evento: 1,
    pendiente: 1,
    fecha: extracted.fecha || now,
    superabstract: extracted.superabstract || extracted.title || document.title || 'Sin título',
    autor: extracted.autor || '',
    medio: extracted.medio || detectSite()?.name || host,

    abstract: window.location.href,
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

async function handleExtractionRequest(): Promise<void> {
  const { result, method, confidence } = runExtractionCascade();
  const partial = buildArticleFromExtraction(result);

  const article: Partial<NewsArticle> = {
    ...partial,
    extractionMethod: method as any,
    confidence,
  };

  chrome.runtime.sendMessage({
    type: 'ARTICLE_EXTRACTED',
    payload: article,
  } as ExtensionMessage);
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
      // Future enhancement: incremental re-extraction on SPAs
    })
  );

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
  });
}

function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((msg: ExtensionMessage) => {
    if (msg.type === 'EXTRACT_ARTICLE' || msg.type === 'EXTRACT_NOW') {
      handleExtractionRequest();
    }
  });
}

function init(): void {
  notifySiteDetected();
  setupMessageListener();
  setupObservers();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
