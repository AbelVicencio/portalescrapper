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

export function createEmptyResult(method: string): ExtractorResult {
  return { method, confidence: 0 };
}
