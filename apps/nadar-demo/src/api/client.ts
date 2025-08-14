import { API_BASE } from '../config';

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
  const base = process.env.EXPO_PUBLIC_API_BASE || API_BASE;
  if (!base) {
    throw new Error('No server configured. Please set up the server connection.');
  }
  return base;
}

export async function postJSON<T>(path: string, body: any, attempts = 2): Promise<T> {
  let lastErr: any;
  const base = await resolveApiBase();

  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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

export async function assist(
  imageBase64: string,
  mimeType: string,
  question?: string,
  options?: { verbosity?: 'brief' | 'normal'; language?: 'darija' | 'ar' | 'en' },
  sessionId?: string
) {
  const body = {
    sessionId,
    imageBase64,
    mimeType,
    question,
    language: options?.language || 'darija',
    verbosity: options?.verbosity || 'brief'
  };

  console.log('🤖 Demo app sending assist request, size:', imageBase64.length, 'chars');
  if (question) {
    console.log('❓ Question:', question);
  }

  return await postJSON<{
    speak: string;
    details?: string[];
    signals: {
      has_text: boolean;
      hazards: string[];
      people_count: number;
      lighting_ok: boolean;
      confidence: number;
    };
    followup_suggest?: string[];
    followupToken?: string;
    timestamp: string;
    sessionId: string;
    processingTime: number;
    fallback?: boolean;
  }>('/api/assist-shared', body);
}

// New function for follow-up questions using imageRef
export async function assistWithImageRef(
  imageRef: string,
  question: string,
  options?: { verbosity?: 'brief' | 'normal'; language?: 'darija' | 'ar' | 'en' },
  sessionId?: string
) {
  const body = {
    sessionId,
    imageRef,
    question,
    language: options?.language || 'darija',
    verbosity: options?.verbosity || 'brief'
  };

  console.log('🔄 Demo app sending follow-up question with imageRef:', imageRef);
  console.log('❓ Follow-up question:', question);

  const result = await postJSON<{
    speak: string;
    details?: string[];
    signals: {
      has_text: boolean;
      hazards: string[];
      people_count: number;
      lighting_ok: boolean;
      confidence: number;
    };
    followup_suggest?: string[];
    followupToken?: string;
    timestamp: string;
    sessionId: string;
    processingTime: number;
    fallback?: boolean;
  }>('/api/assist-shared', body);

  console.log('✅ Demo app follow-up response received:', result.speak.substring(0, 100) + '...');
  if (result.signals) {
    console.log('🔍 Signals:', result.signals);
  }

  return result;
}

export async function tts(
  text: string,
  voice?: string,
  provider?: 'gemini' | 'elevenlabs',
  rate?: number
) {
  return postJSON<{ audioBase64: string; mimeType?: string }>(`/api/tts-shared`, {
    text, 
    voice, 
    provider: provider || 'elevenlabs', // Default to ElevenLabs
    rate 
  });
}

export async function testConnection() {
  try {
    const base = await resolveApiBase();
    console.log('🔍 Demo app testing connection to:', base);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('📡 Response status:', res.status, res.statusText);

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Health check response:', data);
      return data.ok === true;
    }
    console.log('❌ Health check failed - not ok');
    return false;
  } catch (error) {
    console.log('❌ Connection test failed:', error);
    return false;
  }
}