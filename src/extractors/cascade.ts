import { ExtractorResult, mergeResults, createEmptyResult } from './base';
import { extractJsonLd } from './jsonld';
import { extractMetaTags } from './meta';
import { extractSiteSpecific, cleanMilenioText, cleanElUniversalText, cleanElPaisText, cleanWSJText } from './siteSpecific';
import { extractGeneric } from './generic';

/**
 * Cascada de extracción de 5 capas.
 *
 * Orden por confianza (de mayor a menor):
 *   1. JSON-LD       (0.95) — Datos estandarizados de Schema.org
 *   2. Site-Specific  (0.85) — Selectores CSS curados por portal registrado
 *   3. Meta Tags      (0.75) — OpenGraph, Twitter Cards, article:* tags
 *   4. Genérico       (0.50) — Heurísticas universales de densidad de texto
 *   5. Manual         (0.00) — El usuario escribe directamente en el formulario
 *
 * El merge opera con "primer valor gana": si JSON-LD ya resolvió el título,
 * las capas inferiores no lo sobrescriben. Pero si JSON-LD no incluye
 * articleBody (muy común), el genérico puede aportar el texto completo.
 */
export function runExtractionCascade(): { result: Partial<import('../types').NewsArticle>; method: string; confidence: number } {
  const results: ExtractorResult[] = [];

  // Capa 1: JSON-LD (más confiable)
  const json = extractJsonLd();
  if (json.confidence > 0) results.push(json);

  // Capa 2: Selectores específicos por portal (solo si el sitio está registrado)
  const site = extractSiteSpecific(window.location.hostname);
  if (site.confidence > 0) results.push(site);

  // Capa 3: Meta tags (OpenGraph, article:published_time, etc.)
  const meta = extractMetaTags();
  if (meta.confidence > 0) results.push(meta);

  // Capa 4: Extractor genérico (densidad de texto, selectores universales)
  const generic = extractGeneric();
  if (generic.confidence > 0) results.push(generic);

  const merged = mergeResults(results);

  // Post-procesamiento específico por portal en el texto final
  if (window.location.hostname.includes('wsj.com') && merged.texto) {
    merged.texto = cleanWSJText(merged.texto);
  }
  if (window.location.hostname.includes('milenio.com') && merged.texto) {
    const title = merged.superabstract || '';
    const author = merged.autor || '';
    merged.texto = cleanMilenioText(merged.texto, author, title);
  }
  if (window.location.hostname.includes('eluniversal.com.mx') && merged.texto) {
    merged.texto = cleanElUniversalText(merged.texto);
  }
  if (window.location.hostname.includes('elpais.com') && merged.texto) {
    merged.texto = cleanElPaisText(merged.texto);
  }

  let overallMethod: string = 'manual';
  let overallConfidence = 0;
  for (const r of results) {
    if (r.confidence > overallConfidence) {
      overallConfidence = r.confidence;
      overallMethod = r.method;
    }
  }

  if (Object.keys(merged).length === 0 || (!merged.superabstract && !merged.texto && !merged.url)) {
    return { result: {}, method: 'manual', confidence: 0 };
  }

  (merged as any).extractionMethod = overallMethod as any;
  (merged as any).confidence = overallConfidence;

  return { result: merged, method: overallMethod, confidence: overallConfidence };
}
