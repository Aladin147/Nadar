import { API_BASE } from '../config';
import { loadSettings } from '../app/state/settings';

export type Mode = 'scene' | 'ocr' | 'qa';

function normalizeFetchError(e: any): Error {
  // Normalize AbortError and common network failures to our error codes
  const msg = (e?.message || '').toLowerCase();
  if (e?.name === 'AbortError' || msg.includes('abort')) {
    const err = new Error('Request timed out');
    (err as any).err_code = 'TIMEOUT';
    return err;
  }
  if (msg.includes('network request failed') || msg.includes('failed to fetch')) {
    const err = new Error('Network request failed');
    (err as any).err_code = 'NETWORK';
    return err;
  }
  return e instanceof Error ? e : new Error(String(e));
}

async function resolveApiBase(): Promise<string> {
  try {
    const s = await loadSettings();
    const base = s.apiBase || API_BASE;

    if (!base) {
      throw new Error('No server configured. Please set up the server connection in Settings.');
    }

    return base;
  } catch {
    if (!API_BASE) {
      throw new Error('No server configured. Please set up the server connection in Settings.');
    }
    return API_BASE;
  }
}

export async function postJSON<T>(path: string, body: any, attempts = 2): Promise<T> {
  let lastErr: any;
  const base = await resolveApiBase();

  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for AI processing

      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const is5xx = res.status >= 500;

        // Try to parse JSON error response first
        let errorPayload: any = { message: await res.text() };
        if (contentType.includes('application/json')) {
          try {
            const text = errorPayload.message;
            errorPayload = JSON.parse(text);
          } catch {
            // Keep the text as message if JSON parsing fails
          }
        }

        if (is5xx && i < attempts - 1) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }

        let friendly = `Server error (${res.status})`;
        if (res.status === 413) friendly = 'Image too large';
        else if (res.status === 429) friendly = 'Too many requests';
        else if (res.status === 400) friendly = 'Invalid request';
        else if (res.status === 401 || res.status === 403) friendly = 'Unauthorized';

        const error = new Error(
          errorPayload.message || `${friendly}: ${errorPayload.message || 'Unknown error'}`
        );
        // Propagate err_code if available from server
        if (errorPayload.err_code) {
          (error as any).err_code = errorPayload.err_code;
        }
        throw error;
      }

      return await res.json();
    } catch (e: any) {
      lastErr = normalizeFetchError(e);
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
        continue;
      }
    }
  }

  throw lastErr || new Error('Network error');
}

async function getJSON<T>(path: string, attempts = 2): Promise<T> {
  let lastErr: any;
  const base = await resolveApiBase();

  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for AI processing

      const res = await fetch(`${base}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const is5xx = res.status >= 500;

        // Try to parse JSON error response first
        let errorPayload: any = { message: await res.text() };
        if (contentType.includes('application/json')) {
          try {
            const text = errorPayload.message;
            errorPayload = JSON.parse(text);
          } catch {
            // Keep the text as message if JSON parsing fails
          }
        }

        if (is5xx && i < attempts - 1) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }

        let friendly = `Server error (${res.status})`;
        if (res.status === 413) friendly = 'Image too large';
        else if (res.status === 429) friendly = 'Rate limited - please wait';
        else if (res.status === 400) friendly = 'Invalid request';
        else if (res.status === 401 || res.status === 403) friendly = 'Unauthorized';

        const error = new Error(
          errorPayload.message || `${friendly}: ${errorPayload.message || 'Unknown error'}`
        );
        // Propagate err_code if available from server
        if (errorPayload.err_code) {
          (error as any).err_code = errorPayload.err_code;
        }
        throw error;
      }

      return res.json();
    } catch (e: any) {
      lastErr = normalizeFetchError(e);
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
        continue;
      }
    }
  }

  throw lastErr || new Error('Network error');
}

type Timings = { modelMs: number };
export type GenResult = { text: string; timings?: Timings };
export type TTSResult = { audioBase64: string; mimeType?: string };

export async function describe(
  imageBase64: string,
  mimeType?: string,
  options?: any,
  sessionId?: string
) {
  return postJSON<GenResult>(`/describe`, { imageBase64, mimeType, options, sessionId });
}

export async function ocr(
  imageBase64: string | null,
  mimeType?: string,
  options?: any,
  sessionId?: string,
  full?: boolean,
  imageRef?: string
) {
  const url = full ? `/ocr?full=true` : `/ocr`;
  const body: any = { mimeType, options, sessionId };

  if (imageRef) {
    body.imageRef = imageRef;
  } else if (imageBase64) {
    body.imageBase64 = imageBase64;
  }

  return postJSON<GenResult>(url, body);
}

export async function qa(
  imageBase64: string | null,
  question: string,
  mimeType?: string,
  options?: any,
  sessionId?: string,
  imageRef?: string
) {
  const body: any = { question, mimeType, options, sessionId };
  if (imageRef) {
    body.imageRef = imageRef;
  } else if (imageBase64) {
    body.imageBase64 = imageBase64;
  }

  return postJSON<GenResult>(`/qa`, body);
}
export async function tts(
  text: string,
  voice?: string,
  provider?: 'gemini' | 'elevenlabs',
  rate?: number
) {
  return postJSON<TTSResult>(`/tts`, { text, voice, provider, rate });
}

// Get available TTS providers from server
export async function getTTSProviders() {
  return getJSON<{ available: string[]; current: string }>(`/tts/providers`);
}

// Set TTS provider on server
export async function setTTSProvider(provider: 'gemini' | 'elevenlabs') {
  return postJSON<{ success: boolean }>(`/tts/provider`, { provider });
}

export async function testConnection() {
  try {
    const base = await resolveApiBase();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data.ok === true;
    }
    return false;
  } catch {
    return false;
  }
}
