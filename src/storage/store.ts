import type { NewsArticle } from '../types';

const STORAGE_KEY = 'portalescrapper_articles';

export async function getAllArticles(): Promise<NewsArticle[]> {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  return (res[STORAGE_KEY] as NewsArticle[]) || [];
}

export async function saveArticle(article: NewsArticle): Promise<void> {
  const existing = await getAllArticles();
  const without = existing.filter((a) => a.id !== article.id);
  without.unshift(article);
  await chrome.storage.local.set({ [STORAGE_KEY]: without });
}

export async function deleteArticle(id: string): Promise<void> {
  const list = await getAllArticles();
  const filtered = list.filter((a) => a.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

export async function getArticleById(id: string): Promise<NewsArticle | undefined> {
  const list = await getAllArticles();
  return list.find((a) => a.id === id);
}

  export async function clearAll(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }

  /**
   * Limpia COMPLETAMENTE chrome.storage.local (incluye token, temas, zoom, todo).
   * Úsalo solo para pruebas forzadas del chequeo contra API.
   */
  export async function clearStorageCompletely(): Promise<void> {
    await chrome.storage.local.clear();
    console.log('[PortalScrapper] chrome.storage.local completamente borrado (forzar pruebas API)');
  }

export async function updateBadge(count?: number): Promise<void> {
  const total = count ?? (await getAllArticles()).length;
  await chrome.action.setBadgeText({ text: total > 0 ? String(total) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
}
