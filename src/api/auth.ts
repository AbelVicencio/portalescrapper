import { getToken } from './client';

const STORAGE_KEY_TOKEN = 'medialog_token';
const STORAGE_KEY_USER = 'medialog_usuario';
const STORAGE_KEY_EXPIRES = 'medialog_token_expires';

export async function login(username: string, password: string): Promise<{ success: boolean; usuario?: string; error?: string }> {
  try {
    const data = await getToken(username, password);
    if (!data.access_token) {
      return { success: false, error: 'Token no recibido' };
    }
    const expiresAt = Date.now() + 1000 * 60 * 60 * 2; // 2h conservative

    await chrome.storage.local.set({
      [STORAGE_KEY_TOKEN]: data.access_token,
      [STORAGE_KEY_USER]: data.usuario || username,
      [STORAGE_KEY_EXPIRES]: expiresAt,
    });
    return { success: true, usuario: data.usuario || username };
  } catch (e: any) {
    return { success: false, error: e.message || 'Error de autenticación' };
  }
}

export async function logout(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER, STORAGE_KEY_EXPIRES]);
}

export async function getCurrentUser(): Promise<{ usuario: string; token: string } | null> {
  const data: any = await chrome.storage.local.get([STORAGE_KEY_USER, STORAGE_KEY_TOKEN, STORAGE_KEY_EXPIRES]);
  if (!data[STORAGE_KEY_TOKEN] || !data[STORAGE_KEY_USER]) return null;
  const exp = data[STORAGE_KEY_EXPIRES] || 0;
  if (Date.now() > exp) return null; // expired
  return { usuario: data[STORAGE_KEY_USER], token: data[STORAGE_KEY_TOKEN] };
}

export async function getTokenOnly(): Promise<string | null> {
  const res: any = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
  return (res[STORAGE_KEY_TOKEN] as string) || null;
}
