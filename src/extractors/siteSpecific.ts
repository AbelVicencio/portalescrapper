import { ExtractorResult } from './base';
import { SiteConfig } from '../types';

export const SITE_CONFIGS: Record<string, SiteConfig> = {
  'wsj.com': {
    name: 'Wall Street Journal',
    hostPatterns: ['wsj.com'],
    selectors: {
      title: 'h1.wsj-article-headline, h1[class*="StyledHeadline"], h1[data-testid="headline"], h1',
      author: '.author-name, [class*="AuthorName"], [data-testid="author-name"]',
      date: 'time[datetime]',
      content: 'article section p, article p, section[name="articleBody"] p, .wsj-article-body p, [itemprop="articleBody"] p, [class*="article-body"] p, [class*="ArticleBody"] p',
      paywall: '.wsj-snippet-login, #cx-snippet-overlay, .paywall-container, #gateway-content'
    }
  },
  'nytimes.com': {
    name: 'New York Times',
    hostPatterns: ['nytimes.com'],
    selectors: {
      title: 'h1[data-testid="headline"], h1.e1h9f4f0',
      author: '[class*="byline"] a, span[class*="last-byline"], [data-testid="byline"]',
      date: 'time[datetime]',
      content: 'section[name="articleBody"] p, .article-body p',
      paywall: '#gateway-content, [data-testid="inline-message"], .paywall-container'
    }
  },
  'reuters.com': {
    name: 'Reuters',
    hostPatterns: ['reuters.com'],
    selectors: {
      title: 'h1[data-testid="Heading"], h1.article-header__title',
      author: '[data-testid="AuthorName"], a[href*="/authors/"]',
      date: 'time[datetime]',
      content: '[data-testid*="paragraph"], .article-body__content p, .StandardArticleBody__article-body p',
      paywall: '.paywall-container'
    }
  },
  'ft.com': {
    name: 'Financial Times',
    hostPatterns: ['ft.com'],
    selectors: {
      title: '.article-headline, .topper__headline, h1',
      author: '.article__author-name, .topper__standfirst, .author-name',
      date: 'time[datetime], .article-info__timestamp',
      content: '.article__content-body p, .body-content p, .article-body p',
      paywall: '.barrier, .o-barrier, .login-overlay'
    }
  },
  'washingtonpost.com': {
    name: 'Washington Post',
    hostPatterns: ['washingtonpost.com'],
    selectors: {
      title: 'h1[data-qa="headline"], h1.headline',
      author: '.author-name a, [data-qa="author-name"]',
      date: 'time[datetime], [data-qa="display-date"]',
      content: '.article-body p, [data-qa="article-body"] p',
      paywall: '.paywall-overlay, #paywall-offer'
    }
  },
  'elpais.com': {
    name: 'El País',
    hostPatterns: ['elpais.com'],
    selectors: {
      title: 'h1.a_t, h1.c_t, h1.article-header__title',
      author: '.a_md_a_n, .author-name, [data-testid="author"]',
      date: 'time[datetime]',
      content: '.a_c p, .article-body p, [data-testid="article-body"] p',
      paywall: '.a_tp, #ctn_freemium_article, .mura-wall, .paywall'
    }
  },
  'eluniversal.com.mx': {
    name: 'El Universal',
    hostPatterns: ['eluniversal.com.mx'],
    selectors: {
      title: 'h1.title, h1.article-title',
      author: '.sc__author-nota, .author',
      date: 'time[datetime], .sc__author--date',
      content: '.sc__font-paragraph, .story-content p, .timeline-card p',
      paywall: '.paywall, .premium-banner'
    }
  },
  'reforma.com': {
    name: 'Reforma',
    hostPatterns: ['reforma.com'],
    selectors: {
      title: 'h1.article-title, #MainContent h1, h1.title',
      author: '.author, .article-author, .byline, [name="cXenseParse:author"]',
      date: 'time[datetime], .date, meta[name="cXenseParse:recs:publishtime"]',
      content: '.gr_texto_articulo, .article-body p, #article-body p',
      paywall: '.paywall, .subscription-wall, #caja_suscripcion'
    }
  },
  'milenio.com': {
    name: 'Milenio',
    hostPatterns: ['milenio.com'],
    selectors: {
      title: 'h1.content-title, h1.title, .article-title',
      author: '.author-name, .content-author, [data-testid="author-name"]',
      date: 'time[datetime]',
      content: '.content-body p, .article-body p',
      paywall: '.paywall, .subscription-overlay'
    }
  },
  'pressreader.com': {
    name: 'PressReader',
    hostPatterns: ['pressreader.com'],
    selectors: {
      // PressReader es una SPA — estas clases se renderizan dinámicamente.
      // El Text View es el más accesible para extracción.
      title: [
        '.article-title',
        '.v-textview h1',
        '.text-view-title',
        '.article-headline',
        '[class*="articleTitle"]',
        '[class*="ArticleTitle"]',
        '.content-title',
        'h1',
      ].join(', '),
      author: [
        '.article-author',
        '.v-textview .byline',
        '[class*="articleAuthor"]',
        '[class*="author"]',
        '.byline',
      ].join(', '),
      date: [
        '.article-date',
        '.v-textview .date',
        '[class*="articleDate"]',
        'time[datetime]',
      ].join(', '),
      content: [
        '.v-textview .body p',
        '.v-textview p',
        '.text-view-content p',
        '.article-body p',
        '.article-text p',
        '[class*="articleBody"] p',
        '[class*="ArticleBody"] p',
        '[class*="article-content"] p',
        '.content-body p',
      ].join(', '),
      paywall: ''
    }
  },
  'bloomberg.com': {
    name: 'Bloomberg',
    hostPatterns: ['bloomberg.com'],
    selectors: {
      title: 'h1[data-component="headline"], h1[class*="ArticleHeadline"], h1[class*="headline"], h1',
      author: '[class*="articleBylineAuthors"], [class*="byline"], a[rel="author"]',
      date: 'time[datetime]',
      content: '.body-content p, p[class*="articleBodyContent"], p[class*="articleBody"], p[class*="typography_articleBody"], article p',
      paywall: '.paywall-container, #paywall-banner, [class*="paywall"]'
    }
  }
};

function querySelectorText(selector: string): string {
  if (!selector) return '';
  const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    try {
      const el = document.querySelector(part);
      if (el) {
        let text = (el.textContent || '').trim();
        // Limpiar prefijo de accesibilidad "Article" mal concatenado (ej: "ArticleReeves" -> "Reeves")
        text = text.replace(/^Article(?=[A-ZÁÉÍÓÚÑÜ“”"'])/, '');
        if (text.length > 0) return text;
      }
    } catch {}
  }
  return '';
}

function collectText(selector: string): string {
  const articleParent = document.querySelector('article.current, article.first-story, article');
  if (articleParent && window.location.hostname.includes('bloomberg.com')) {
    const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
    const nodes: Element[] = [];
    for (const part of parts) {
      let cleanPart = part;
      if (part.startsWith('article ')) {
        cleanPart = part.substring(8);
      }
      try {
        const found = articleParent.querySelectorAll(cleanPart);
        found.forEach((n) => {
          if (!nodes.includes(n)) nodes.push(n);
        });
      } catch {}
    }
    
    // Sort nodes by their position in the DOM
    const sortedNodes = Array.from(nodes).sort((a, b) => {
      const position = a.compareDocumentPosition(b);
      if (position & 4) return -1; // a is before b
      if (position & 2) return 1;  // a is after b
      return 0;
    });

    return sortedNodes
      .map((n) => {
        const el = n as HTMLElement;
        return (el.innerText || el.textContent || '').trim();
      })
      .filter(Boolean)
      .join('\n\n');
  }

  const nodes = document.querySelectorAll(selector);
  return Array.from(nodes)
    .map((n) => {
      const el = n as HTMLElement;
      return (el.innerText || el.textContent || '').trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

export function cleanBloombergText(text: string): string {
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(Boolean);
  
  const filtered = paragraphs.filter(p => {
    const pLower = p.toLowerCase();
    
    // Quick script/ad filter
    if (
      p.includes('window.') || 
      p.includes('adslots') ||
      p.includes('renderAd') ||
      p === 'Advertisement'
    ) {
      return false;
    }

    // Connection issues, translations and time/duration indicators
    if (
      pLower.includes('check your internet connection') ||
      pLower === 'translate' ||
      (p.length < 12 && p.includes(':') && !p.includes(' ') && p.match(/^\d+(?::\d+)+$/))
    ) {
      return false;
    }
    
    // Header, Navigation and general portal links
    if (
      p === 'Markets' || 
      p === 'Finance' || 
      p === 'Economics' || 
      p === 'Industries' || 
      p === 'Tech' || 
      p === 'Politics' || 
      p === 'Opinion' ||
      p === 'Businessweek' ||
      p === 'Live TV' ||
      p === 'LiveTV' ||
      p.includes('Latin America Edition') ||
      p === 'War With Iran:' ||
      pLower === 'select region' ||
      pLower === 'current region' ||
      pLower === 'subscribe' ||
      pLower === 'sign in' ||
      pLower === 'search' ||
      pLower === 'menu'
    ) {
      return false;
    }

    // Social Sharing and Interactive Controls
    if (
      p === 'Save' || 
      p === 'Gift this article' || 
      p.includes('Gift this article') ||
      p === 'Share this article' ||
      pLower === 'facebook' ||
      pLower === 'x' ||
      pLower === 'linkedin' ||
      pLower === 'email' ||
      pLower === 'link' ||
      pLower === 'copy link' ||
      pLower === 'back' ||
      pLower === 'forward'
    ) {
      return false;
    }

    // Qualtrics Feedback, Tips and Contact block
    if (
      p.startsWith('Contact us:') ||
      p.includes('Provide news feedback') ||
      p.startsWith('Confidential tip?') ||
      p.includes('Send a tip to our reporters') ||
      p.startsWith('Site feedback:') ||
      pLower.includes('take our survey') ||
      pLower === 'take our survey'
    ) {
      return false;
    }

    // Audio players instruction
    if (
      p === 'Listen' ||
      p.startsWith('Listen (') ||
      pLower === 'listen to article'
    ) {
      return false;
    }

    return true;
  });

  if (filtered.length === 0) return '';

  let startIndex = 0;
  for (let i = 0; i < filtered.length; i++) {
    const p = filtered[i];
    const pLower = p.toLowerCase();
    
    // Skip eyebrow tags, titles, bylines, timestamps, video captions at start
    if (
      p.length < 60 && (
        p.startsWith('By ') ||
        pLower.includes('updated') ||
        pLower.includes('published') ||
        pLower.includes('feedback') ||
        pLower.includes('survey') ||
        pLower.includes('contact') ||
        pLower.includes('tip?') ||
        pLower.includes('newsletter') ||
        pLower.includes('sign up') ||
        pLower.includes('latest') ||
        pLower.includes('toll system') || // video caption
        p.includes('at ') && p.includes('UTC') || // timestamp
        p.split(' ').length < 8 // very short tags (less than 8 words)
      )
    ) {
      continue;
    }
    
    startIndex = i;
    break;
  }

  let endIndex = filtered.length - 1;
  let foundEnd = -1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const p = filtered[i];
    if (
      p.includes('With assistance from') || 
      (p.startsWith('(') && p.toLowerCase().includes('updates'))
    ) {
      foundEnd = i;
      break;
    }
  }

  if (foundEnd !== -1) {
    endIndex = foundEnd;
  } else {
    // Fallback ending trim
    for (let i = filtered.length - 1; i >= 0; i--) {
      const p = filtered[i];
      
      if (
        p.includes('Copyright ©') || 
        p.includes('Bloomberg L.P.') || 
        p.includes('All Rights Reserved') ||
        p.includes('Terms of Service') ||
        p.includes('Privacy Policy') ||
        p.includes('Subscription Plan') ||
        p.includes('To read the full article')
      ) {
        continue;
      }
      
      if (
        p.includes('More from Bloomberg') ||
        p.includes('Sign up for') ||
        p.includes('Subscribe for unlimited access')
      ) {
        continue;
      }

      const isAssistanceOrUpdate = p.includes('With assistance from') || (p.startsWith('(') && p.toLowerCase().includes('updates'));
      if (p.length < 35 && !isAssistanceOrUpdate) {
        continue;
      }
      
      endIndex = i;
      break;
    }
  }

  if (startIndex > endIndex) {
    return filtered.join('\n\n');
  }

  const sliced = filtered.slice(startIndex, endIndex + 1);
  return sliced.join('\n\n');
}

export function cleanWSJText(text: string): string {
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(Boolean);
  
  // 1. Filter out code blocks and absolute noise immediately
  const filtered = paragraphs.filter(p => {
    // Skip inline JavaScript code block leaks
    if (
      p.includes('function ()') || 
      p.includes('var adOptions') || 
      p.includes('window.') || 
      p.includes('window.__ace') ||
      p.includes('adslots') ||
      p.includes('adActivate') ||
      p.includes('renderAd') ||
      (p.includes('{') && p.includes('}') && (p.includes(':') || p.includes(';')))
    ) {
      return false;
    }
    
    // Skip ads
    if (p === 'Advertisement') {
      return false;
    }
    
    return true;
  });

  if (filtered.length === 0) return '';

  // 2. Find the start index (first real paragraph of summary or story)
  let startIndex = 0;
  for (let i = 0; i < filtered.length; i++) {
    const p = filtered[i];
    
    // Skip short metadata lines
    if (p === 'Listen' || p === 'By' || p.match(/^\(\d+\s*min\)$/i)) {
      continue;
    }
    
    // Skip timestamps or short relative dates
    if (
      p.match(/^[A-Z][a-z]+ \d+, \d{4}$/i) || 
      p.match(/^[A-Z][a-z]+ \d+, \d{4} \d+:\d+ [ap]m ET$/i) ||
      p.match(/^\d+ hours? ago$/i) ||
      p.match(/^\d+ min ago$/i)
    ) {
      continue;
    }
    
    // Skip image captions (usually end with credits or contain photographer names)
    if (
      p.includes('Luis Manuel Lopez') ||
      p.match(/\/[A-Za-z\s]+$/) && (p.includes('Reuters') || p.includes('AP') || p.includes('Getty') || p.includes('AFP'))
    ) {
      continue;
    }
    
    // We found the first real paragraph!
    startIndex = i;
    break;
  }

  // 3. Find the end index (last paragraph of the actual story)
  let endIndex = filtered.length - 1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    const p = filtered[i];
    
    // Skip copyright notices
    if (p.includes('Copyright ©') || p.includes('All Rights Reserved') || p.includes('Dow Jones & Company')) {
      continue;
    }
    
    // Skip author biographies
    if (p.match(/is a rewrite editor/i) || p.match(/is a reporter/i) || p.includes('rewrite editor at The Wall Street Journal')) {
      continue;
    }
    
    // Skip recommended bottom lists, newsletters, videos or opinion bars
    if (
      p === 'Autos' ||
      p === 'Climate and Energy Newsletter' ||
      p === 'Latin America News' ||
      p === 'Heard on the Street' ||
      p === 'Earnings' ||
      p === 'Whats News Newsletter' ||
      p === 'Videos' ||
      p.includes('Most Popular') ||
      p.includes('OPINION') ||
      p.includes('Recommended Videos') ||
      p.includes('Inside Israel’s High-Tech') ||
      p.includes('Quantum Computing') ||
      p.includes('Opinion:')
    ) {
      continue;
    }
    
    // Skip paragraphs that don't look like final sentences (e.g. short tags or headers)
    if (p.length < 40) {
      continue;
    }
    
    // We found the last story paragraph!
    endIndex = i;
    break;
  }

  // If search got crossed, return everything filtered
  if (startIndex > endIndex) {
    return filtered.join('\n\n');
  }

  // Slice list to get exactly the article contents
  const sliced = filtered.slice(startIndex, endIndex + 1);

  // 4. Do a final clean-up of intermediate noise (like intermediate AI summaries tags)
  return sliced
    .filter(p => {
      const lower = p.toLowerCase();
      if (lower === 'quick summary') return false;
      if (lower.includes('generated with ai') && lower.includes('reviewed by an editor')) return false;
      if (lower.includes('read more about how we use artificial intelligence')) return false;
      // If paragraph is just "View more" or "Viewmore"
      if (lower === 'view more' || lower === 'viewmore') return false;
      return true;
    })
    .map(p => {
      // Clean suffix ".View more" or "View more" from any paragraph to prevent text concatenation leaks
      return p.replace(/[\.\s]*View\s*more\s*$/i, '.').trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

export function cleanElUniversalText(text: string): string {
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(Boolean);
  
  const filtered = paragraphs.filter(p => {
    const lower = p.toLowerCase();
    
    // Quitar marcas explícitas de publicidad
    if (p === '[Publicidad]' || lower === '[publicidad]') return false;
    
    // Quitar spam de Whatsapp y boletines
    if (lower.includes('únete a nuestro canal') && lower.includes('whatsapp')) return false;
    if (lower.includes('recibir directo en tu correo') && lower.includes('suscríbete')) return false;
    if (lower.includes('recibe las noticias más relevantes del día')) return false;
    
    // Quitar hipervínculos cruzados como "Lee también"
    if (lower.startsWith('lee también') || 
        lower.startsWith('lee aquí la nota completa') || 
        lower.startsWith('lee aqui la nota completa')) {
      return false;
    }
    
    return true;
  });

  if (filtered.length === 0) return '';

  // Cortar si encontramos un encabezado obvio de fin de nota o recomendaciones de barra lateral
  let stopIndex = filtered.length;
  for (let i = 0; i < filtered.length; i++) {
    const p = filtered[i];
    const lower = p.toLowerCase();
    if (
      lower === 'lo más leído' || 
      lower === 'lo mas leido' ||
      lower === 'temas relacionados' || 
      lower === 'más información' || 
      lower === 'mas informacion' ||
      lower === 'opinión' ||
      lower === 'opinion'
    ) {
      stopIndex = i;
      break;
    }
  }
  const mainParagraphs = filtered.slice(0, stopIndex);

  if (mainParagraphs.length === 0) return '';

  // Cortar al final en la firma "Con información de..." o similares
  let endIndex = mainParagraphs.length - 1;
  for (let i = mainParagraphs.length - 1; i >= 0; i--) {
    const p = mainParagraphs[i];
    const lower = p.toLowerCase();
    
    if (lower.startsWith('con información de')) {
      endIndex = i - 1;
      break;
    }
    
    // Omitir iniciales cortas finales (ej. "apr", "rmlgv") de las agencias/editores
    // Si encontramos un párrafo real (> 25 caracteres), ahí detenemos la búsqueda hacia atrás
    if (p.length > 25) {
      endIndex = i;
      break;
    }
  }

  if (endIndex < 0) return '';
  return mainParagraphs.slice(0, endIndex + 1).join('\n\n');
}

export function cleanElPaisText(text: string): string {
  if (!text) return '';
  
  // 1. Clean up any leaked HTML tag fragments or malformed link attributes
  // e.g. `.com/mexico/...html" target="_self" rel="" title="..." data-link-track-dtm="">`
  let cleaned = text.replace(/[a-zA-Z0-9\-\.\/_~%?&=#+:]+"(?:\s+[a-zA-Z\-]+="[^"]*")+\s*\/?>/g, '');
  
  // 2. If the text starts with sharing bar elements merged together with the actual content,
  // we can strip the sharing bar prefix by finding the last occurrence of 'copiar enlace'
  // or other sharing keywords at the very beginning.
  const lowerText = cleaned.toLowerCase();
  if (lowerText.includes('compartir en whatsapp') || lowerText.includes('copiar enlace')) {
    const copyEnlaceIdx = lowerText.lastIndexOf('copiar enlace');
    if (copyEnlaceIdx !== -1) {
      const candidate = cleaned.slice(copyEnlaceIdx + 'copiar enlace'.length).trim();
      if (candidate.length > 20) {
        cleaned = candidate;
      }
    }
  }

  const paragraphs = cleaned.split('\n\n').map(p => p.trim()).filter(Boolean);
  const filtered: string[] = [];
  
  for (const p of paragraphs) {
    let cleanP = p;
    const lowerP = p.toLowerCase();
    
    // If the paragraph has footer noise glued to the end of actual content
    if (lowerP.includes('mis comentarios') || lowerP.includes('hazte premium') || lowerP.includes('archivado en')) {
      const idxs = [
        lowerP.indexOf('mis comentarios'),
        lowerP.indexOf('hazte premium'),
        lowerP.indexOf('archivado en')
      ].filter(idx => idx !== -1);
      
      if (idxs.length > 0) {
        const cutIdx = Math.min(...idxs);
        cleanP = p.slice(0, cutIdx).trim();
      }
    }

    const lower = cleanP.toLowerCase();
    
    // Skip sharing bar text
    if (
      lower.includes('compartir en whatsapp') ||
      lower.includes('compartir en facebook') ||
      lower.includes('compartir en twitter') ||
      lower.includes('copiar enlace') ||
      lower.includes('ir a los comentarios') ||
      lower.includes('añadir el país') ||
      lower.includes('anadir el pais') ||
      lower.includes('compartir:')
    ) {
      continue;
    }
    
    // Skip registration/comment footers
    if (
      lower.includes('mis comentarios') ||
      lower.includes('rellena tu nombre') ||
      lower.includes('hazte premium') ||
      lower.includes('completar datos') ||
      lower.includes('ya tengo una suscripción') ||
      lower.includes('ya tengo una suscripcion') ||
      lower.includes('archivado en')
    ) {
      continue;
    }
    
    // Skip tags lists or repeated category tags at the very end
    if (
      lower.startsWith('méxico américa latinoamérica') || 
      lower.startsWith('mexico america latinoamerica') ||
      lower.includes('méxico américa latinoamérica') ||
      lower.includes('mexico america latinoamerica') ||
      (lower.includes('sinaloa') && lower.includes('interpol') && (lower.includes('omar garcia harfuch') || lower.includes('omar garcía harfuch')) && cleanP.length < 200)
    ) {
      continue;
    }
    
    if (cleanP.trim().length > 0) {
      filtered.push(cleanP.trim());
    }
  }
  
  if (filtered.length === 0) return '';
  
  return filtered.map(p => p.replace(/\s{2,}/g, ' ')).join('\n\n');
}

export function cleanReformaText(text: string): string {
  // innerText preserves \n for <br> and <p>, let's normalize them
  const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  return paragraphs.join('\n\n');
}

export function cleanMilenioText(text: string, authorName = '', titleText = ''): string {
  const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  
  // 1. Identify start marker
  // Milenio articles frequently start after a dateline: "Ciudad de México / 22.05.2026 17:05:00"
  let startIndex = 0;
  let datelineFound = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    // Check for standard date line "Location / DD.MM.YYYY"
    if (p.includes(' / ') && p.match(/\d{2}\.\d{2}\.\d{4}/)) {
      startIndex = i + 1;
      datelineFound = true;
      break;
    }
  }

  // Fallback: Skip standard metadata
  if (!datelineFound) {
    const titleClean = titleText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
    const authorClean = authorName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
    const descEl = document.querySelector('meta[name="description"]');
    const descText = descEl ? descEl.getAttribute('content') || '' : '';
    const descClean = descText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pClean = p.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
      
      if (!pClean) continue;
      if (titleClean && (pClean === titleClean || pClean.includes(titleClean) || titleClean.includes(pClean))) continue;
      if (descClean && (pClean === descClean || pClean.includes(descClean) || descClean.includes(pClean))) continue;
      if (authorClean && pClean.includes(authorClean)) continue;
      
      // Specifically bypass repeated noisy phrases
      if (pClean.includes('el registro nacional de detenciones detalla que el aseguramiento se realiz')) continue;

      startIndex = i;
      break;
    }
  }

  // 2. Identify end marker
  let endIndex = paragraphs.length - 1;

  // Scan backward to find the LAST occurrence of bottom noise triggers (like the final "También puedes ver")
  for (let i = paragraphs.length - 1; i >= startIndex; i--) {
    const pLower = paragraphs[i].toLowerCase();
    if (
      pLower.startsWith('también puedes leer') ||
      pLower.startsWith('tambien puedes leer') ||
      pLower.startsWith('también puedes ver') ||
      pLower.startsWith('tambien puedes ver') ||
      pLower.startsWith('también lee') ||
      pLower.startsWith('tambien lee') ||
      pLower.startsWith('te recomendamos') ||
      pLower.startsWith('sigue leyendo') ||
      pLower.startsWith('lee también') ||
      pLower.startsWith('lee tambien') ||
      pLower.includes('participa en la ola') ||
      pLower.includes('es real. participa')
    ) {
      endIndex = i - 1;
      break;
    }
  }

  for (let i = endIndex; i >= startIndex; i--) {
    const p = paragraphs[i];
    const pLower = p.toLowerCase();
    
    // Check for typical footers
    if (
      pLower.startsWith('síguenos en') ||
      pLower.startsWith('siguenos en') ||
      pLower.includes('tags relacionados') ||
      pLower.includes('queda prohibida la reproducción') ||
      pLower.includes('propiedad de milenio diario') ||
      pLower.includes('estudió ciencias de la comunicación') ||
      pLower.includes('con más de 25 años de experiencia') ||
      pLower.includes('premio estatal de periodismo') ||
      pLower.includes('amante de los autos clásicos') ||
      pLower.includes('para conocer más sobre') ||
      pLower.includes('derechos reservados') ||
      pLower.startsWith('también puedes leer') ||
      pLower.startsWith('tambien puedes leer') ||
      pLower.startsWith('también puedes ver') ||
      pLower.startsWith('tambien puedes ver') ||
      pLower.startsWith('te recomendamos') ||
      pLower.startsWith('sigue leyendo') ||
      pLower.startsWith('lee también') ||
      pLower.startsWith('lee tambien') ||
      pLower.includes('participa en la ola') ||
      pLower.includes('es real. participa')
    ) {
      endIndex = i - 1;
      continue;
    }

    // Keep initials like "AG" or short ending tags
    break;
  }

  if (startIndex > endIndex) return '';

  const storyParagraphs = paragraphs.slice(startIndex, endIndex + 1);
  const filtered: string[] = [];

  // 3. Filter out "Te recomendamos" and noise inside the body
  let i = 0;
  while (i < storyParagraphs.length) {
    const p = storyParagraphs[i];
    const pLower = p.toLowerCase();
    const pClean = p.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();

    // Specific noise from the user's example
    if (pClean.includes('el registro nacional de detenciones detalla que el aseguramiento se realiz')) {
      i++;
      continue;
    }

    if (pLower.includes('te recomendamos')) {
      i++; // Skip "Te recomendamos..."
      
      // Skip the recommended articles
      let skippedCount = 0;
      while (i < storyParagraphs.length && skippedCount < 5) {
        const nextP = storyParagraphs[i];
        
        // Headlines usually lack terminal punctuation like periods or exclamation marks.
        // They might end in quotes.
        if (nextP.length < 250 && !nextP.match(/[.!?]$/)) {
          // Example: "Irving Sánchez: el control político de Yecapixtla que terminó bajo investigación de la FGR"
          // Without period at the end.
          // Wait, what if it ends with a quote?
          if (nextP.match(/["']$/) && !nextP.match(/[.!?]["']$/)) {
             i++;
             skippedCount++;
          } else {
             // Normal string without period
             i++;
             skippedCount++;
          }
        } else if (nextP.includes('...')) {
          i++;
          skippedCount++;
        } else {
          break; // Found normal text
        }
      }
      continue;
    }

    filtered.push(p);
    i++;
  }

  return filtered.join('\n\n');
}

export function extractSiteSpecific(host: string): ExtractorResult {
  const result: ExtractorResult = { method: 'site-specific', confidence: 0 };
  const entry = Object.values(SITE_CONFIGS).find((cfg) =>
    cfg.hostPatterns.some((p) => host.includes(p))
  );
  if (!entry) return result;

  const sel = entry.selectors;
  result.title = querySelectorText(sel.title) || undefined;
  result.author = querySelectorText(sel.author) || undefined;
  result.date = querySelectorText(sel.date) || undefined;
  
  let contentText = collectText(sel.content) || undefined;
  if (host.includes('wsj.com') && contentText) {
    contentText = cleanWSJText(contentText);
  }
  if (host.includes('bloomberg.com') && contentText) {
    contentText = cleanBloombergText(contentText);
  }
  if (host.includes('eluniversal.com.mx') && contentText) {
    contentText = cleanElUniversalText(contentText);
  }
  if (host.includes('reforma.com') && contentText) {
    contentText = cleanReformaText(contentText);
  }
  if (host.includes('milenio.com') && contentText) {
    contentText = cleanMilenioText(contentText, result.author, result.title);
  }
  if (host.includes('elpais.com') && contentText) {
    contentText = cleanElPaisText(contentText);
  }
  result.content = contentText;
  
  result.section = sel.section ? querySelectorText(sel.section) : undefined;
  result.subtitle = sel.subtitle ? querySelectorText(sel.subtitle) : undefined;

  if (sel.paywall) {
    const pw = document.querySelector(sel.paywall);
    result.paywallDetected = Boolean(pw);
  } else {
    result.paywallDetected = false;
  }

  result.confidence = (result.title || result.content) ? 0.85 : 0.4;
  return result;
}
