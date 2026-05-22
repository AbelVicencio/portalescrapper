import { ExtractorResult } from './base';

export function extractMetaTags(): ExtractorResult {
  const res: ExtractorResult = { method: 'meta-tags', confidence: 0.65 };

  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
  const twTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');

  res.title = ogTitle || twTitle || undefined;
  res.content = ogDesc || undefined;
  res.url = ogUrl || undefined;
  if (ogImage) res.imageUrls = [ogImage];

  const author = document.querySelector('meta[name="author"]')?.getAttribute('content');
  if (author) res.author = author;

  const pub = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
  if (pub) res.date = pub;

  const section = document.querySelector('meta[property="article:section"]')?.getAttribute('content');
  if (section) res.section = section;

  const tags = Array.from(document.querySelectorAll('meta[property="article:tag"]'))
    .map((m) => m.getAttribute('content'))
    .filter(Boolean) as string[];
  if (tags.length) res.content = (res.content || '') + '\n\nTags: ' + tags.join(', '); // keep it minimal

  res.confidence = res.title || res.content ? 0.75 : 0.5;
  return res;
}
