"use strict";
(() => {
  // src/extractors/base.ts
  function mergeResults(results) {
    const merged = {};
    let highestConfidence = 0;
    for (const r of results) {
      if (r.confidence > highestConfidence) {
        highestConfidence = r.confidence;
      }
      if (r.title && !merged.superabstract) merged.superabstract = r.title;
      if (r.author && !merged.autor) merged.autor = r.author;
      if (r.date && !merged.fecha) merged.fecha = r.date;
      if (r.content && !merged.texto) merged.texto = r.content;
      if (r.subtitle && !merged.subtitulo) merged.subtitulo = r.subtitle;
      if (r.section && !merged.seccion) merged.seccion = r.section;
      if (r.imageUrls?.length && !merged.imageUrls) merged.imageUrls = r.imageUrls;
      if (r.url && !merged.url) merged.url = r.url;
      if (r.paywallDetected) merged.paywallDetected = true;
    }
    merged.confidence = highestConfidence;
    if (!merged.paywallDetected) merged.paywallDetected = false;
    if (!merged.isFullContent) merged.isFullContent = (merged.texto?.length || 0) > 200;
    return merged;
  }

  // src/extractors/jsonld.ts
  function extractJsonLd() {
    const result = { method: "json-ld", confidence: 0 };
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of Array.from(scripts)) {
        let data;
        try {
          data = JSON.parse(script.textContent || "");
        } catch {
          continue;
        }
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const type = item["@type"];
          if (type === "NewsArticle" || type === "Article" || type === "ReportageNewsArticle" || Array.isArray(type) && type.some((t) => ["NewsArticle", "Article"].includes(t))) {
            result.title = item.headline || item.name || result.title;
            result.date = item.datePublished || result.date;
            result.content = item.articleBody || result.content;
            result.author = typeof item.author === "object" ? item.author?.name || item.author?.[0]?.name : item.author || result.author;
            result.publisherName = item.publisher?.name || result.publisherName;
            result.publisherLogo = item.publisher?.logo?.url || result.publisherLogo;
            result.imageUrls = item.image ? typeof item.image === "string" ? [item.image] : Array.isArray(item.image) ? item.image.map((i) => typeof i === "string" ? i : i.url) : [] : result.imageUrls;
            result.confidence = 0.95;
          }
          if (item["@graph"]) {
            for (const g of item["@graph"]) {
              if (g["@type"] === "NewsArticle" || g["@type"] === "Article") {
                result.title = g.headline || g.name || result.title;
                result.date = g.datePublished || result.date;
                result.content = g.articleBody || result.content;
                result.confidence = Math.max(result.confidence, 0.9);
              }
            }
          }
        }
      }
    } catch (e) {
    }
    return result;
  }

  // src/extractors/meta.ts
  function extractMetaTags() {
    const res = { method: "meta-tags", confidence: 0.65 };
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
    const twTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content");
    res.title = ogTitle || twTitle || void 0;
    res.content = ogDesc || void 0;
    res.url = ogUrl || void 0;
    if (ogImage) res.imageUrls = [ogImage];
    const author = document.querySelector('meta[name="author"]')?.getAttribute("content");
    if (author) res.author = author;
    const pub = document.querySelector('meta[property="article:published_time"]')?.getAttribute("content");
    if (pub) res.date = pub;
    const section = document.querySelector('meta[property="article:section"]')?.getAttribute("content");
    if (section) res.section = section;
    const tags = Array.from(document.querySelectorAll('meta[property="article:tag"]')).map((m) => m.getAttribute("content")).filter(Boolean);
    if (tags.length) res.content = (res.content || "") + "\n\nTags: " + tags.join(", ");
    res.confidence = res.title || res.content ? 0.75 : 0.5;
    return res;
  }

  // src/extractors/siteSpecific.ts
  var SITE_CONFIGS = {
    "wsj.com": {
      name: "Wall Street Journal",
      hostPatterns: ["wsj.com"],
      selectors: {
        title: 'h1.wsj-article-headline, h1[class*="StyledHeadline"], h1[data-testid="headline"]',
        author: '.author-name, [class*="AuthorName"], [data-testid="author-name"]',
        date: "time[datetime]",
        content: '.article-content p, [class*="ArticleBody"] p, section[name="articleBody"] p',
        paywall: ".wsj-snippet-login, #cx-snippet-overlay, .paywall-container, #gateway-content"
      }
    },
    "nytimes.com": {
      name: "New York Times",
      hostPatterns: ["nytimes.com"],
      selectors: {
        title: 'h1[data-testid="headline"], h1.e1h9f4f0',
        author: '[class*="byline"] a, span[class*="last-byline"], [data-testid="byline"]',
        date: "time[datetime]",
        content: 'section[name="articleBody"] p, .article-body p',
        paywall: '#gateway-content, [data-testid="inline-message"], .paywall-container'
      }
    },
    "reuters.com": {
      name: "Reuters",
      hostPatterns: ["reuters.com"],
      selectors: {
        title: 'h1[data-testid="Heading"], h1.article-header__title',
        author: '[data-testid="AuthorName"], a[href*="/authors/"]',
        date: "time[datetime]",
        content: '[data-testid*="paragraph"], .article-body__content p, .StandardArticleBody__article-body p',
        paywall: ".paywall-container"
      }
    },
    "ft.com": {
      name: "Financial Times",
      hostPatterns: ["ft.com"],
      selectors: {
        title: ".article-headline, .topper__headline, h1",
        author: ".article__author-name, .topper__standfirst, .author-name",
        date: "time[datetime], .article-info__timestamp",
        content: ".article__content-body p, .body-content p, .article-body p",
        paywall: ".barrier, .o-barrier, .login-overlay"
      }
    },
    "washingtonpost.com": {
      name: "Washington Post",
      hostPatterns: ["washingtonpost.com"],
      selectors: {
        title: 'h1[data-qa="headline"], h1.headline',
        author: '.author-name a, [data-qa="author-name"]',
        date: 'time[datetime], [data-qa="display-date"]',
        content: '.article-body p, [data-qa="article-body"] p',
        paywall: ".paywall-overlay, #paywall-offer"
      }
    },
    "elpais.com": {
      name: "El Pa\xEDs",
      hostPatterns: ["elpais.com"],
      selectors: {
        title: "h1.a_t, h1.c_t, h1.article-header__title",
        author: '.a_md_a_n, .author-name, [data-testid="author"]',
        date: "time[datetime]",
        content: "article p, .a_c p, .article-body p",
        paywall: ".a_tp, #ctn_freemium_article, .mura-wall, .paywall"
      }
    },
    "reforma.com": {
      name: "Reforma",
      hostPatterns: ["reforma.com"],
      selectors: {
        title: "h1.article-title, #MainContent h1, h1.title",
        author: ".author, .article-author, .byline",
        date: "time[datetime], .date",
        content: ".article-body p, #article-body p",
        paywall: ".paywall, .subscription-wall"
      }
    },
    "milenio.com": {
      name: "Milenio",
      hostPatterns: ["milenio.com"],
      selectors: {
        title: "h1.content-title, h1.title, .article-title",
        author: '.author-name, .content-author, [data-testid="author-name"]',
        date: "time[datetime]",
        content: ".content-body p, .article-body p",
        paywall: ".paywall, .subscription-overlay"
      }
    },
    "pressreader.com": {
      name: "PressReader",
      hostPatterns: ["pressreader.com"],
      selectors: {
        // PressReader es una SPA — estas clases se renderizan dinámicamente.
        // El Text View es el más accesible para extracción.
        title: [
          ".article-title",
          ".v-textview h1",
          ".text-view-title",
          ".article-headline",
          '[class*="articleTitle"]',
          '[class*="ArticleTitle"]',
          ".content-title",
          "h1"
        ].join(", "),
        author: [
          ".article-author",
          ".v-textview .byline",
          '[class*="articleAuthor"]',
          '[class*="author"]',
          ".byline"
        ].join(", "),
        date: [
          ".article-date",
          ".v-textview .date",
          '[class*="articleDate"]',
          "time[datetime]"
        ].join(", "),
        content: [
          ".v-textview .body p",
          ".v-textview p",
          ".text-view-content p",
          ".article-body p",
          ".article-text p",
          '[class*="articleBody"] p',
          '[class*="ArticleBody"] p',
          '[class*="article-content"] p',
          ".content-body p"
        ].join(", "),
        paywall: ""
      }
    }
  };
  function querySelectorText(selector) {
    if (!selector) return "";
    const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      try {
        const el = document.querySelector(part);
        if (el) {
          let text = (el.textContent || "").trim();
          text = text.replace(/^Article(?=[A-ZÁÉÍÓÚÑÜ“”"'])/, "");
          if (text.length > 0) return text;
        }
      } catch {
      }
    }
    return "";
  }
  function collectText(selector) {
    const nodes = document.querySelectorAll(selector);
    return Array.from(nodes).map((n) => n.textContent?.trim()).filter(Boolean).join("\n\n");
  }
  function extractSiteSpecific(host) {
    const result = { method: "site-specific", confidence: 0 };
    const entry = Object.values(SITE_CONFIGS).find(
      (cfg) => cfg.hostPatterns.some((p) => host.includes(p))
    );
    if (!entry) return result;
    const sel = entry.selectors;
    result.title = querySelectorText(sel.title) || void 0;
    result.author = querySelectorText(sel.author) || void 0;
    result.date = querySelectorText(sel.date) || void 0;
    result.content = collectText(sel.content) || void 0;
    result.section = sel.section ? querySelectorText(sel.section) : void 0;
    result.subtitle = sel.subtitle ? querySelectorText(sel.subtitle) : void 0;
    if (sel.paywall) {
      const pw = document.querySelector(sel.paywall);
      result.paywallDetected = Boolean(pw);
    } else {
      result.paywallDetected = false;
    }
    result.confidence = result.title || result.content ? 0.85 : 0.4;
    return result;
  }

  // src/extractors/generic.ts
  var NOISE_PATTERNS = /nav|sidebar|footer|header|menu|breadcrumb|comment|social|share|related|widget|promo|advert|ad-|sponsor|newsletter|popup|modal|cookie|consent|signup|login|toolbar|pagination|carousel|gallery-thumbs|trending|most-read|also-read|recomend/i;
  var ARTICLE_CONTAINER_SELECTORS = [
    // Estándar HTML5 semántico
    "article",
    '[role="article"]',
    "main",
    '[role="main"]',
    // Microdata / Schema.org
    '[itemprop="articleBody"]',
    '[itemtype*="schema.org/Article"]',
    '[itemtype*="schema.org/NewsArticle"]',
    // Patrones de CMS comunes (WordPress, Drupal, etc.)
    ".article-body",
    ".article-content",
    ".article__body",
    ".article__content",
    ".story-body",
    ".story-content",
    ".post-body",
    ".post-content",
    ".entry-content",
    ".content-body",
    ".content-article",
    ".field-body",
    ".text-article",
    ".nota-body",
    ".nota-content",
    // Patrones genéricos con data attributes
    '[data-testid*="article"]',
    '[data-testid*="story"]',
    '[data-component="text-block"]',
    // Selectores específicos de PressReader y visor de periódicos
    ".article-text",
    ".article-body-text",
    ".reading-body"
  ];
  var TITLE_SELECTORS = [
    'h1[itemprop="headline"]',
    'h1[data-testid="headline"]',
    'h1[data-testid*="title"]',
    "article h1",
    "main h1",
    '[role="main"] h1',
    ".article-title h1",
    ".article-headline",
    ".story-headline",
    ".headline",
    "h1.title",
    "h1.entry-title",
    "h1.post-title",
    "h1"
  ];
  var AUTHOR_SELECTORS = [
    '[rel="author"]',
    '[itemprop="author"] [itemprop="name"]',
    '[itemprop="author"]',
    '[data-testid="author-name"]',
    '[data-testid*="byline"]',
    '[data-testid*="author"]',
    'a[href*="/author/"]',
    'a[href*="/authors/"]',
    'a[href*="/autor/"]',
    ".author-name",
    ".author",
    ".byline-name",
    ".byline a",
    ".byline",
    ".article-author",
    ".story-author",
    ".post-author",
    ".writer-name",
    ".contributor-name",
    'span[class*="author"]',
    'span[class*="byline"]',
    'p[class*="author"]'
  ];
  var DATE_SELECTORS = [
    "time[datetime]",
    '[itemprop="datePublished"]',
    '[data-testid*="timestamp"]',
    '[data-testid*="date"]',
    ".article-date",
    ".story-date",
    ".publish-date",
    ".published-date",
    ".post-date",
    ".date-published",
    ".article-timestamp",
    ".timestamp",
    'span[class*="date"]'
  ];
  function queryFirst(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          let text = (el.textContent || "").trim();
          text = text.replace(/^Article(?=[A-ZÁÉÍÓÚÑÜ“”"'])/, "");
          if (text.length > 0) return text;
        }
      } catch {
      }
    }
    return "";
  }
  function queryDate() {
    const timeEl = document.querySelector("time[datetime]");
    if (timeEl) {
      const dt = timeEl.getAttribute("datetime");
      if (dt) return dt;
      const text = (timeEl.textContent || "").trim();
      if (text) return text;
    }
    const itempropEl = document.querySelector('[itemprop="datePublished"]');
    if (itempropEl) {
      const content = itempropEl.getAttribute("content") || itempropEl.getAttribute("datetime");
      if (content) return content;
      const text = (itempropEl.textContent || "").trim();
      if (text) return text;
    }
    for (const sel of DATE_SELECTORS.slice(2)) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = (el.textContent || "").trim();
          if (text.length > 4) return text;
        }
      } catch {
      }
    }
    return "";
  }
  function cleanDocumentTitle() {
    const raw = document.title || "";
    return raw.replace(/\s*[\|–—:·]\s*[^|–—:·]{2,40}$/g, "").replace(/\s*-\s*[^-]{2,40}$/g, "").trim();
  }
  function isNoiseNode(el) {
    const id = (el.id || "").toLowerCase();
    const cls = (el.className || "").toString().toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (NOISE_PATTERNS.test(id) || NOISE_PATTERNS.test(cls)) return true;
    if (["navigation", "banner", "complementary", "contentinfo"].includes(role)) return true;
    const tag = el.tagName.toLowerCase();
    if (["nav", "footer", "aside", "header"].includes(tag)) return true;
    return false;
  }
  function scoreContainer(el) {
    if (isNoiseNode(el)) return -100;
    const text = (el.textContent || "").trim();
    const textLength = text.length;
    if (textLength < 100) return -50;
    const paragraphs = el.querySelectorAll("p");
    const pCount = paragraphs.length;
    const links = el.querySelectorAll("a");
    const linkDensity = links.length / Math.max(pCount, 1);
    const htmlLength = el.innerHTML.length;
    const textRatio = htmlLength > 0 ? textLength / htmlLength : 0;
    let score = Math.log(textLength) * 10;
    score += pCount * 3;
    score += textRatio * 30;
    if (linkDensity > 3) score -= 20;
    if (linkDensity > 6) score -= 30;
    if (el.querySelector("time[datetime]")) score += 5;
    if (el.querySelector("[itemprop]")) score += 5;
    const tag = el.tagName.toLowerCase();
    if (tag === "article") score += 25;
    if (tag === "main") score += 15;
    const cls = (el.className || "").toString().toLowerCase();
    if (/article|story|content|body|post|entry|nota/.test(cls)) score += 15;
    return score;
  }
  function findBestContainer() {
    const candidates = [];
    for (const sel of ARTICLE_CONTAINER_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of Array.from(els)) {
          const score = scoreContainer(el);
          if (score > 0) {
            candidates.push({ element: el, score });
          }
        }
      } catch {
      }
    }
    if (candidates.length === 0) {
      const divs = document.querySelectorAll("div, section");
      for (const div of Array.from(divs)) {
        const depth = getDepth(div);
        if (depth < 2 || depth > 8) continue;
        const score = scoreContainer(div);
        if (score > 20) {
          candidates.push({ element: div, score });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].element;
  }
  function getDepth(el) {
    let depth = 0;
    let current = el;
    while (current && current !== document.documentElement) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }
  function extractCleanText(container) {
    const blocks = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node2) => {
          const el = node2;
          if (isNoiseNode(el)) return NodeFilter.FILTER_REJECT;
          const tag = el.tagName.toLowerCase();
          if (["p", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "figcaption"].includes(tag)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          if (tag === "div" && !el.querySelector("p")) {
            const text = (el.textContent || "").trim();
            if (text.length > 50) return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    let node;
    while (node = walker.nextNode()) {
      const el = node;
      const text = (el.textContent || "").trim();
      if (text.length > 0) {
        if (!blocks.includes(text)) {
          blocks.push(text);
        }
      }
    }
    return blocks.join("\n\n");
  }
  function extractGeneric() {
    const result = { method: "generic", confidence: 0 };
    result.title = queryFirst(TITLE_SELECTORS) || cleanDocumentTitle() || void 0;
    result.author = queryFirst(AUTHOR_SELECTORS) || void 0;
    result.date = queryDate() || void 0;
    const container = findBestContainer();
    if (container) {
      const text = extractCleanText(container);
      if (text.length > 80) {
        result.content = text;
      }
    }
    const paywallHints = document.querySelectorAll(
      '.paywall, .premium-wall, .subscription-wall, [class*="paywall"], [id*="paywall"], [data-testid*="paywall"], .regwall, [class*="barrier"], [class*="metered"]'
    );
    result.paywallDetected = paywallHints.length > 0;
    if (result.title && result.content && result.content.length > 300) {
      result.confidence = 0.6;
    } else if (result.title && result.content) {
      result.confidence = 0.45;
    } else if (result.title) {
      result.confidence = 0.3;
    } else {
      result.confidence = 0.1;
    }
    return result;
  }

  // src/extractors/cascade.ts
  function runExtractionCascade() {
    const results = [];
    const json = extractJsonLd();
    if (json.confidence > 0) results.push(json);
    const site = extractSiteSpecific(window.location.hostname);
    if (site.confidence > 0) results.push(site);
    const meta = extractMetaTags();
    if (meta.confidence > 0) results.push(meta);
    const generic = extractGeneric();
    if (generic.confidence > 0) results.push(generic);
    const merged = mergeResults(results);
    let overallMethod = "manual";
    let overallConfidence = 0;
    for (const r of results) {
      if (r.confidence > overallConfidence) {
        overallConfidence = r.confidence;
        overallMethod = r.method;
      }
    }
    if (Object.keys(merged).length === 0) {
      return { result: {}, method: "manual", confidence: 0 };
    }
    merged.extractionMethod = overallMethod;
    merged.confidence = overallConfidence;
    return { result: merged, method: overallMethod, confidence: overallConfidence };
  }

  // src/utils/uuid.ts
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }

  // src/content/index.ts
  function getHostname() {
    return window.location.hostname.replace("www.", "");
  }
  function detectSite() {
    const host = getHostname();
    const known = {
      "wsj.com": "Wall Street Journal",
      "nytimes.com": "New York Times",
      "reuters.com": "Reuters",
      "ft.com": "Financial Times",
      "pressreader.com": "PressReader",
      "washingtonpost.com": "Washington Post",
      "elpais.com": "El Pa\xEDs",
      "reforma.com": "Reforma",
      "milenio.com": "Milenio"
    };
    for (const [key, val] of Object.entries(known)) {
      if (host.includes(key)) return { site: key, name: val };
    }
    const pathname = window.location.pathname;
    if (pathname.length > 1) {
      const displayName = host.replace(/^(www|m|mobile|amp)\./, "").split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { site: host, name: `${displayName} (gen\xE9rico)` };
    }
    return null;
  }
  function buildArticleFromExtraction(extracted) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
      superabstract: extracted.superabstract || extracted.title || document.title || "Sin t\xEDtulo",
      autor: extracted.autor || "",
      medio: extracted.medio || detectSite()?.name || host,
      abstract: window.location.href,
      texto: extracted.texto || extracted.content || "",
      subtitulo: extracted.subtitulo || "",
      seccion: extracted.seccion || "",
      clasificaciones: [],
      notas: "",
      isFullContent: extracted.isFullContent ?? (extracted.texto || "").length > 200,
      paywallDetected: extracted.paywallDetected ?? false,
      extractionMethod: extracted.extractionMethod || "manual",
      confidence: extracted.confidence || 0.5,
      capturedAt: now,
      lastModified: now,
      status: "draft"
    };
  }
  async function handleExtractionRequest() {
    const { result, method, confidence } = runExtractionCascade();
    const partial = buildArticleFromExtraction(result);
    const article = {
      ...partial,
      extractionMethod: method,
      confidence
    };
    chrome.runtime.sendMessage({
      type: "ARTICLE_EXTRACTED",
      payload: article
    });
  }
  function notifySiteDetected() {
    const detected = detectSite();
    if (detected) {
      chrome.runtime.sendMessage({
        type: "SITE_DETECTED",
        payload: detected
      });
    }
  }
  function setupObservers() {
    const debounce = (fn, delay = 1200) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = window.setTimeout(() => fn(...args), delay);
      };
    };
    const observer = new MutationObserver(
      debounce(() => {
      })
    );
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "EXTRACT_ARTICLE" || msg.type === "EXTRACT_NOW") {
        handleExtractionRequest();
      }
    });
  }
  function init() {
    notifySiteDetected();
    setupMessageListener();
    setupObservers();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
//# sourceMappingURL=content.js.map
