import { ExtractorResult, mergeResults, createEmptyResult } from './base';
import { extractJsonLd } from './jsonld';
import { extractMetaTags } from './meta';
import { extractSiteSpecific } from './siteSpecific';

export function runExtractionCascade(): { result: Partial<import('../types').NewsArticle>; method: string; confidence: number } {
  const results: ExtractorResult[] = [];

  const json = extractJsonLd();
  if (json.confidence > 0) results.push(json);

  const site = extractSiteSpecific(window.location.hostname);
  if (site.confidence > 0) results.push(site);

  const meta = extractMetaTags();
  if (meta.confidence > 0) results.push(meta);

  const merged = mergeResults(results);

  let overallMethod: string = 'manual';
  let overallConfidence = 0;
  for (const r of results) {
    if (r.confidence > overallConfidence) {
      overallConfidence = r.confidence;
      overallMethod = r.method;
    }
  }

  if (Object.keys(merged).length === 0) {
    return { result: {}, method: 'manual', confidence: 0 };
  }

  (merged as any).extractionMethod = overallMethod as any;
  (merged as any).confidence = overallConfidence;

  return { result: merged, method: overallMethod, confidence: overallConfidence };
}
