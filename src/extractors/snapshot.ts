import { Readability } from '@mozilla/readability';
import { SITE_CONFIGS } from './siteSpecific';
import { BASE64_LOGOS } from './base64Logos';

async function toBase64DataUri(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return '';
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return ''; // Skip HTML fallback pages from SPAs
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/**
 * Generates a clean, print-friendly HTML snapshot of the current article.
 * Uses a Hybrid Approach: Clones DOM, performs aggressive custom/generic cleaning,
 * runs Readability.js with soft config, and renders a premium print layout.
 */
export async function getCleanSnapshotHTML(overrideData?: {
  superabstract?: string;
  texto?: string;
  autor?: string;
  fecha?: string;
  medio?: string;
  medialogId?: string;
}): Promise<{ html: string; title: string; originalUrl: string }> {
  // 1. Clone the current document to avoid mutating the live page
  const doc = document.cloneNode(true) as Document;
  const hostname = window.location.hostname;
  const originalUrl = window.location.href;

  // Extract main domain in uppercase
  let domainName = hostname.replace(/^www\./, '');
  const parts = domainName.split('.');
  if (parts.length > 2) {
    const secondLevelTlds = ['com', 'org', 'net', 'edu', 'gob', 'mil', 'co', 'ac', 'info'];
    const secondToLast = parts[parts.length - 2];
    if (secondLevelTlds.includes(secondToLast)) {
      domainName = parts.slice(-3).join('.');
    } else {
      domainName = parts.slice(-2).join('.');
    }
  }
  const mainDomainUpper = domainName.split('.')[0].toUpperCase();

  // Find matching site config
  let siteConfig: any = null;
  for (const [key, config] of Object.entries(SITE_CONFIGS)) {
    if (hostname.includes(key)) {
      siteConfig = config;
      break;
    }
  }

  // 2. Aggressive but intelligent selector-based cleanup
  const generalNoiseSelectors = [
    'script', 'noscript', 'iframe', 'style', 'link[rel="stylesheet"]',
    '.ads', '.advertisement', '.ad-box', '.banner-ads', '[id*="google_ads"]', '[class*="ad-slot"]',
    'aside', '.sidebar', '#sidebar', '.widget',
    '.comments', '#comments', '.comment-box', '.comentarios',
    '.social-share', '.share-buttons', '.social-links', '.share-container',
    '.recommended', '.related', '.relacionados', '.relacionadas', '.mas-leidas', '.las-mas-leidas', '.recomendados', '.Te-recomendamos', '.trending',
    'footer', '.footer', 'header:not(article header):not(main header)', '.header:not(article .header):not(main .header)',
    '.floating-header', '.nav-menu', 'nav', '.menu', '.toolbar', '.popup', '.modal', '.cookie-consent',
    '.hide-for-print', '[class*="hide-for-print" i]',
    '[class*="subscribe-cta" i]', '[class*="subscribe-promo" i]',
    '[data-testid*="subscribe-promo" i]', '[data-qa*="subscribe-promo" i]',
    '[class*="promo-box" i]', '[class*="promo-banner" i]', '[class*="promo-container" i]', '[data-testid*="promo" i]'
  ];

  const elpaisSelectors = [
    '.tv-products', '.product-grid', '[class*="asus"]', '.nav-secondary',
    '.newsletter-box', '.modulo-suscripcion', '.promo-box', '.suscribete-box'
  ];

  const milenioSelectors = [
    '.las-mas-leidas', '.recomendados', '.Te-recomendamos', '.social-media',
    '.tags-container', '.banner-container', '.sidebar-container'
  ];

  const wsjSelectors = [
    'form', '[class*="insetComponents"]', '[class*="Disclaimer"]', '[id*="feedback"]',
    '[class*="QuickSummary" i]', '[class*="quick-summary" i]', '[data-testid*="quick-summary" i]',
    '[class*="KeyPoints" i]', '[class*="key-points" i]', '[class*="SummaryBullets" i]', '[class*="summary-bullets" i]',
    '[class*="AiSummary" i]', '[class*="ai-summary" i]'
  ];

  let selectorsToClean = [...generalNoiseSelectors];
  if (hostname.includes('elpais.com')) {
    selectorsToClean = [...selectorsToClean, ...elpaisSelectors];
  } else if (hostname.includes('milenio.com')) {
    selectorsToClean = [...selectorsToClean, ...milenioSelectors];
  } else if (hostname.includes('wsj.com')) {
    selectorsToClean = [...selectorsToClean, ...wsjSelectors];
  }

  for (const selector of selectorsToClean) {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch (e) {
      console.warn(`[PortalScrapper] Error removing selector "${selector}":`, e);
    }
  }

  // 2b. Fine-grained DOM text content cleaning (removes intermediate ads & duplicates)
  const seenTexts = new Set<string>();
  doc.querySelectorAll('p, div, span, b, strong, figcaption, .caption').forEach(el => {
    const text = el.textContent?.trim();
    if (!text) return;

    const lower = text.toLowerCase();

    // Remove explicit ad placeholders like "[Publicidad]" or "[ publicidad ]"
    if (
      lower === '[publicidad]' ||
      lower === '[ publicidad ]' ||
      lower === 'publicidad' ||
      /^\[\s*publicidad\s*\]$/i.test(text)
    ) {
      el.remove();
      return;
    }

    // Remove video player accessibility helper noise and controls
    if (
      lower.startsWith('play video') ||
      lower.startsWith('this is a modal window') ||
      lower.startsWith('beginning of dialog window') ||
      lower.startsWith('end of dialog window') ||
      lower.startsWith('video player is loading') ||
      lower.startsWith('current time') ||
      lower.startsWith('duration') ||
      lower.startsWith('loaded:') ||
      lower.startsWith('remaining time') ||
      lower === 'siguiente' ||
      lower === 'continuar' ||
      lower.startsWith('close ✕') ||
      lower.startsWith('close') && lower.includes('✕') ||
      lower === 'adchoices' ||
      (lower.includes('adchoices') && text.length < 30)
    ) {
      el.remove();
      return;
    }

    // Remove inline related note banners (e.g. "Leer también ...")
    if (
      (lower.startsWith('leer también') ||
        lower.startsWith('leer tambien') ||
        lower.startsWith('lee también') ||
        lower.startsWith('lee tambien') ||
        lower.startsWith('te recomendamos')) &&
      text.length < 250
    ) {
      el.remove();
      return;
    }

    // Remove El Universal social/newsletter spam
    if (
      ((lower.includes('únete a nuestro canal') && lower.includes('whatsapp')) ||
        (lower.includes('recibir directo en tu correo') && lower.includes('suscríbete')) ||
        lower.includes('recibe las noticias más relevantes del día')) &&
      text.length < 300
    ) {
      el.remove();
      return;
    }

    // De-duplicate contiguous or nearby identical paragraphs/captions (e.g. mobile/desktop duplicates)
    // ONLY target leaf-like text elements: p, figcaption, or class caption. Never match generic div/span containers.
    const tagName = el.tagName.toLowerCase();
    if (text.length > 15 && (tagName === 'p' || tagName === 'figcaption' || el.classList.contains('caption'))) {
      if (seenTexts.has(text)) {
        el.remove();
      } else {
        seenTexts.add(text);
      }
    }
  });

  // 3. Extract the largest main hero image before Readability parses the document
  let heroImageSrc = '';
  const isPressReaderCover = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (lower.includes('prcdn.co') || lower.includes('pressreader.com')) && lower.includes('page=');
  };

  // Try OpenGraph image first
  const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
  if (ogImg && !isPressReaderCover(ogImg)) {
    heroImageSrc = ogImg;
  } else {
    // Try Twitter image
    const twitterImg = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    if (twitterImg && !isPressReaderCover(twitterImg)) {
      heroImageSrc = twitterImg;
    } else {
      // Find largest image in article body or document
      const images = Array.from(doc.querySelectorAll('article img, main img, img'));
      let maxArea = 0;
      for (const img of images) {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('data:') || isPressReaderCover(src)) continue;
        const width = parseInt(img.getAttribute('width') || '0', 10);
        const height = parseInt(img.getAttribute('height') || '0', 10);
        const area = width * height;
        if (area > maxArea && area > 50000) {
          maxArea = area;
          heroImageSrc = src;
        }
      }
      // Fallback to first non-logo image inside article or main
      if (!heroImageSrc) {
        for (const img of images) {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('data:') && !/icon|logo|avatar|social/i.test(src) && !isPressReaderCover(src)) {
            heroImageSrc = src;
            break;
          }
        }
      }
    }
  }

  // Resolve relative hero image URL if necessary
  if (heroImageSrc && !heroImageSrc.startsWith('http')) {
    try {
      heroImageSrc = new URL(heroImageSrc, originalUrl).href;
    } catch { }
  }

  // 4. Try to extract metadata if not handled well by Readability
  let pageAuthor = '';
  if (siteConfig?.selectors?.author) {
    const el = doc.querySelector(siteConfig.selectors.author);
    pageAuthor = el?.textContent?.trim() || '';
  }
  if (!pageAuthor) {
    pageAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
      doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
      doc.querySelector('[itemprop="author"]')?.textContent?.trim() || '';
  }

  let pageDate = '';
  if (hostname.includes('eluniversal.com')) {
    const category = doc.querySelector('.sc__author--category')?.textContent?.trim() || '';
    const rawDate = doc.querySelector('.sc__author--date')?.textContent?.trim() || '';
    if (category || rawDate) {
      pageDate = `${category} ${rawDate}`.replace(/\s+/g, ' ').trim();
    }
  }

  if (!pageDate && siteConfig?.selectors?.date) {
    const el = doc.querySelector(siteConfig.selectors.date);
    pageDate = el?.getAttribute('datetime') || el?.textContent?.trim() || '';
  }
  if (!pageDate) {
    pageDate = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
      doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
      doc.querySelector('time')?.textContent?.trim() || '';
  }

  let pageSubtitle = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('.article-lead')?.textContent?.trim() ||
    doc.querySelector('.article-subtitle')?.textContent?.trim() || '';

  if (pageSubtitle) {
    const isGeneric = pageSubtitle.toLowerCase().includes('pressreader.com') &&
      (pageSubtitle.toLowerCase().includes('periódicos') || pageSubtitle.toLowerCase().includes('replicas') || pageSubtitle.toLowerCase().includes('réplicas'));
    if (isGeneric) {
      pageSubtitle = '';
    }
  }

  let pageKicker = doc.querySelector('.article-kicker')?.textContent?.trim() || '';
  if (!pageKicker) {
    const kickerFallback = doc.querySelector('[class*="kicker" i]')?.textContent?.trim() || '';
    if (kickerFallback && kickerFallback.length < 60) {
      pageKicker = kickerFallback;
    }
  }
  if (!pageKicker) {
    const seccionFallback = doc.querySelector('[class*="seccion" i]')?.textContent?.trim() || '';
    if (seccionFallback && seccionFallback.length < 60) {
      pageKicker = seccionFallback;
    }
  }
  if (pageKicker) {
    pageKicker = pageKicker.replace(/\s*category\s*$/i, '').trim();
    if (pageKicker.toLowerCase() === 'category') pageKicker = '';
  }

  // Extraer la sección ANTES de que Readability mute el DOM
  let extractedSection = '';
  if (siteConfig?.selectors?.section) {
    extractedSection = doc.querySelector(siteConfig.selectors.section)?.textContent?.trim() || '';
  }
  if (!extractedSection) {
    extractedSection = doc.querySelector('meta[property="article:section"]')?.getAttribute('content') ||
      doc.querySelector('.article-section')?.textContent?.trim() || '';
  }
  if (!extractedSection) {
    extractedSection = pageKicker;
  }
  if (extractedSection) {
    extractedSection = extractedSection.replace(/\s*category\s*$/i, '').trim();
    if (extractedSection.toLowerCase() === 'category') extractedSection = '';
  }
  // Extraer metadatos específicos para Reforma
  let reformaReadingTime = '';
  let reformaAuthor = '';
  let reformaDatePlace = '';

  if (hostname.includes('reforma.com')) {
    const allDivsSpans = Array.from(doc.querySelectorAll('div, span, p'));

    // 1. Duración / tiempo de lectura (ej: "02 MIN 30 SEG")
    for (const el of allDivsSpans) {
      const text = el.textContent?.trim() || '';
      if (/^\d+\s*MIN(\s*\d+\s*SEG)?$/i.test(text)) {
        reformaReadingTime = text.toUpperCase();
        break;
      }
    }

    // 2. Autor
    const authorEl = doc.querySelector('.author, .article-author, .byline, [name="cXenseParse:author"]');
    const authorText = authorEl?.textContent?.trim() || '';
    if (authorText && authorText.length < 150) {
      let cleanAuthor = authorText;
      // Remover tiempo de lectura si está pegado
      const rtMatch = cleanAuthor.match(/\d+\s*MIN(\s*\d+\s*SEG)?/i);
      if (rtMatch) {
        cleanAuthor = cleanAuthor.replace(rtMatch[0], '').trim();
      }
      // Detener antes de la ciudad o paréntesis si están pegados
      const placeIndex = cleanAuthor.search(/(Cd\.|Chihuahua|Monterrey|México|\()/i);
      if (placeIndex !== -1) {
        cleanAuthor = cleanAuthor.substring(0, placeIndex).trim();
      }
      reformaAuthor = cleanAuthor;
    }

    // 3. Fecha / Lugar (ej: "Cd. de México (30 mayo 2026) .-17:35 hrs")
    const dateEl = doc.querySelector('.date, .fecha');
    let dateText = dateEl?.textContent?.trim() || '';

    if (!dateText || dateText.length >= 150 || dateText.includes('MIN') || dateText.includes('Autor')) {
      for (const el of allDivsSpans) {
        const text = el.textContent?.trim() || '';
        if (text.length < 200 && text.includes('hrs') && text.includes('.-')) {
          dateText = text;
          break;
        }
      }
    }

    if (dateText) {
      let cleanDate = dateText;
      // Remover tiempo de lectura si está pegado
      const rtMatch = cleanDate.match(/\d+\s*MIN(\s*\d+\s*SEG)?/i);
      if (rtMatch) {
        if (!reformaReadingTime) {
          reformaReadingTime = rtMatch[0].toUpperCase();
        }
        cleanDate = cleanDate.replace(rtMatch[0], '').trim();
      }
      // Remover nombre del autor si está pegado al inicio
      if (reformaAuthor && cleanDate.startsWith(reformaAuthor)) {
        cleanDate = cleanDate.substring(reformaAuthor.length).trim();
      } else if (reformaAuthor) {
        const authorRegex = new RegExp('^' + reformaAuthor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        cleanDate = cleanDate.replace(authorRegex, '').trim();
      }
      // Asegurar que comience en "Cd. de México" o ciudad similar o paréntesis
      const startOfDate = cleanDate.search(/(Cd\.|Chihuahua|Monterrey|México|\(|[A-Z][a-z]+\s+\d+\s+mayo)/i);
      if (startOfDate > 0) {
        cleanDate = cleanDate.substring(startOfDate).trim();
      }
      reformaDatePlace = cleanDate;
    }
  }

  // 5. Execute Readability.js with soft configuration (keepClasses: true, charThreshold: 400)
  const reader = new Readability(doc, { keepClasses: true, charThreshold: 400 });
  const parsedArticle = reader.parse();

  if (!parsedArticle) {
    throw new Error('No se pudo extraer el contenido legible del artículo.');
  }

  // Remove duplicate hero image from article body if it exists
  if (heroImageSrc) {
    try {
      const bodyDoc = new DOMParser().parseFromString(parsedArticle.content || '', 'text/html');
      const heroUrlClean = heroImageSrc.split('?')[0].split('#')[0];
      const bodyImages = Array.from(bodyDoc.querySelectorAll('img, picture'));
      let removedAny = false;

      for (const img of bodyImages) {
        let src = '';
        if (img.tagName.toLowerCase() === 'picture') {
          const innerImg = img.querySelector('img');
          src = innerImg?.getAttribute('src') || innerImg?.getAttribute('data-src') || '';
        } else {
          src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        }

        if (src) {
          try {
            const absSrc = new URL(src, originalUrl).href;
            const absSrcClean = absSrc.split('?')[0].split('#')[0];

            if (absSrcClean === heroUrlClean) {
              const figure = img.closest('figure, .visual__image, .image-container, .image-initial-width');
              if (figure) {
                figure.remove();
              } else {
                img.remove();
              }
              removedAny = true;
              break;
            }
          } catch { }
        }
      }

      if (removedAny) {
        parsedArticle.content = bodyDoc.body.innerHTML;
      }
    } catch (e) {
      console.warn('[PortalScrapper] Error removing duplicate hero image:', e);
    }
  }

  let title = parsedArticle.title || doc.title || 'Sin título';
  let authorVal = pageAuthor || parsedArticle.byline;
  if (authorVal && /^(naci[oó]n|nation)$/i.test(authorVal.trim())) {
    authorVal = '';
  }
  let sourceName = parsedArticle.siteName || hostname.replace('www.', '');
  let subtitleVal = parsedArticle.excerpt || pageSubtitle;
  if (subtitleVal && hostname.includes('pressreader.com') && subtitleVal.trim().startsWith('PressReader.com')) {
    subtitleVal = '';
  }
  let kickerVal = pageKicker;
  let rawDate = pageDate;

  // Apply sidepanel overrides if present
  if (overrideData) {
    if (overrideData.superabstract) title = overrideData.superabstract;
    if (overrideData.autor !== undefined) authorVal = overrideData.autor;
    if (overrideData.medio !== undefined) sourceName = overrideData.medio;
    if (overrideData.fecha !== undefined) rawDate = overrideData.fecha;
    if (overrideData.texto !== undefined && overrideData.texto.trim()) {
      parsedArticle.content = overrideData.texto
        .split('\n\n')
        .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
        .join('\n');
    }
  }

  const snapshotTitle = `${mainDomainUpper} - ${title}`;
  const kickerValFinal = kickerVal; // keep original reference

  // Format date beautifully
  let formattedDate = rawDate;
  if (rawDate) {
    try {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch { }
  }

  // Build metadata blocks
  let metaBlockHtml = '';
  if (hostname.includes('reforma.com')) {
    const readingTime = reformaReadingTime || '02 MIN 30 SEG';
    const author = reformaAuthor || authorVal;
    const datePlace = reformaDatePlace || formattedDate || 'Cd. de México';

    metaBlockHtml = `
      <div class="reforma-meta">
        ${readingTime ? `<div class="reforma-meta-reading">${readingTime}</div>` : ''}
        ${author ? `<div class="reforma-meta-author">${author}</div>` : ''}
        ${datePlace ? `<div class="reforma-meta-date">${datePlace}</div>` : ''}
        <div class="reforma-social">
          <span class="social-icon fb"></span>
          <span class="social-icon tw"></span>
          <span class="social-icon wa"></span>
          <span class="social-icon mail"></span>
          <span class="social-icon link"></span>
        </div>
      </div>
    `;
  } else {
    const authorHtml = authorVal ? `
      <div class="meta-item">
        <span class="meta-icon">✍️</span>
        <span>Autor:</span>
        <strong>${authorVal}</strong>
      </div>
    ` : '';

    const dateHtml = formattedDate ? `
      <div class="meta-item">
        <span class="meta-icon">📅</span>
        <span>Publicado:</span>
        <strong>${formattedDate}</strong>
      </div>
    ` : '';

    metaBlockHtml = `
      <div class="article-meta">
        ${authorHtml}
        ${dateHtml}
      </div>
    `;
  }

  const heroImageHtml = heroImageSrc ? `
    <div class="hero-container">
      <img src="${heroImageSrc}" alt="${title}" class="hero-image" />
    </div>
  ` : '';

  // Helper to extract clean navigation links from the live page header
  const navLinks: string[] = [];
  try {
    const liveNav = document.querySelector('nav, .nav, .menu, [class*="menu"], [class*="nav"]');
    if (liveNav) {
      const anchors = Array.from(liveNav.querySelectorAll('a'));
      for (const a of anchors) {
        const text = a.textContent?.trim();
        if (text && text.length > 2 && text.length < 15 && !/iniciar|sesion|login|buscar|search|susc|reg/i.test(text)) {
          navLinks.push(text.toUpperCase());
          if (navLinks.length >= 8) break;
        }
      }
    }
  } catch { }


  // Resolve Brand Info (Theme Color & Logo)
  let themeColor = '#0f172a'; // Default slate dark color
  let isDarkTheme = true;

  if (siteConfig?.brandColor) {
    themeColor = siteConfig.brandColor;
  } else {
    const metaTheme = doc.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    if (metaTheme && metaTheme.startsWith('#')) {
      themeColor = metaTheme;
    } else {
      try {
        const liveHeader = document.querySelector('header, .header, #header, nav');
        if (liveHeader) {
          const bgColor = window.getComputedStyle(liveHeader).backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const match = bgColor.match(/\d+/g);
            if (match && match.length >= 3) {
              const r = parseInt(match[0], 10);
              const g = parseInt(match[1], 10);
              const b = parseInt(match[2], 10);
              themeColor = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
          }
        }
      } catch { }
    }
  }

  // Calculate theme color luminance (dark vs light backgrounds)
  try {
    const hex = themeColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    isDarkTheme = luminance < 140;
  } catch {
    isDarkTheme = true;
  }

  // Extract or generate brand logo
  let logoHtml = '';
  let extractedFontFaceCSS = '';
  if (siteConfig?.logoAsset) {
    const filename = siteConfig.logoAsset.split('/').pop() || '';
    let logoSrc = BASE64_LOGOS[filename] || '';

    if (!logoSrc) {
      try {
        logoSrc = chrome.runtime.getURL(siteConfig.logoAsset);
      } catch (e) {
        console.warn('[PortalScrapper] Error resolving logo asset URL:', e);
      }
    }

    if (logoSrc) {
      logoHtml = `<img src="${logoSrc}" class="extracted-img-logo" style="height: 36px; max-height: 40px;" alt="${siteConfig.name}">`;
    } else {
      logoHtml = siteConfig.logoHtml || '';
    }
  } else if (siteConfig?.logoHtml) {
    logoHtml = siteConfig.logoHtml;
  } else {
    let foundLogo: Element | null = null;
    let foundTextLogo: Element | null = null;
    try {
      // Tier 1: Highly specific global main site logo selectors (images/SVGs)
      const specificLogoSelectors = [
        'a[class*="site-logo" i] img',
        'a[class*="site-logo" i] svg',
        'a[class*="main-logo" i] img',
        'a[class*="main-logo" i] svg',
        '[class*="site-logo" i] img',
        '[class*="site-logo" i] svg',
        'img[class*="site-logo" i]',
        'svg[class*="site-logo" i]',
        'img[class*="main-logo" i]',
        'svg[class*="main-logo" i]',
        '#logo img',
        '#logo svg',
        '.logo img',
        '.logo svg',
        'a[class*="brand" i] img',
        'a[class*="brand" i] svg',
        'img[src*="logo_infobae" i]',
      ];

      for (const sel of specificLogoSelectors) {
        foundLogo = document.querySelector(sel);
        if (foundLogo) break;
      }

      // Tier 2: Homepage Link Heuristic (Links pointing to the homepage that contain an image or SVG)
      if (!foundLogo) {
        const homeLinks = Array.from(document.querySelectorAll('a[href="/"], a[href="./"], a[href="' + window.location.origin + '/"], a[href="' + window.location.origin + '"]'));
        for (const link of homeLinks) {
          const classStr = link.className || '';
          const ariaLabel = link.getAttribute('aria-label') || '';
          const idStr = link.id || '';
          const hasDescendantLogoAttr = !!link.querySelector('[class*="logo" i], [id*="logo" i], [data-testid*="logo" i], [data-qa*="logo" i], [aria-label*="logo" i], [label*="logo" i], [alt*="logo" i], [aria-label*="homepage" i]');

          const isProbablyLogoLink = /logo|brand|home/i.test(classStr) ||
            /logo|home|brand/i.test(ariaLabel) ||
            /logo|brand/i.test(idStr) ||
            hasDescendantLogoAttr;

          if (isProbablyLogoLink) {
            // First check if it contains any SVG or img at all, since the link is identified as a logo link
            const svg = link.querySelector('svg');
            if (svg) {
              foundLogo = svg;
              break;
            }
            const img = link.querySelector('img');
            if (img) {
              foundLogo = img;
              break;
            }
          }

          // Fallback to strict child logo class matching within homepage links
          const img = link.querySelector('img[src*="logo" i], img[src*="brand" i], img[class*="logo" i], img[alt*="logo" i], img[alt*="brand" i]');
          if (img) {
            foundLogo = img;
            break;
          }
          const svg = link.querySelector('svg[class*="logo" i], svg[id*="logo" i]');
          if (svg) {
            foundLogo = svg;
            break;
          }
        }
      }

      // Tier 3: General logo class/src/alt matching inside header/topbar/nav
      if (!foundLogo) {
        const liveHeader = document.querySelector('header, .header, #header, nav, .nav, .sectionnav-container, [class*="header" i], [class*="nav" i]');
        if (liveHeader) {
          foundLogo = liveHeader.querySelector('img[src*="logo" i], img[src*="brand" i], img[class*="logo" i], svg[class*="logo" i], svg[id*="logo" i]');
          if (!foundLogo) {
            foundTextLogo = liveHeader.querySelector('a[aria-label*="logo" i], a[class*="BrandLogo" i], a[class*="LogoBase" i], [class*="BrandLogo" i]');
          }
        }
      }

      // Tier 4: Global loose search (excluding social sharing widgets)
      if (!foundLogo && !foundTextLogo) {
        const looseImgs = Array.from(document.querySelectorAll('img[src*="logo" i], img[class*="logo" i], img[alt*="logo" i]'));
        for (const img of looseImgs) {
          const src = img.getAttribute('src') || '';
          const alt = img.getAttribute('alt') || '';
          if (!/facebook|twitter|linkedin|whatsapp|instagram|youtube|social/i.test(src) && !/facebook|twitter|linkedin|whatsapp|instagram|youtube|social/i.test(alt)) {
            foundLogo = img;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[PortalScrapper] Error in generic logo resolution cascade:', e);
    }

    if (foundLogo) {
      try {
        const clonedLogo = foundLogo.cloneNode(true) as Element;
        clonedLogo.removeAttribute('style');

        // Copy computed colors/styles from live element to cloned element so that the standalone page has the correct colors
        try {
          const copyComputedStyles = (srcNode: Element, destNode: Element) => {
            const computed = window.getComputedStyle(srcNode);

            // Inline critical styling properties
            const fillVal = computed.fill;
            const strokeVal = computed.stroke;

            if (fillVal && fillVal !== 'none' && fillVal !== 'rgba(0, 0, 0, 0)') {
              destNode.setAttribute('fill', fillVal);
            }
            if (strokeVal && strokeVal !== 'none' && strokeVal !== 'rgba(0, 0, 0, 0)') {
              destNode.setAttribute('stroke', strokeVal);
            }

            // Recurse children
            const srcChildren = Array.from(srcNode.children);
            const destChildren = Array.from(destNode.children);
            for (let i = 0; i < srcChildren.length && i < destChildren.length; i++) {
              copyComputedStyles(srcChildren[i], destChildren[i]);
            }
          };
          copyComputedStyles(foundLogo, clonedLogo);
        } catch (styleCopyErr) {
          console.warn('Error inlining computed logo styles:', styleCopyErr);
        }

        if (clonedLogo.tagName.toLowerCase() === 'svg') {
          // If the original has width/height or viewBox, let's calculate its aspect ratio to set width properly
          const origWidthAttr = foundLogo.getAttribute('width');
          const origHeightAttr = foundLogo.getAttribute('height');
          const viewBox = foundLogo.getAttribute('viewBox');

          clonedLogo.setAttribute('height', '32');

          let aspectCalculated = false;
          if (origWidthAttr && origHeightAttr) {
            const w = parseFloat(origWidthAttr);
            const h = parseFloat(origHeightAttr);
            if (!isNaN(w) && !isNaN(h) && h > 0) {
              const scaledWidth = Math.round((w / h) * 32);
              clonedLogo.setAttribute('width', scaledWidth.toString());
              aspectCalculated = true;
            }
          }

          if (!aspectCalculated && viewBox) {
            const vbParts = viewBox.split(/[ ,]+/).map(parseFloat);
            if (vbParts.length === 4) {
              const vbW = vbParts[2];
              const vbH = vbParts[3];
              if (vbH > 0) {
                const scaledWidth = Math.round((vbW / vbH) * 32);
                clonedLogo.setAttribute('width', scaledWidth.toString());
                aspectCalculated = true;
              }
            }
          }

          if (!aspectCalculated) {
            // If aspect ratio is unknown, do not remove width if it has one, or default to auto
            clonedLogo.removeAttribute('width');
          }

          clonedLogo.classList.add('extracted-svg-logo');

          if (isDarkTheme) {
            clonedLogo.setAttribute('fill', '#ffffff');
            clonedLogo.querySelectorAll('*').forEach(child => {
              if (child.getAttribute('fill') && child.getAttribute('fill') !== 'none') {
                child.setAttribute('fill', '#ffffff');
              }
              if (child.getAttribute('stroke') && child.getAttribute('stroke') !== 'none') {
                child.setAttribute('stroke', '#ffffff');
              }
            });
          }
        } else {
          clonedLogo.setAttribute('height', '32');
          clonedLogo.removeAttribute('width');
          clonedLogo.classList.add('extracted-img-logo');
          let src = (foundLogo as any).src || clonedLogo.getAttribute('src') || '';
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            try {
              src = new URL(src, originalUrl).href;
            } catch { }
          }
          if (src && src.startsWith('http')) {
            try {
              const base64 = await toBase64DataUri(src);
              if (base64) {
                clonedLogo.setAttribute('src', base64);
              } else {
                clonedLogo.setAttribute('src', src);
              }
            } catch {
              clonedLogo.setAttribute('src', src);
            }
          }
        }
        logoHtml = clonedLogo.outerHTML;
      } catch {
        const nameCleaned = hostname.replace('www.', '').split('.')[0].toUpperCase();
        logoHtml = `<div class="brand-text-logo generic-font">${nameCleaned}</div>`;
      }
    } else if (foundTextLogo) {
      // Text-based logo found: extract its text and computed CSS font styles from the live page
      const logoText = foundTextLogo.textContent?.trim();
      if (logoText && logoText.length > 2 && logoText.length < 80) {
        try {
          const computed = window.getComputedStyle(foundTextLogo);
          const fontFamily = computed.fontFamily;
          const fontSize = computed.fontSize;
          const fontWeight = computed.fontWeight;
          const letterSpacing = computed.letterSpacing;
          const textTransform = computed.textTransform;
          const color = isDarkTheme ? '#ffffff' : '#0f172a';

          // Try to extract @font-face rules matching the logo's primary font family
          const fontFamilyPrimary = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          try {
            for (const sheet of Array.from(document.styleSheets)) {
              try {
                for (const rule of Array.from(sheet.cssRules)) {
                  if (rule instanceof CSSFontFaceRule) {
                    const ruleFontFamily = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                    if (ruleFontFamily === fontFamilyPrimary || fontFamilyPrimary.includes(ruleFontFamily)) {
                      extractedFontFaceCSS += rule.cssText + '\n';
                    }
                  }
                }
              } catch { } // CORS may block cross-origin stylesheet access — skip silently
            }
          } catch { }

          // Fallback: if cssRules didn't yield @font-face, fetch external stylesheets and parse them
          if (!extractedFontFaceCSS) {
            try {
              const linkEls = document.querySelectorAll('link[rel="stylesheet"]');
              for (const link of Array.from(linkEls)) {
                const href = link.getAttribute('href');
                if (!href) continue;
                try {
                  const sheetUrl = new URL(href, window.location.origin).href;
                  const resp = await fetch(sheetUrl, { credentials: 'omit' });
                  if (!resp.ok) continue;
                  const cssText = await resp.text();
                  // Find all @font-face blocks (handles multi-line rules)
                  const fontFaceRegex = /@font-face\s*\{[\s\S]*?\}/gi;
                  const matches = cssText.match(fontFaceRegex);
                  if (matches) {
                    for (const block of matches) {
                      // Check if this @font-face is for our logo font
                      const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";]+)/i);
                      if (familyMatch) {
                        const declaredFamily = familyMatch[1].trim();
                        if (declaredFamily === fontFamilyPrimary || fontFamilyPrimary.includes(declaredFamily)) {
                          // Resolve relative url() paths inside the @font-face to absolute URLs
                          const resolvedBlock = block.replace(/url\((['"]?)([^)'"]+)\1\)/gi, (_full, quote, relUrl) => {
                            try {
                              const absUrl = new URL(relUrl, sheetUrl).href;
                              return `url(${quote}${absUrl}${quote})`;
                            } catch {
                              return _full;
                            }
                          });
                          extractedFontFaceCSS += resolvedBlock + '\n';
                        }
                      }
                    }
                  }
                  if (extractedFontFaceCSS) break; // Found what we need, stop fetching more sheets
                } catch { } // Network/CORS error on individual sheet
              }
            } catch { }
          }

          // Build the logo with the page's real font, plus quality serif fallbacks
          const fallbackFontFamily = `${fontFamily}, 'Playfair Display', 'Times New Roman', serif`;

          logoHtml = `<div class="brand-text-logo extracted-text-logo" style="font-family: ${fallbackFontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; letter-spacing: ${letterSpacing}; text-transform: ${textTransform}; color: ${color};">${logoText}</div>`;
        } catch {
          logoHtml = `<div class="brand-text-logo generic-font">${logoText}</div>`;
        }
      } else {
        const nameCleaned = hostname.replace('www.', '').split('.')[0].toUpperCase();
        logoHtml = `<div class="brand-text-logo generic-font">${nameCleaned}</div>`;
      }
    } else {
      const nameCleaned = hostname.replace('www.', '').split('.')[0].toUpperCase();
      logoHtml = `<div class="brand-text-logo generic-font">${nameCleaned}</div>`;
    }
  }

  // Section Name
  let sectionName = extractedSection || '';


  const kickerHtml = (kickerVal && kickerVal.toUpperCase() !== sectionName.toUpperCase()) ? `
    <div class="article-kicker">${kickerVal}</div>
  ` : '';

  const subtitleHtml = subtitleVal ? `
    <div class="article-subtitle">${subtitleVal}</div>
  ` : '';

  // Nav bar links inside the subheader
  const navLinksText = navLinks.length > 0
    ? navLinks.join(' • ')
    : 'NACIONAL • INTERNACIONAL • OPINIÓN • ECONOMÍA • CIENCIA • TENDENCIAS • CULTURA';

  const resolvedBgColor = siteConfig?.contentBgColor || '#ffffff';
  const resolvedBodyFont = siteConfig?.bodyFontFamily || "'Lora', Georgia, serif";
  const resolvedTitleFont = siteConfig?.titleFontFamily || "'Playfair Display', 'Times New Roman', serif";

  const cleanSubtitle = (subtitleVal || '').replace(/"/g, '&quot;').replace(/[\r\n]+/g, ' ').trim();
  const jsonLdAuthor = (authorVal || '').replace(/"/g, '\\"').trim() || 'Redacción';
  const jsonLdTitle = title.replace(/"/g, '\\"');
  const jsonLdPublisher = sourceName.replace(/"/g, '\\"');
  const jsonLdImage = heroImageSrc ? `"${heroImageSrc}"` : '[]';

  // Compose the premium PrintFriendly snapshot HTML
  const finalHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${snapshotTitle}</title>
  <base href="${originalUrl}">

  <!-- SEO & Dynamic Previews (WhatsApp, Telegram, Facebook, Twitter, Slack, Discord) -->
  <meta name="description" content="${cleanSubtitle}">
  <meta property="og:title" content="${snapshotTitle}">
  <meta property="og:description" content="${cleanSubtitle}">
  ${heroImageSrc ? `<meta property="og:image" content="${heroImageSrc}">` : ''}
  <meta property="og:url" content="${originalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${sourceName}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${snapshotTitle}">
  <meta name="twitter:description" content="${cleanSubtitle}">
  ${heroImageSrc ? `<meta name="twitter:image" content="${heroImageSrc}">` : ''}

  <!-- Premium color accent for link preview sidebars (Telegram, Discord, Slack) -->
  <meta name="theme-color" content="${themeColor}">

  <!-- Schema.org Structured Metadata for Crawlers & Previews -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${jsonLdTitle}",
    "image": ${jsonLdImage.startsWith('"') ? `[${jsonLdImage}]` : '[]'},
    "datePublished": "${pageDate || new Date().toISOString()}",
    "author": [{
      "@type": "Person",
      "name": "${jsonLdAuthor}"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "${jsonLdPublisher}"
    }
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&family=Libre+Bodoni:wght@400;700&display=swap" rel="stylesheet">
  <script src="${chrome.runtime.getURL('dist/html2pdf.bundle.min.js')}"></script>
  <style>
    /* Extracted @font-face rules from source page */
    ${extractedFontFaceCSS}

    :root {
      --primary-color: #0f172a;
      --text-color: #1e293b;
      --bg-color: ${resolvedBgColor};
      --border-color: #e2e8f0;
      --meta-color: #64748b;
      --accent-color: #e11d48;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: ${resolvedBodyFont};
      color: #1e293b;
      background-color: ${resolvedBgColor};
      line-height: 1.65;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating Action Bar */
    .action-bar {
      position: sticky;
      top: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
    }

    .action-bar .brand {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-bar .buttons {
      display: flex;
      gap: 12px;
    }

    .btn {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background-color: #ffffff;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      outline: none;
    }

    .btn:hover {
      background-color: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }

    .btn-primary {
      background-color: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }

    .btn-primary:hover {
      background-color: #1e293b;
      border-color: #1e293b;
      color: #ffffff;
    }

    /* Masthead Layout */
    .portal-top-bar {
      background-color: ${themeColor};
      color: ${isDarkTheme ? '#ffffff' : '#0f172a'};
      padding: 14px 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-height: 58px;
      border-bottom: ${isDarkTheme ? 'none' : '1px solid #e2e8f0'};
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .brand-text-logo {
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-size: 28px;
      line-height: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .brand-text-logo.elpais-font {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      letter-spacing: 0.08em;
      color: #ffffff;
    }

    .brand-text-logo.milenio-font {
      font-family: 'Playfair Display', 'Times New Roman', serif;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #ffffff;
    }

    .brand-text-logo.generic-font {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
    }

    .brand-text-logo .registered {
      font-size: 14px;
      vertical-align: super;
      margin-left: 2px;
      font-weight: normal;
    }

    .extracted-svg-logo {
      max-height: 32px;
      width: auto;
      display: block;
    }

    .extracted-img-logo {
      max-height: 40px;
      width: auto;
      object-fit: contain;
      display: block;
    }

    .extracted-text-logo {
      line-height: 1;
      white-space: nowrap;
      text-decoration: none;
    }

    .portal-masthead {
      margin-bottom: 24px;
      text-align: center;
      width: 100%;
    }

    .portal-section-bar {
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .portal-section-title {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      line-height: 1;
      margin: 0;
      z-index: 10;
    }

    .portal-nav {
      display: none !important;
    }

    /* Content Container */
    .container {
      width: 95%;
      max-width: 1000px;
      margin: 30px auto;
      padding: 0 20px;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .container {
        width: 100%;
        margin: 10px auto;
        padding: 0 12px;
      }
      .portal-top-bar {
        padding: 10px 14px;
        min-height: 48px;
      }
      .brand-text-logo {
        font-size: 20px !important;
      }
      .extracted-svg-logo {
        max-height: 24px !important;
      }
      .extracted-img-logo {
        max-height: 28px !important;
      }
      .article-title {
        font-size: 22px !important;
        line-height: 1.3 !important;
        margin-bottom: 12px !important;
      }
      .article-subtitle {
        font-size: 14px !important;
        line-height: 1.45 !important;
        margin-bottom: 14px !important;
      }
      #readability-page-1 {
        font-size: 15px !important;
        line-height: 1.6 !important;
      }
      p {
        font-size: 15px !important;
        line-height: 1.6 !important;
        margin-bottom: 14px !important;
      }
    }

    /* Header styling */
    .article-header {
      margin-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 20px;
    }

    .article-kicker {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 14px;
      text-align: center;
    }

    .article-title {
      font-family: ${resolvedTitleFont};
      font-size: 30px;
      line-height: 1.25;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
      text-align: left;
    }

    .article-subtitle {
      font-family: ${resolvedBodyFont};
      font-size: 16px;
      line-height: 1.45;
      color: #475569;
      margin: 0 0 18px 0;
      font-weight: 400;
      text-align: left;
    }

    .article-meta {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-icon {
      font-size: 14px;
    }

    /* Reforma Specific Meta Styling */
    .reforma-meta {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin-top: 12px;
      text-align: left;
    }

    .reforma-meta-reading {
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .reforma-meta-author {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .reforma-meta-date {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 14px;
    }

    /* Circular Social Share Buttons matching Reforma */
    .reforma-social {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      margin-bottom: 8px;
    }

    .reforma-social .social-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #1e293b; /* dark blue/black circular background */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    }

    /* Draw simple SVG or CSS representations of social icons to match Reforma screenshot */
    .reforma-social .social-icon::before {
      content: '';
      display: block;
      width: 14px;
      height: 14px;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      filter: invert(1); /* make icons white */
    }

    .reforma-social .social-icon.fb::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 8H7v3h2v9h3v-9h3l.5-3H12V6c0-.88.39-1 1-1h2V2h-3c-2.9 0-5 1.55-5 4.5V8z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.tw::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.wa::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 1.98 14.124.954 11.5.952c-5.437 0-9.862 4.371-9.866 9.8 0 2.015.533 3.984 1.543 5.739l-.482 1.761 1.802-.472z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.mail::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.link::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'/%3E%3C/svg%3E");
    }

    /* Hero Image */
    .hero-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto 36px auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }

    .hero-image {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      max-height: 480px;
    }

    .article-body {
      font-size: 16px;
      color: #1e293b;
    }

    .article-body p {
      margin: 0 0 22px 0;
    }

    .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
      font-family: 'Playfair Display', serif;
      color: #0f172a;
      margin: 36px 0 18px 0;
      line-height: 1.3;
    }

    .article-body h2 {
      font-size: 26px;
    }

    .article-body h3 {
      font-size: 22px;
    }

    .article-body blockquote {
      border-left: 4px solid #e11d48;
      padding-left: 20px;
      margin: 28px 0;
      font-style: italic;
      color: #475569;
      background-color: #f8fafc;
      padding-top: 8px;
      padding-bottom: 8px;
      border-radius: 0 4px 4px 0;
    }

    .article-body img,
    .article-body [data-type="inset"],
    .article-body .media-layout,
    .article-body iframe,
    .article-body .origami-wrapper {
      max-width: 580px;
      height: auto;
      border-radius: 6px;
      margin: 28px auto;
      display: block;
    }

    .article-body ul, .article-body ol {
      margin: 0 0 22px 0;
      padding-left: 24px;
    }

    .article-body li {
      margin-bottom: 8px;
    }

    .original-url-footer {
      margin-top: 60px;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      padding-bottom: 40px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      text-align: center;
      line-height: 1.5;
    }

    .original-url-footer a {
      color: #0f172a;
      text-decoration: underline;
    }

    /* Avoid breaking paragraphs, blockquotes, headers and images across PDF pages */
    p, blockquote, img, .hero-container, .portal-top-bar, .article-header, .original-url-footer {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Print Specific Stylesheet */
    @media print {
      body {
        font-size: 12pt;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .action-bar {
        display: none !important;
      }
      .portal-top-bar {
        background-color: ${themeColor} !important;
        color: ${isDarkTheme ? '#ffffff' : '#0f172a'} !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        display: flex !important;
      }
      .container {
        max-width: 100%;
        margin: 0;
        padding: 0;
      }
      .article-title {
        font-size: 26pt;
      }
      .article-body {
        font-size: 11pt;
      }
      .hero-image {
        max-height: 380px;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div class="brand">
      <span>📰 PortalScrapper Snapshot</span>
      <span id="snapshot-status" style="margin-left: 15px; font-size: 13px; color: #475569; font-weight: normal; display: none;"></span>
    </div>
    <div class="buttons">
      <button class="btn" id="btn-snapshot-close">❌ Cerrar</button>
      <button class="btn" id="btn-snapshot-save">💾 Guardar HTML</button>
      <button class="btn btn-primary" id="btn-snapshot-print">🖨️ Imprimir</button>
      <button class="btn btn-primary" id="btn-snapshot-upload-pdf" style="background: #e11d48; color: white; border-color: #e11d48;">📤 Guardar PDF</button>
    </div>
  </div>

  <div id="pdf-capture-wrapper" style="width: 800px; margin: 0 auto; padding: 0; background: #ffffff; box-sizing: border-box; overflow: hidden; position: relative;">
    <div class="portal-top-bar">
      ${logoHtml}
    </div>

    <div class="container">
      <div class="portal-masthead">
        ${sectionName ? `
        <div class="portal-section-bar">
          <h2 class="portal-section-title">${sectionName}</h2>
          <div class="portal-nav">${navLinksText}</div>
        </div>
        ` : ''}
        ${kickerHtml}
      </div>

      <div class="article-header">
        <h1 class="article-title">${title}</h1>
        ${subtitleHtml}
        ${metaBlockHtml}
      </div>

      ${heroImageHtml}

      <div class="article-body">
        ${parsedArticle.content}
      </div>

      <div class="original-url-footer">
        Documento generado por Medialog.<br>
        Nota original: <a href="${originalUrl}" target="_blank">${originalUrl}</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    html: finalHtml,
    title: snapshotTitle,
    originalUrl
  };
}
