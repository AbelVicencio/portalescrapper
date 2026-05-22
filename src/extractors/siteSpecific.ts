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
      content: 'article p, .a_c p, .article-body p',
      paywall: '.a_tp, #ctn_freemium_article, .mura-wall, .paywall'
    }
  },
  'reforma.com': {
    name: 'Reforma',
    hostPatterns: ['reforma.com'],
    selectors: {
      title: 'h1.article-title, #MainContent h1, h1.title',
      author: '.author, .article-author, .byline',
      date: 'time[datetime], .date',
      content: '.article-body p, #article-body p',
      paywall: '.paywall, .subscription-wall'
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
      .map((n) => n.textContent?.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  const nodes = document.querySelectorAll(selector);
  return Array.from(nodes)
    .map((n) => n.textContent?.trim())
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
