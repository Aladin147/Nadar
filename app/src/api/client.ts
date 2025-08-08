import { API_BASE } from '../config';

export type Mode = 'scene' | 'ocr' | 'qa';

export async function postJSON<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function describe(imageBase64: string, options?: any) {
  return postJSON<{ text: string }>(`/describe`, { imageBase64, options });
}
export function ocr(imageBase64: string, options?: any) {
  return postJSON<{ text: string }>(`/ocr`, { imageBase64, options });
}
export function qa(imageBase64: string, question: string, options?: any) {
  return postJSON<{ text: string }>(`/qa`, { imageBase64, question, options });
}
export function tts(text: string, voice?: string) {
  return postJSON<{ audioBase64: string }>(`/tts`, { text, voice });
}

