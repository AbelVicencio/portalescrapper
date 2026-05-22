import { ExtractorResult } from './base';
import { cleanWSJText, cleanBloombergText } from './siteSpecific';

/**
 * Extractor Genérico Universal
 *
 * Funciona en CUALQUIER sitio de noticias sin configuración previa.
 * Usa heurísticas de densidad de texto, selectores semánticos universales
 * y patrones comunes de CMS para recuperar título, autor, fecha y texto completo.
 *
 * Confidence: 0.50 — se usa como red de seguridad después de JSON-LD,
 * Site-Specific y Meta Tags. Solo aporta campos que las capas superiores
 * no pudieron resolver.
 */

// ═══════════════════════════════════════════════════════
// Blacklist de clases/IDs que NO son contenido periodístico
// ═══════════════════════════════════════════════════════
const NOISE_PATTERNS = /nav|sidebar|footer|header|menu|breadcrumb|comment|social|share|related|widget|promo|advert|ad-|sponsor|newsletter|popup|modal|cookie|consent|signup|login|toolbar|pagination|carousel|gallery-thumbs|trending|most-read|also-read|recomend/i;

// ═══════════════════════════════════════════════════════
// Selectores universales para el contenido del artículo
// ═══════════════════════════════════════════════════════
const ARTICLE_CONTAINER_SELECTORS = [
  // Estándar HTML5 semántico
  'article',
  '[role="article"]',
  'main',
  '[role="main"]',
  // Microdata / Schema.org
  '[itemprop="articleBody"]',
  '[itemtype*="schema.org/Article"]',
  '[itemtype*="schema.org/NewsArticle"]',
  // Patrones de CMS comunes (WordPress, Drupal, etc.)
  '.article-body',
  '.article-content',
  '.article__body',
  '.article__content',
  '.story-body',
  '.story-content',
  '.post-body',
  '.post-content',
  '.entry-content',
  '.content-body',
  '.content-article',
  '.field-body',
  '.text-article',
  '.nota-body',
  '.nota-content',
  // Patrones genéricos con data attributes
  '[data-testid*="article"]',
  '[data-testid*="story"]',
  '[data-component="text-block"]',
  // Selectores específicos de PressReader y visor de periódicos
  '.article-text',
  '.article-body-text',
  '.reading-body',
];

// ═══════════════════════════════════════════════════════
// Selectores universales para título
// ═══════════════════════════════════════════════════════
const TITLE_SELECTORS = [
  'h1[itemprop="headline"]',
  'h1[data-testid="headline"]',
  'h1[data-testid*="title"]',
  'article h1',
  'main h1',
  '[role="main"] h1',
  '.article-title h1',
  '.article-headline',
  '.story-headline',
  '.headline',
  'h1.title',
  'h1.entry-title',
  'h1.post-title',
  'h1',
];

// ═══════════════════════════════════════════════════════
// Selectores universales para autor
// ═══════════════════════════════════════════════════════
const AUTHOR_SELECTORS = [
  '[rel="author"]',
  '[itemprop="author"] [itemprop="name"]',
  '[itemprop="author"]',
  '[data-testid="author-name"]',
  '[data-testid*="byline"]',
  '[data-testid*="author"]',
  'a[href*="/author/"]',
  'a[href*="/authors/"]',
  'a[href*="/autor/"]',
  '.author-name',
  '.author',
  '.byline-name',
  '.byline a',
  '.byline',
  '.article-author',
  '.story-author',
  '.post-author',
  '.writer-name',
  '.contributor-name',
  'span[class*="author"]',
  'span[class*="byline"]',
  'p[class*="author"]',
];

// ═══════════════════════════════════════════════════════
// Selectores universales para fecha
// ═══════════════════════════════════════════════════════
const DATE_SELECTORS = [
  'time[datetime]',
  '[itemprop="datePublished"]',
  '[data-testid*="timestamp"]',
  '[data-testid*="date"]',
  '.article-date',
  '.story-date',
  '.publish-date',
  '.published-date',
  '.post-date',
  '.date-published',
  '.article-timestamp',
  '.timestamp',
  'span[class*="date"]',
];

/**
 * Selecciona texto limpio del primer elemento que coincida con algún selector.
 */
function queryFirst(selectors: string[]): string {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        let text = (el.textContent || '').trim();
        // Limpiar prefijo de accesibilidad "Article" mal concatenado (ej: "ArticleReeves" -> "Reeves")
        text = text.replace(/^Article(?=[A-ZÁÉÍÓÚÑÜ“”"'])/, '');
        if (text.length > 0) return text;
      }
    } catch { /* selector inválido — saltar */ }
  }
  return '';
}

/**
 * Para `time[datetime]`, extraer el atributo `datetime` que es más fiable que el textContent.
 */
function queryDate(): string {
  // Prioridad: atributo datetime
  const timeEl = document.querySelector('time[datetime]');
  if (timeEl) {
    const dt = timeEl.getAttribute('datetime');
    if (dt) return dt;
    const text = (timeEl.textContent || '').trim();
    if (text) return text;
  }

  const itempropEl = document.querySelector('[itemprop="datePublished"]');
  if (itempropEl) {
    const content = itempropEl.getAttribute('content') || itempropEl.getAttribute('datetime');
    if (content) return content;
    const text = (itempropEl.textContent || '').trim();
    if (text) return text;
  }

  // Fallback a selectores genéricos (solo textContent)
  for (const sel of DATE_SELECTORS.slice(2)) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.textContent || '').trim();
        if (text.length > 4) return text;
      }
    } catch {}
  }

  return '';
}

/**
 * Limpia el title del navegador quitando sufijos de sitio comunes.
 * Ej: "Título de la nota - El País" → "Título de la nota"
 */
function cleanDocumentTitle(): string {
  const raw = document.title || '';
  // Patrones comunes: " - Sitio", " | Sitio", " — Sitio", " :: Sitio"
  return raw
    .replace(/\s*[\|–—:·]\s*[^|–—:·]{2,40}$/g, '')
    .replace(/\s*-\s*[^-]{2,40}$/g, '')
    .trim();
}

// ═══════════════════════════════════════════════════════
// Algoritmo de Densidad de Texto
// ═══════════════════════════════════════════════════════

interface ContainerScore {
  element: Element;
  score: number;
}

/**
 * Evalúa si un nodo es "ruido" (navegación, sidebar, ads, etc.)
 */
function isNoiseNode(el: Element): boolean {
  const id = (el.id || '').toLowerCase();
  const cls = (el.className || '').toString().toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();

  if (NOISE_PATTERNS.test(id) || NOISE_PATTERNS.test(cls)) return true;
  if (['navigation', 'banner', 'complementary', 'contentinfo'].includes(role)) return true;

  const tag = el.tagName.toLowerCase();
  if (['nav', 'footer', 'aside', 'header'].includes(tag)) return true;

  return false;
}

/**
 * Calcula un puntaje de "probabilidad de ser el contenido principal" para un elemento.
 */
function scoreContainer(el: Element): number {
  if (isNoiseNode(el)) return -100;

  const text = (el.textContent || '').trim();
  const textLength = text.length;

  if (textLength < 100) return -50; // Muy poco texto — no es un artículo

  // Contar párrafos directos
  const paragraphs = el.querySelectorAll('p');
  const pCount = paragraphs.length;

  // Contar links — muchos links = probablemente es navegación
  const links = el.querySelectorAll('a');
  const linkDensity = links.length / Math.max(pCount, 1);

  // Ratio texto/HTML bruto — contenido real tiene alto ratio
  const htmlLength = el.innerHTML.length;
  const textRatio = htmlLength > 0 ? textLength / htmlLength : 0;

  // Score base: longitud del texto
  let score = Math.log(textLength) * 10;

  // Bonus: muchos párrafos
  score += pCount * 3;

  // Bonus: buen ratio texto/html
  score += textRatio * 30;

  // Penalización: alta densidad de links
  if (linkDensity > 3) score -= 20;
  if (linkDensity > 6) score -= 30;

  // Bonus: contiene elementos semánticos de artículo
  if (el.querySelector('time[datetime]')) score += 5;
  if (el.querySelector('[itemprop]')) score += 5;

  // Bonus por tag/clase sugestiva
  const tag = el.tagName.toLowerCase();
  if (tag === 'article') score += 25;
  if (tag === 'main') score += 15;

  const cls = (el.className || '').toString().toLowerCase();
  if (/article|story|content|body|post|entry|nota/.test(cls)) score += 15;

  return score;
}

/**
 * Encuentra el contenedor más probable del artículo usando un sistema de puntaje.
 */
function findBestContainer(): Element | null {
  const candidates: ContainerScore[] = [];

  // 1) Probar selectores conocidos de artículo
  for (const sel of ARTICLE_CONTAINER_SELECTORS) {
    try {
      const els = document.querySelectorAll(sel);
      for (const el of Array.from(els)) {
        const score = scoreContainer(el);
        if (score > 0) {
          candidates.push({ element: el, score });
        }
      }
    } catch {}
  }

  // 2) Probar divs genéricos como fallback
  if (candidates.length === 0) {
    const divs = document.querySelectorAll('div, section');
    for (const div of Array.from(divs)) {
      // Solo evaluar divs de "nivel medio" (no el body entero ni micro-divs)
      const depth = getDepth(div);
      if (depth < 2 || depth > 8) continue;

      const score = scoreContainer(div);
      if (score > 20) {
        candidates.push({ element: div, score });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Ordenar por score descendente
  candidates.sort((a, b) => b.score - a.score);

  return candidates[0].element;
}

/**
 * Calcula la profundidad de un elemento en el DOM.
 */
function getDepth(el: Element): number {
  let depth = 0;
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

/**
 * Extrae texto limpio de un contenedor, recopilando solo párrafos y listas,
 * eliminando ruido de navegación y ads internos.
 */
function extractCleanText(container: Element): string {
  const blocks: string[] = [];

  // Recopilar todos los nodos de texto significativos
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node: Node) => {
        const el = node as Element;
        // Rechazar sub-árboles que son ruido
        if (isNoiseNode(el)) return NodeFilter.FILTER_REJECT;
        const tag = el.tagName.toLowerCase();
        // Aceptar párrafos, headings internos, listas
        if (['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'figcaption'].includes(tag)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        // Para divs que son "leaf" (contienen texto directo sin sub-divs con p)
        if (tag === 'div' && !el.querySelector('p')) {
          const text = (el.textContent || '').trim();
          if (text.length > 50) return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP; // Recorrer hijos
      },
    }
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as Element;
    const text = (el.textContent || '').trim();
    if (text.length > 0) {
      // No agregar duplicados (un h2 dentro de un blockquote, etc.)
      if (!blocks.includes(text)) {
        blocks.push(text);
      }
    }
  }

  return blocks.join('\n\n');
}

// ═══════════════════════════════════════════════════════
// Entry point público
// ═══════════════════════════════════════════════════════

export function extractGeneric(): ExtractorResult {
  const result: ExtractorResult = { method: 'generic', confidence: 0 };

  // ── Título ──
  result.title = queryFirst(TITLE_SELECTORS) || cleanDocumentTitle() || undefined;

  // ── Autor ──
  result.author = queryFirst(AUTHOR_SELECTORS) || undefined;

  // ── Fecha ──
  result.date = queryDate() || undefined;

  // ── Texto completo (el santo grial) ──
  const container = findBestContainer();
  if (container) {
    // Clone container to prevent mutating the live page DOM
    const cloned = container.cloneNode(true) as Element;
    // Remove scripts, styles, noscripts, iframes, svgs, canvas and interactive elements to avoid code/widget leaks
    const elementsToRemove = cloned.querySelectorAll('script, style, noscript, iframe, svg, canvas, button, select, option');
    elementsToRemove.forEach(el => el.remove());

    let text = extractCleanText(cloned);
    if (window.location.hostname.includes('wsj.com') && text) {
      text = cleanWSJText(text);
    }
    if (window.location.hostname.includes('bloomberg.com') && text) {
      text = cleanBloombergText(text);
    }
    if (text.length > 80) {
      result.content = text;
    }
  }

  // ── Paywall ──
  const paywallHints = document.querySelectorAll(
    '.paywall, .premium-wall, .subscription-wall, [class*="paywall"], [id*="paywall"], ' +
    '[data-testid*="paywall"], .regwall, [class*="barrier"], [class*="metered"]'
  );
  result.paywallDetected = paywallHints.length > 0;

  // ── Confidence ──
  if (result.title && result.content && result.content.length > 300) {
    result.confidence = 0.60; // Buen resultado genérico
  } else if (result.title && result.content) {
    result.confidence = 0.45; // Parcial
  } else if (result.title) {
    result.confidence = 0.30; // Solo título
  } else {
    result.confidence = 0.10; // Casi nada
  }

  return result;
}
