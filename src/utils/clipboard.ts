export function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return Promise.resolve(false);
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
}
