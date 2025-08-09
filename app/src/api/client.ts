import { API_BASE, DEMO_MODE } from '../config';

export type Mode = 'scene' | 'ocr' | 'qa';

export async function postJSON<T>(path: string, body: any, attempts = 2): Promise<T> {
  let lastErr: any;
  console.log(`API Call: ${API_BASE}${path}`);

  for (let i = 0; i < attempts; i++) {
    try {
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(`${API_BASE}${path}`, {
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
export type TTSResult = { audioBase64: string };

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

export function describe(imageBase64: string, mimeType?: string, options?: any) {
  if (DEMO_MODE) {
    console.log('🎭 Demo mode: returning mock scene description');
    return Promise.resolve(createDemoResponse('describe'));
  }
  return postJSON<GenResult>(`/describe`, { imageBase64, mimeType, options });
}
export function ocr(imageBase64: string, mimeType?: string, options?: any) {
  if (DEMO_MODE) {
    console.log('🎭 Demo mode: returning mock OCR result');
    return Promise.resolve(createDemoResponse('ocr'));
  }
  return postJSON<GenResult>(`/ocr`, { imageBase64, mimeType, options });
}
export function qa(imageBase64: string, question: string, mimeType?: string, options?: any) {
  if (DEMO_MODE) {
    console.log('🎭 Demo mode: returning mock Q&A result');
    return Promise.resolve(createDemoResponse('qa', question));
  }
  return postJSON<GenResult>(`/qa`, { imageBase64, question, mimeType, options });
}
export function tts(text: string, voice?: string) {
  if (DEMO_MODE) {
    console.log('🎭 Demo mode: returning mock TTS audio');
    // Return a small demo audio (silence)
    const silenceBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    return Promise.resolve({ audioBase64: silenceBase64 });
  }
  return postJSON<TTSResult>(`/tts`, { text, voice });
}

export async function testConnection() {
  try {
    console.log('Testing connection to:', `${API_BASE}/health`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_BASE}/health`, {
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

