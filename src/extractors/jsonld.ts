import { ExtractorResult } from './base';

function getTextContent(el: Element | null): string {
  if (!el) return '';
  return (el.textContent || '').trim();
}

export function extractJsonLd(): ExtractorResult {
  const result: ExtractorResult = { method: 'json-ld', confidence: 0 };
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
      let data: any;
      try {
        data = JSON.parse(script.textContent || '');
      } catch {
        continue;
      }

      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = item['@type'];
        if (type === 'NewsArticle' || type === 'Article' || type === 'ReportageNewsArticle' || (Array.isArray(type) && type.some((t: string) => ['NewsArticle', 'Article'].includes(t)))) {
          result.title = item.headline || item.name || result.title;
          result.date = item.datePublished || result.date;
          result.content = item.articleBody || result.content;
          result.author = typeof item.author === 'object' ? (item.author?.name || item.author?.[0]?.name) : item.author || result.author;
          result.publisherName = item.publisher?.name || result.publisherName;
          result.publisherLogo = item.publisher?.logo?.url || result.publisherLogo;
          result.imageUrls = item.image ? (typeof item.image === 'string' ? [item.image] : Array.isArray(item.image) ? item.image.map((i: any) => typeof i === 'string' ? i : i.url) : []) : result.imageUrls;
          result.confidence = 0.95;
        }
        if (item['@graph']) {
          for (const g of item['@graph']) {
            if (g['@type'] === 'NewsArticle' || g['@type'] === 'Article') {
              result.title = g.headline || g.name || result.title;
              result.date = g.datePublished || result.date;
              result.content = g.articleBody || result.content;
              result.confidence = Math.max(result.confidence, 0.9);
            }
          }
        }
      }
    }
  } catch (e) {}
  return result;
}
