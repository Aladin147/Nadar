// Demo app configuration - now using shared core architecture
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://nadar-server-l5ppha4sm-aladin147s-projects.vercel.app';

export function isApiConfigured(): boolean {
  return !!API_BASE;
}

export async function isApiConfiguredAsync(): Promise<boolean> {
  return isApiConfigured();
}