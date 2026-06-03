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
    },
    brandColor: '#ffffff',
    logoHtml: '<div class="brand-text-logo" style="font-family: \'Libre Bodoni\', \'Playfair Display\', \'Times New Roman\', serif; font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; line-height: 1;">The Wall Street Journal</div>',
    logoAsset: 'src/assets/logos/wsj.png'
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
  'eleconomista.com': {
    name: 'El Economista',
    hostPatterns: ['eleconomista.com.mx', 'eleconomista.com'],
    selectors: {
      title: 'h1.article-title, h1, [class*="title" i]',
      author: '.article-author, .author, [itemprop="author"]',
      date: 'time[datetime], .article-date',
      content: '.article-body p, article p, [class*="body" i] p',
      paywall: '.paywall, #paywall'
    },
    brandColor: '#1a1a1a',
    logoHtml: '<svg xmlns="http://www.w3.org/2000/svg" width="172" height="16" version="1.1" viewBox="0 0 439 40" style="display: block; max-height: 24px; width: auto;"><defs><style>.cls-1{fill:#fff;}.cls-2{fill:#00b1eb;}</style></defs><g><g id="Layer_1"><g id="Layer_1-2" data-name="Layer_1"><path class="cls-1" d="M417.5,9.7l4.8,14.6h-9.7l4.7-14.6s.2,0,.2,0ZM409.2,35.1l3.2-9.9h10.3l4,11.8-3.6.4v.6h15.8v-.6l-2.2-.4-14.1-35.1-4.8,3.3-9.7,29.9-5.5,2.3v.6h12.1v-.6l-5.5-2.3h0Z"></path><polygon class="cls-1" points="91.5 37.1 91.5 3.2 94.6 2.9 94.6 2.1 80.2 2.1 80.2 2.9 83.3 3.2 83.3 36.8 80.2 37.1 80.2 38 107.4 38 107.9 29.1 107.4 29.1 101.5 36.8 91.5 37.1"></polygon><polygon class="cls-1" points="133.1 2.9 142.6 3.2 148.2 10.9 148.7 10.9 148.5 2.1 121.8 2.1 121.8 2.9 124.9 3.2 124.9 36.8 121.8 37.1 121.8 38 149 38 149.5 29.1 149 29.1 143.1 36.8 133.1 37.1 133.1 20.5 140.3 20.8 143.1 26.4 143.6 26.4 143.6 13.3 143.1 13.3 140.3 19.2 133.1 19.5 133.1 2.9"></polygon><polygon class="cls-1" points="335.2 37 335.2 38 349.4 38 349.4 37 346.3 36.6 346.3 3.3 349.4 2.9 349.4 2.1 335.2 2.1 335.2 2.9 338.2 3.3 338.2 36.6 335.2 37"></polygon><polygon class="cls-1" points="61.1 2.9 70.5 3.2 76.1 10.9 76.6 10.9 76.4 2.1 49.7 2.1 49.7 2.9 52.8 3.2 52.8 36.8 49.7 37.1 49.7 38 76.9 38 77.4 29.1 76.9 29.1 71 36.8 61.1 37.1 61.1 20.5 68.2 20.8 71 26.4 71.5 26.4 71.5 13.3 71 13.3 68.2 19.2 61.1 19.5 61.1 2.9"></polygon><path class="cls-1" d="M191.2,20c0-11.5,3-17.3,9.5-17.3s9.5,5.8,9.5,17.3-3,17.3-9.5,17.3-9.5-5.8-9.5-17.3M182.6,20c0,10.5,8.6,18.1,18.1,18.1s18.1-7.6,18.1-18.1S210.2,1.9,200.7,1.9s-18.1,7.6-18.1,18.1"></path><path class="cls-1" d="M180,35l.5-8.5h-.5l-3.5,5.9c-1,1.8-3.8,4.9-7,4.9-7,0-10-5.8-10-17.3s3.5-17.3,10-17.3,5.8,3.1,6.8,4.9l3.5,5.9h.5l-.3-8.5c-2-1.3-6.5-3.1-11.6-3.1-10.6,0-17.6,7.6-17.6,18.1s7,18.1,17.6,18.1,9.5-1.9,11.6-3.1"></path><polygon class="cls-1" points="246.7 24.2 231.6 2.1 218.9 2.1 218.9 2.9 224.3 3.1 224.3 35.1 218.9 37.3 218.9 38 231.1 38 231.1 37.3 225.4 35.1 225.2 7.7 225.5 7.7 246.8 38.1 248 38.1 248 4.9 253.5 2.7 253.5 2.2 241.3 2.2 241.3 2.7 246.9 4.9 247.1 24.2 246.7 24.2"></polygon><path class="cls-1" d="M262.5,20c0-11.5,3-17.3,9.5-17.3s9.5,5.8,9.5,17.3-3,17.3-9.5,17.3-9.5-5.8-9.5-17.3M253.9,20c0,10.5,8.6,18.1,18.1,18.1s18.1-7.6,18.1-18.1-8.6-18.1-18.1-18.1-18.1,7.6-18.1,18.1"></path><polygon class="cls-1" points="313.8 24.7 304.2 2.1 290.7 2.1 290.7 2.9 296.1 3.3 296.1 35 290.7 37.3 290.7 37.9 302.9 37.9 302.9 37.3 297.2 35 297 7.7 297.3 7.7 310 37.8 311.1 37.8 320.8 5.7 321.2 5.7 321.2 36.7 318.1 37.2 318.1 38 332.4 38 332.4 37.2 329.3 36.7 329.3 3.2 332.4 2.8 332.4 2.1 321 2.1 314.1 24.7 313.8 24.7"></polygon><path class="cls-1" d="M354.2,35c2.8,1.8,6,3.1,9.7,3.1,6.7,0,12.7-3.6,12.7-11.1s-5.8-9.8-10.8-11.8c-3.6-1.5-7-3.3-7-7s4.5-5.5,6.2-5.5c3.4,0,5.7,2,7.9,6.8.5,1.1,1,2.2,1.5,3.3h.5l-.3-10.5h-.5l-.5,2.1c-2.1-1.4-5.6-2.4-8.7-2.4-6.9,0-12.4,3.7-12.4,10.1s5.1,8.9,10.2,11c3.8,1.6,7.6,3.8,7.6,8s-3.3,6.3-6.4,6.3-6.9-2.6-9-7.3c-.5-1.2-1-2.4-1.5-3.5h-.5l.2,11.3h.5l.5-2.8h0Z"></path><polygon class="cls-1" points="378.4 10.8 378.9 10.8 384.5 3.3 388.5 3 388.5 36.8 385.5 37.2 385.5 37.9 399.7 37.9 399.7 37.2 396.7 36.8 396.7 3 400.7 3.3 406.3 10.8 406.8 10.8 406.6 2.1 378.6 2.1 378.4 10.8"></polygon><path class="cls-2" d="M41.3,16.3h0s0-.1,0-.1c0,0,0,0,0,.1h0c-1.9,7-7.4,12.7-14.9,14.6-11.1,2.7-22.3-6.5-24.4-14.8-.4-2.2-.2-2.3-.1-3.1v.6c.4,2.2,1.4,4.4,3.1,6.3,5.6,6.3,16.8,8.3,24.9,3.8,8-4.4,9.8-13.2,4.1-19.7C32.3,2.3,30.5,1,28.5,0h0S28.3,0,28.3.2s0,0,0,.1h0c4.8,6,3.8,14.2-2.5,18.7-6.6,4.7-16.2,3.4-21.4-2.5-1.1-1.2-2-2.8-2.3-3.7,0-.2,0-.5-.2-.7h0c1.2,1,4.9,3.6,9.7,3.6,15.5,0,14-14.6,3.7-14.7-2.9,0-6.1,1.1-9.4,3.9-1.8,1.9-3.2,3.6-4.4,6.6h0s-.8,1.9-1.1,3.4c0,.4-.2.9-.2,1.3C.1,16.9,0,17.4,0,18.1c-.6,11.2,8.1,21.3,19.7,21.8,7.4.4,14.1-3.2,18.1-8.9h0c-4.5,5-11.6,7.7-19,6.6C8.3,36,1,27.3.6,17.8c0-.5,0-1.1.3-2.5h0c0,.6,0,1.3.2,2,1.8,10.9,12.3,19,23.5,17.4,9.4-1.4,16.2-9.1,16.7-18.4h0"></path></g></g></g></svg>',
    contentBgColor: '#fdf8eb',
    bodyFontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    titleFontFamily: "'Playfair Display', 'Lora', serif"
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
    },
    brandColor: '#ffffff',
    logoHtml: '<img src="https://static.elpais.com/dist/resources/images/logos/primary/el-pais-50.svg" alt="EL PAÍS" class="extracted-img-logo" style="height: 30px;" />'
  },
  'eluniversal.com.mx': {
    name: 'El Universal',
    hostPatterns: ['eluniversal.com.mx'],
    selectors: {
      title: 'h1.title, h1.article-title',
      author: '.sc__author-nota, .author',
      date: 'time[datetime], .sc__author--date',
      content: '.sc__font-paragraph, .sc__header, .sc__paragraph-list li, .story-content p, .timeline-card p',
      paywall: '.paywall, .premium-banner'
    },
    brandColor: '#ffffff'
  },
  'reforma.com': {
    name: 'Reforma',
    hostPatterns: ['reforma.com'],
    selectors: {
      title: 'h1.article-title, #MainContent h1, h1.title',
      author: '.author, .article-author, .byline, [name="cXenseParse:author"]',
      date: 'time[datetime], .date, meta[name="cXenseParse:recs:publishtime"]',
      content: '.gr_texto_articulo, .article-body p, #article-body p',
      section: '.article-kicker, [class*="kicker" i]',
      paywall: '.paywall, .subscription-wall, #caja_suscripcion'
    },
    brandColor: '#ffffff',
    logoAsset: 'src/assets/logos/reforma.png',
    bodyFontFamily: "'Lora', Georgia, serif",
    titleFontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
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
    },
    brandColor: '#b31b21',
    logoHtml: '<div class="brand-text-logo milenio-font">MILENIO <span class="registered">®</span></div>'
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
      .filter((n) => {
        const el = n as HTMLElement;
        const isSummary = el.closest('[class*="QuickSummary" i], [class*="quick-summary" i], [data-testid*="quick-summary" i], [class*="KeyPoints" i], [class*="key-points" i], [class*="SummaryBullets" i], [class*="summary-bullets" i], [class*="AiSummary" i], [class*="ai-summary" i]');
        return !isSummary;
      })
      .map((n) => {
        const el = n as HTMLElement;
        return (el.innerText || el.textContent || '').trim();
      })
      .filter(Boolean)
      .join('\n\n');
  }

  const nodes = document.querySelectorAll(selector);
  return Array.from(nodes)
    .filter((n) => {
      const el = n as HTMLElement;
      const isSummary = el.closest('[class*="QuickSummary" i], [class*="quick-summary" i], [data-testid*="quick-summary" i], [class*="KeyPoints" i], [class*="key-points" i], [class*="SummaryBullets" i], [class*="summary-bullets" i], [class*="AiSummary" i], [class*="ai-summary" i]');
      return !isSummary;
    })
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

  // 1b. Deduplicate summary bullets at the start and filter out leading noise particles (like "and")
  const processed: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const p = filtered[i];
    const isDuplicateSummaryBullet = i < 8 && p.length > 25 && filtered.slice(i + 1).some(other => other === p);
    
    // Skip single words/leftovers like "and" at the very beginning of the text
    if (i < 3 && (p.toLowerCase() === 'and' || p.toLowerCase() === 'a' || p.length < 5)) {
      continue;
    }
    
    if (!isDuplicateSummaryBullet) {
      processed.push(p);
    }
  }

  if (processed.length === 0) return '';

  // 2. Find the start index (first real paragraph of summary or story)
  let startIndex = 0;
  for (let i = 0; i < processed.length; i++) {
    const p = processed[i];
    
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
  // First, scan forward from startIndex to find any definitive footer or consent notices
  // which indicate the absolute end of the article's story content. Discard that paragraph and all subsequent text.
  let endIndex = processed.length - 1;
  for (let i = startIndex; i < processed.length; i++) {
    const p = processed[i].toLowerCase();
    if (
      p.includes('submitting your response') ||
      p.includes('submitting your responses') ||
      p.includes('consent to dow jones') ||
      p.includes('dow jones processing') ||
      p.includes('special categories of') ||
      p.includes('questionnaire') ||
      p.includes('write to ') ||
      (p.includes('contact ') && p.includes('@')) ||
      (p.includes('appeared in the ') && p.includes('print edition')) ||
      p.includes('corrections & amplifications') ||
      p.includes('copyright ©') ||
      p.includes('all rights reserved') ||
      p.includes('dow jones & company')
    ) {
      endIndex = i - 1;
      break;
    }
  }

  // If we didn't find an explicit cutoff point above, fall back to the standard backward scanner
  if (endIndex === processed.length - 1) {
    for (let i = processed.length - 1; i >= startIndex; i--) {
      const p = processed[i];
      
      // Skip copyright notices
      if (p.includes('Copyright ©') || p.includes('All Rights Reserved') || p.includes('Dow Jones & Company')) {
        continue;
      }
      
      // Skip author biographies
      if (p.match(/is a rewrite editor/i) || p.match(/is a reporter/i) || p.includes('rewrite editor at The Wall Street Journal')) {
        continue;
      }
      
      // Skip "Write to ..." or "Contact ..." footers (often containing email addresses)
      if (p.toLowerCase().includes('write to ') || (p.toLowerCase().includes('contact ') && p.includes('@'))) {
        continue;
      }

      // Skip "Appeared in the ... print edition as ..." footers
      if (p.includes('Appeared in the ') && p.includes('print edition')) {
        continue;
      }

      // Skip contributor credits
      if (p.toLowerCase().includes('contributed to this article')) {
        continue;
      }

      // Skip corrections and amplifications
      if (p.includes('Corrections & Amplifications')) {
        continue;
      }

      // Skip questionnaire consent or data processing notices
      if (
        p.toLowerCase().includes('submitting your response') ||
        p.toLowerCase().includes('consent to dow jones') ||
        p.toLowerCase().includes('questionnaire')
      ) {
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
  }

  // If search got crossed, return everything filtered
  if (startIndex > endIndex) {
    return processed.join('\n\n');
  }

  // Slice list to get exactly the article contents
  const sliced = processed.slice(startIndex, endIndex + 1);

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
  
  const seenTexts = new Set<string>();
  const filtered = paragraphs.filter(p => {
    const lower = p.toLowerCase();
    
    // Quitar marcas explícitas de publicidad
    if (
      lower === '[publicidad]' || 
      lower === '[ publicidad ]' || 
      lower === 'publicidad' || 
      /^\[\s*publicidad\s*\]$/i.test(p)
    ) {
      return false;
    }
    
    // Quitar spam de Whatsapp y boletines
    if (lower.includes('únete a nuestro canal') && lower.includes('whatsapp')) return false;
    if (lower.includes('recibir directo en tu correo') && lower.includes('suscríbete')) return false;
    if (lower.includes('recibe las noticias más relevantes del día')) return false;
    
    // Quitar hipervínculos cruzados como "Lee también" / "Leer también"
    if (
      lower.startsWith('lee también') || 
      lower.startsWith('lee tambien') || 
      lower.startsWith('leer también') || 
      lower.startsWith('leer tambien') || 
      lower.startsWith('lee aquí la nota completa') || 
      lower.startsWith('lee aqui la nota completa')
    ) {
      return false;
    }
    
    // Quitar rastro de reproductores de video (Video Player Accessibility strings y controles)
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
      (lower.includes('adchoices') && p.length < 30)
    ) {
      return false;
    }
    
    // Eliminar párrafos duplicados
    if (p.length > 15) {
      if (seenTexts.has(p)) {
        return false;
      }
      seenTexts.add(p);
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
