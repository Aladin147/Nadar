// Demo app configuration
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://nadar-server-ebhhtf6v9-aladin147s-projects.vercel.app';

export function isApiConfigured(): boolean {
  return !!API_BASE;
}

export async function isApiConfiguredAsync(): Promise<boolean> {
  return isApiConfigured();
}