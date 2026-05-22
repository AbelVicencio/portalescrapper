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

        // Overwrite existing text if:
        // 1. The new text is curated/site-specific and is reasonably long (> 150 chars).
        // 2. The new text is significantly longer (meaning the previous one was likely a teaser or description).
        if (
          (isNewSiteSpecific && !isPrevSiteSpecific && r.content.length > 150) ||
          (isMuchLonger && (!isPrevSiteSpecific || isNewSiteSpecific))
        ) {
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
