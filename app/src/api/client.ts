import { API_BASE } from '../config';

export type Mode = 'scene' | 'ocr' | 'qa';

export async function postJSON<T>(path: string, body: any, attempts = 2): Promise<T> {
  let lastErr: any;
  console.log(`API Call: ${API_BASE}${path}`);

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      console.log(`Response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.log(`Error response: ${errorText}`);

        // Retry on 5xx only
        if (res.status >= 500 && i < attempts - 1) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }
        throw new Error(`Server error (${res.status}): ${errorText}`);
      }

      const result = await res.json();
      console.log('API Success:', result);
      return result;
    } catch (e: any) {
      console.log(`API Error (attempt ${i + 1}):`, e.message);
      lastErr = e;

      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
        continue;
      }
    }
  }

  const finalError = lastErr || new Error('Network error');
  console.log('Final API Error:', finalError.message);
  throw finalError;
}

type Timings = { modelMs: number };
export type GenResult = { text: string; timings?: Timings };
export type TTSResult = { audioBase64: string };

export function describe(imageBase64: string, mimeType?: string, options?: any) {
  return postJSON<GenResult>(`/describe`, { imageBase64, mimeType, options });
}
export function ocr(imageBase64: string, mimeType?: string, options?: any) {
  return postJSON<GenResult>(`/ocr`, { imageBase64, mimeType, options });
}
export function qa(imageBase64: string, question: string, mimeType?: string, options?: any) {
  return postJSON<GenResult>(`/qa`, { imageBase64, question, mimeType, options });
}
export function tts(text: string, voice?: string) {
  return postJSON<TTSResult>(`/tts`, { text, voice });
}

