// Demo app configuration - now using shared core architecture
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://nadar-server-78zmr67l5-aladin147s-projects.vercel.app';

export function isApiConfigured(): boolean {
  return !!API_BASE;
}

export async function isApiConfiguredAsync(): Promise<boolean> {
  return isApiConfigured();
}