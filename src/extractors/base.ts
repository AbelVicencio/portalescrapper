export interface ExtractorResult {
  title?: string;
  author?: string;
  date?: string;
  content?: string;
  subtitle?: string;
  section?: string;
  paywallDetected?: boolean;
  url?: string;
  imageUrls?: string[];
  publisherName?: string;
  publisherLogo?: string;
  method: string;
  confidence: number;
}

export function mergeResults(results: ExtractorResult[]): Partial<import('../types').NewsArticle> {
  const merged: any = {};
  let highestConfidence = 0;

  let textMethod = '';

  for (const r of results) {
    if (r.confidence > highestConfidence) {
      highestConfidence = r.confidence;
    }
    if (r.title && !merged.superabstract) merged.superabstract = r.title;
    if (r.author && !merged.autor) merged.autor = r.author;
    if (r.date && !merged.fecha) merged.fecha = r.date;
    
    // Smart Text Content Merging Logic
    if (r.content) {
      if (!merged.texto) {
        merged.texto = r.content;
        textMethod = r.method;
      } else {
        const isNewSiteSpecific = r.method === 'site-specific';
        const isPrevSiteSpecific = textMethod === 'site-specific';
        const isMuchLonger = r.content.length > (merged.texto.length * 1.3);
        const isPrevShortTeaser = merged.texto.length < 500;

        let shouldOverwrite = false;
        if (isNewSiteSpecific && !isPrevSiteSpecific && isPrevShortTeaser && r.content.length > merged.texto.length) {
          shouldOverwrite = true;
        } else if (isMuchLonger) {
          // If the new method is low confidence (generic or meta-tags) and the previous was high confidence (json-ld or site-specific),
          // only overwrite if the previous text was a short teaser.
          const isNewLowConfidence = r.method === 'generic' || r.method === 'meta-tags';
          const isPrevHighConfidence = textMethod === 'json-ld' || textMethod === 'site-specific';
          
          if (isNewLowConfidence && isPrevHighConfidence) {
            if (isPrevShortTeaser) {
              shouldOverwrite = true;
            }
          } else {
            // Otherwise, follow general rule of allowing it if the previous wasn't site-specific or the new one is site-specific.
            if (!isPrevSiteSpecific || isNewSiteSpecific) {
              shouldOverwrite = true;
            }
          }
        }

        if (shouldOverwrite) {
          merged.texto = r.content;
          textMethod = r.method;
        }
      }
    }

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

export function createEmptyResult(method: string): ExtractorResult {
  return { method, confidence: 0 };
}
