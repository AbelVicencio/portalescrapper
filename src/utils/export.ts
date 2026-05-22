import type { NewsArticle } from '../types';

// Helper to normalize fecha to Mexico City local time (same as in sidepanel)
function toMexicoCityLocalISO(input: string | Date | undefined | null): string {
  if (!input) {
    const now = new Date();
    return now.toISOString().slice(0, 19);
  }
  try {
    const date = typeof input === 'string' ? new Date(input) : input;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    const now = new Date();
    return now.toISOString().slice(0, 19);
  }
}

function normalizeTranscription(text: string | undefined | null): string {
  if (!text) return '';

  let t = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  // Heurística para texto monolítico (sin saltos)
  if (!t.includes('\n') && t.length > 200) {
    t = t.replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÑÜ"'])/g, '$1\n\n');
  }

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function csvEscape(val: any): string {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join('; ') : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportToJSON(articles: NewsArticle[]): void {
  // Normalize all fechas to Mexico City local time for consistency
  const normalizedArticles = articles.map(a => ({
    ...a,
    fecha: toMexicoCityLocalISO(a.fecha),
    fecha_transcripcion: toMexicoCityLocalISO(a.fecha_transcripcion || a.fecha),
    texto: normalizeTranscription(a.texto),
  }));

  const payload = {
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    totalArticles: articles.length,
    articles: normalizedArticles,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portalescrapper-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(articles: NewsArticle[]): void {
  const headers = [
    'id',
    'medio',
    'fecha',
    'fecha_transcripcion',
    'superabstract',
    'autor',
    'texto',
    'url',
    'emisora',
    'emision',
    'evento',
    'pendiente',
    'seccion',
    'tags',
    'clasificaciones',
    'notas',
    'extractionMethod',
    'confidence',
    'status',
    'dbRecordId',
  ];

  const rows = articles.map((a) =>
    [
      csvEscape(a.id),
      csvEscape(a.medio),
      csvEscape(toMexicoCityLocalISO(a.fecha)),
      csvEscape(toMexicoCityLocalISO(a.fecha_transcripcion || a.fecha)),
      csvEscape(a.superabstract),
      csvEscape(a.autor),
      csvEscape(normalizeTranscription(a.texto)),
      csvEscape(a.url),
      csvEscape(a.emisora),
      csvEscape(a.emision),
      csvEscape(a.evento),
      csvEscape(a.pendiente),
      csvEscape(a.seccion),
      csvEscape(a.tags),
      csvEscape(a.clasificaciones),
      csvEscape(a.notas),
      csvEscape(a.extractionMethod),
      csvEscape(a.confidence),
      csvEscape(a.status),
      csvEscape(a.dbRecordId),
    ].join(',')
  );

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portalescrapper-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
