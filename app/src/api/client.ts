import { API_BASE } from '../config';
import { loadSettings } from '../app/state/settings';

export type Mode = 'scene' | 'ocr' | 'qa';

async function resolveApiBase(): Promise<string> {
  try {
    const s = await loadSettings();
    const base = s.apiBase || API_BASE;

    if (!base) {
      throw new Error('No server configured. Please set up the server connection in Settings.');
    }

    return base;
  } catch (error) {
    if (!API_BASE) {
      throw new Error('No server configured. Please set up the server connection in Settings.');
    }
    return API_BASE;
  }
}

export async function postJSON<T>(path: string, body: any, attempts = 2): Promise<T> {
  let lastErr: any;
  const base = await resolveApiBase();
  console.log(`API Call: ${base}${path}`);

  for (let i = 0; i < attempts; i++) {
    try {
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`Response status: ${res.status}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.log(`Error response: ${errorText}`);
        const is5xx = res.status >= 500;
        const is4xx = res.status >= 400 && res.status < 500;
        if (is5xx && i < attempts - 1) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }
        let friendly = `Server error (${res.status})`;
        if (res.status === 413) friendly = 'Image too large';
        else if (res.status === 429) friendly = 'Too many requests';
        else if (res.status === 400) friendly = 'Invalid request';
        else if (res.status === 401 || res.status === 403) friendly = 'Unauthorized';
        throw new Error(`${friendly}: ${errorText}`);
      }

      const result = await res.json();
      console.log('API Success:', result);
      return result;
    } catch (e: any) {
      console.log(`API Error (attempt ${i + 1}):`, e.message);
      if (e.name === 'AbortError') {
        console.log('Request timed out after 10 seconds');
      }
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
export type TTSResult = { audioBase64: string; mimeType?: string };

function createDemoResponse(mode: string, question?: string): GenResult {
  const responses = {
    describe: "IMMEDIATE: Clear path ahead, no obstacles detected. OBJECTS: Wooden table with laptop, coffee mug on the right side, smartphone next to keyboard. NAVIGATION: Safe to move forward, table edge 2 feet ahead on your left.",
    ocr: "MENU\n\nCoffee - $3.50\nTea - $2.75\nCroissant - $4.25\nMuffin - $3.00\n\nDaily Special:\nAvocado Toast - $6.95",
    qa: question?.toLowerCase().includes('color') ? "The main colors I can see are brown (wooden table), black (laptop), and white (coffee mug)." : "This appears to be a workspace setup with a laptop computer on a wooden desk."
  };

  return {
    text: responses[mode as keyof typeof responses] || responses.describe,
    timings: { modelMs: 1000 }
  };
}

export async function describe(imageBase64: string, mimeType?: string, options?: any, sessionId?: string) {
  const base = await resolveApiBase();
  if (base === 'DEMO_MODE') {
    console.log('🎭 Demo mode: returning mock scene description');
    return createDemoResponse('describe');
  }
  return postJSON<GenResult>(`/describe`, { imageBase64, mimeType, options, sessionId });
}

export async function ocr(imageBase64: string, mimeType?: string, options?: any, sessionId?: string, full?: boolean) {
  const base = await resolveApiBase();
  if (base === 'DEMO_MODE') {
    console.log('🎭 Demo mode: returning mock OCR result');
    return createDemoResponse('ocr');
  }
  const url = full ? `/ocr?full=true` : `/ocr`;
  return postJSON<GenResult>(url, { imageBase64, mimeType, options, sessionId });
}

export async function qa(imageBase64: string | null, question: string, mimeType?: string, options?: any, sessionId?: string, imageRef?: string) {
  const base = await resolveApiBase();
  if (base === 'DEMO_MODE') {
    console.log('🎭 Demo mode: returning mock Q&A result');
    return createDemoResponse('qa', question);
  }

  const body: any = { question, mimeType, options, sessionId };
  if (imageRef) {
    body.imageRef = imageRef;
  } else if (imageBase64) {
    body.imageBase64 = imageBase64;
  }

  return postJSON<GenResult>(`/qa`, body);
}
export async function tts(text: string, voice?: string, provider?: 'gemini' | 'elevenlabs') {
  const base = await resolveApiBase();
  if (base === 'DEMO_MODE') {
    console.log('🎭 Demo mode: returning mock TTS audio');
    const silenceBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    return { audioBase64: silenceBase64 };
  }
  return postJSON<TTSResult>(`/tts`, { text, voice, provider });
}

// Get available TTS providers from server
export async function getTTSProviders() {
  const base = await resolveApiBase();
  if (base === 'DEMO_MODE') {
    return { available: ['gemini'], current: 'gemini' };
  }
  return postJSON<{ available: string[]; current: string }>(`/tts/providers`);
}

// Set TTS provider on server
export async function setTTSProvider(provider: 'gemini' | 'elevenlabs') {
  const base = await resolveApiBase();
  if (base === 'DEMO_MODE') {
    console.log('🎭 Demo mode: TTS provider setting ignored');
    return { success: true };
  }
  return postJSON<{ success: boolean }>(`/tts/provider`, { provider });
}

export async function testConnection() {
  try {
    const base = await resolveApiBase();
    console.log('Testing connection to:', `${base}/health`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('Health check response:', res.status);

    if (res.ok) {
      const data = await res.json();
      console.log('Health check data:', data);
      return true;
    }
    return false;
  } catch (e: any) {
    console.log('Connection test failed:', e.message);
    return false;
  }
}

