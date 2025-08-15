import { API_BASE } from '../config';
import { sessionCostTracker, RequestCostData } from '../utils/costTracker';

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
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
  }>('/api/assist-shared', body);

  // Track cost for this request
  const costData: RequestCostData = {
    endpoint: '/api/assist-shared',
    tokenUsage: result.tokenUsage,
    imageBytes: Math.round(imageBase64.length * 0.75), // Rough base64 to bytes conversion
    outputChars: result.speak.length + (result.details?.join('').length || 0),
    ttsUsed: false, // TTS happens separately
    isLiveEngine: false,
    timestamp: Date.now()
  };
  sessionCostTracker.addRequest(costData);

  return result;
}

// Multimodal assist function (image + audio + text)
export async function assistMultimodal(
  imageBase64: string,
  imageMimeType: string,
  audioBase64?: string,
  audioMimeType?: string,
  question?: string,
  options?: { verbosity?: 'brief' | 'normal'; language?: 'darija' | 'ar' | 'en' },
  sessionId?: string
) {
  const body = {
    sessionId: sessionId || `demo-${Date.now()}`,
    language: options?.language || 'darija',
    style: options?.verbosity === 'normal' ? 'detailed' : 'single_paragraph',
    image: {
      mime: imageMimeType,
      data: imageBase64
    },
    ...(audioBase64 && {
      audio: {
        mime: audioMimeType || 'audio/wav',
        data: audioBase64
      }
    }),
    ...(question && { question })
  };

  console.log('🚀 Demo app sending multimodal request');
  console.log(`📊 Input: image=${!!body.image}, audio=${!!body.audio}, question=${!!question}`);

  return await postJSON<{
    sessionId: string;
    speak: string;
    suggest?: string[];
    tokens_in?: number;
    tokens_out?: number;
    audio_bytes?: number;
    model_ms?: number;
    assist_engine: string;
  }>('/api/live/assist', body);
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

// Voice follow-up function using imageRef + audio transcription
export async function assistVoiceFollowup(
  imageRef: string,
  audioBase64: string,
  audioMimeType: string,
  options?: { verbosity?: 'brief' | 'normal'; language?: 'darija' | 'ar' | 'en' },
  sessionId?: string
) {
  // For now, we'll use a simple approach: transcribe audio to text, then use text follow-up
  // In a full implementation, you might want to send audio directly to a multimodal endpoint

  console.log('🎤 Processing voice follow-up with imageRef:', imageRef);
  console.log('🔊 Audio data length:', audioBase64.length);

  // For now, we'll simulate transcription and use a generic follow-up message
  // In a real implementation, you would transcribe the audio first
  const transcribedQuestion = "ما هذا؟"; // "What is this?" in Arabic as a fallback

  return await assistWithImageRef(
    imageRef,
    transcribedQuestion,
    options,
    sessionId
  );
}

// Clear session memory
export async function clearSessionMemory(sessionId: string) {
  console.log('🗑️ Clearing session memory for:', sessionId);

  const result = await postJSON<{
    success: boolean;
    message: string;
    sessionId: string;
    timestamp: string;
    processingTime: number;
  }>('/api/session/clear', { sessionId });

  console.log('✅ Session memory cleared:', result.message);
  return result;
}

// OCR function for text extraction
export async function ocr(
  imageRef: string,
  full: boolean = true,
  language?: 'darija' | 'ar' | 'en',
  sessionId?: string
) {
  const body = {
    sessionId,
    imageRef,
    full,
    language: language || 'darija'
  };

  console.log('📄 Demo app sending OCR request with imageRef:', imageRef);
  console.log('📄 Full text extraction:', full);

  const result = await postJSON<{
    text: string;
    timing: {
      processing_ms: number;
      total_ms: number;
    };
  }>('/api/ocr-shared', body);

  console.log('✅ Demo app OCR response received, text length:', result.text.length);

  return result;
}

export async function tts(
  text: string,
  voice?: string,
  provider?: 'gemini' | 'elevenlabs',
  rate?: number
) {
  const result = await postJSON<{ audioBase64: string; mimeType?: string }>(`/api/tts-shared`, {
    text,
    voice,
    provider: provider || 'elevenlabs', // Default to ElevenLabs for best quality and speed
    rate
  });

  // Track TTS cost
  const costData: RequestCostData = {
    endpoint: '/api/tts-shared',
    outputChars: text.length,
    ttsUsed: true,
    isLiveEngine: false,
    timestamp: Date.now()
  };
  sessionCostTracker.addRequest(costData);

  return result;
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
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors',
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