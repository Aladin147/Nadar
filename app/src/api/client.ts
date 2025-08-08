import { API_BASE } from '../config';

export type Mode = 'scene' | 'ocr' | 'qa';

export async function postJSON<T>(path: string, body: any, attempts = 2): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Retry on 5xx only
        if (res.status >= 500 && i < attempts - 1) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    } catch (e: any) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
        continue;
      }
    }
  }
  throw lastErr || new Error('Network error');
}

export function describe(imageBase64: string, mimeType?: string, options?: any) {
  return postJSON<{ text: string }>(`/describe`, { imageBase64, mimeType, options });
}
export function ocr(imageBase64: string, mimeType?: string, options?: any) {
  return postJSON<{ text: string }>(`/ocr`, { imageBase64, mimeType, options });
}
export function qa(imageBase64: string, question: string, mimeType?: string, options?: any) {
  return postJSON<{ text: string }>(`/qa`, { imageBase64, question, mimeType, options });
}
export function tts(text: string, voice?: string) {
  return postJSON<{ audioBase64: string }>(`/tts`, { text, voice });
}

