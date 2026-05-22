export type ExtractionMethod = 'json-ld' | 'site-specific' | 'meta-tags' | 'readability' | 'manual';
export type ArticleStatus = 'draft' | 'reviewed' | 'exported' | 'synced';

export interface NewsArticle {
  id: string;
  source: string;
  url: string;
  urlWithParams?: string;

  emisora: number;
  emision: number;
  fecha: string;
  usuario: string;
  evento: number;
  superabstract: string;
  pendiente: number;
  portal?: number;
  nombre_portal?: string;
  pais?: string;

  abstract: string;
  texto: string;
  autor: string;
  medio: string;

  subtitulo?: string;
  seccion?: string;
  tags?: string[];
  idioma?: string;
  imageUrls?: string[];
  authorUrl?: string;
  publisherName?: string;
  publisherLogo?: string;
  description?: string;
  wordCount?: number;

  isFullContent: boolean;
  paywallDetected: boolean;
  extractionMethod: ExtractionMethod;
  confidence: number;

  clasificaciones: number[];
  notas?: string;

  capturedAt: string;
  lastModified: string;

  status: ArticleStatus;
  dbRecordId?: number;
}

export interface SiteConfig {
  name: string;
  hostPatterns: string[];
  selectors: {
    title: string;
    author: string;
    date: string;
    content: string;
    subtitle?: string;
    section?: string;
    paywall?: string;
  };
}

export type ExtensionMessage =
  | { type: 'EXTRACT_ARTICLE' }
  | { type: 'ARTICLE_EXTRACTED'; payload: Partial<NewsArticle> }
  | { type: 'SAVE_ARTICLE'; payload: NewsArticle }
  | { type: 'ARTICLE_SAVED'; payload: { id: string } }
  | { type: 'GRABAR_API'; payload: NewsArticle }
  | { type: 'API_GRABADO_SUCCESS'; payload: { id: string; dbRecordId: number } }
  | { type: 'API_GRABADO_ERROR'; payload: { id: string; error: string } }
  | { type: 'GET_ALL_ARTICLES' }
  | { type: 'ALL_ARTICLES'; payload: NewsArticle[] }
  | { type: 'DELETE_ARTICLE'; payload: { id: string } }
  | { type: 'EXPORT_JSON' }
  | { type: 'EXPORT_CSV' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SITE_DETECTED'; payload: { site: string; name: string } }
  | { type: 'NO_ARTICLE_FOUND' }
  | { type: 'UPDATE_BADGE'; payload: { count: number } }
  | { type: 'EXTRACT_NOW' }; // internal signal from side-panel to content script to trigger cascade
