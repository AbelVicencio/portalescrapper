import { ExtractorResult } from './base';
import { SiteConfig } from '../types';

export const SITE_CONFIGS: Record<string, SiteConfig> = {
  'wsj.com': {
    name: 'Wall Street Journal',
    hostPatterns: ['wsj.com'],
    selectors: {
      title: 'h1.wsj-article-headline, h1[class*="StyledHeadline"], h1[data-testid="headline"]',
      author: '.author-name, [class*="AuthorName"], [data-testid="author-name"]',
      date: 'time[datetime]',
      content: '.article-content p, [class*="ArticleBody"] p, section[name="articleBody"] p',
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
      title: '.article-title h1, .article-headline, h1',
      author: '.article-author, .byline',
      date: '.article-date, time[datetime]',
      content: '.article-body p, .article-text p',
      paywall: ''
    }
  }
};

function querySelectorText(selector: string): string {
  const el = document.querySelector(selector);
  return (el?.textContent || '').trim();
}

function collectText(selector: string): string {
  const nodes = document.querySelectorAll(selector);
  return Array.from(nodes)
    .map((n) => n.textContent?.trim())
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
  result.content = collectText(sel.content) || undefined;
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
