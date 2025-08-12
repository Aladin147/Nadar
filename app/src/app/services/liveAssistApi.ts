import { API_BASE } from '../../config';

export interface LiveAssistRequest {
  sessionId: string;
  language: 'darija' | 'english' | 'french';
  style: 'single_paragraph' | 'detailed';
  image?: {
    mime: string;
    data: string; // base64
  };
  audio?: {
    mime: string;
    data: string; // base64
  };
  question?: string;
}

export interface LiveAssistResponse {
  sessionId: string;
  speak: string;
  suggest?: string[];
  tokens_in?: number;
  tokens_out?: number;
  audio_bytes?: number;
  model_ms?: number;
  assist_engine: string;
}

export interface LiveAssistError {
  error: string;
  message: string;
  assist_engine: string;
}

/**
 * Call the multimodal live assist API
 * Supports audio + image + text input in a single request
 */
export async function liveAssist(
  sessionId: string,
  options: {
    language?: 'darija' | 'english' | 'french';
    style?: 'single_paragraph' | 'detailed';
    image?: { mime: string; data: string };
    audio?: { mime: string; data: string };
    question?: string;
  }
): Promise<LiveAssistResponse> {
  const startTime = Date.now();
  
  console.log(`🚀 Live assist request: ${sessionId}`);
  console.log(`📊 Input: image=${!!options.image}, audio=${!!options.audio}, question=${!!options.question}`);

  const request: LiveAssistRequest = {
    sessionId,
    language: options.language || 'darija',
    style: options.style || 'single_paragraph',
    ...options
  };

  try {
    const response = await fetch(`${API_BASE}/api/live/assist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData: LiveAssistError = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result: LiveAssistResponse = await response.json();
    const totalTime = Date.now() - startTime;

    console.log(`✅ Live assist response received in ${totalTime}ms`);
    console.log(`📊 Stats: model_ms=${result.model_ms}, audio_bytes=${result.audio_bytes}, tokens=${result.tokens_in}→${result.tokens_out}`);
    console.log(`🎯 Engine: ${result.assist_engine}`);

    return result;

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Live assist failed after ${totalTime}ms:`, error);
    throw error;
  }
}

/**
 * Utility to create a session ID
 */
export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility to prepare image data for the API
 */
export function prepareImageData(imageUri: string, mimeType: string): Promise<{ mime: string; data: string }> {
  return new Promise((resolve, reject) => {
    // For now, we'll assume the imageUri is already base64 or we need to convert it
    // This would typically involve reading the file and converting to base64
    
    if (imageUri.startsWith('data:')) {
      // Data URI format: data:image/jpeg;base64,/9j/4AAQ...
      const [header, data] = imageUri.split(',');
      const mime = header.split(':')[1].split(';')[0];
      resolve({ mime, data });
    } else {
      // File URI - would need to read and convert
      // For now, we'll use a placeholder
      reject(new Error('File URI conversion not implemented yet'));
    }
  });
}

/**
 * Utility to log telemetry data
 */
export function logLiveAssistTelemetry(
  sessionId: string,
  response: LiveAssistResponse,
  totalTime: number,
  hasImage: boolean,
  hasAudio: boolean,
  hasQuestion: boolean
) {
  const telemetry = {
    sessionId,
    assist_engine: response.assist_engine,
    e2e_ms: totalTime,
    model_ms: response.model_ms,
    audio_bytes: response.audio_bytes,
    tokens_in: response.tokens_in,
    tokens_out: response.tokens_out,
    has_image: hasImage,
    has_audio: hasAudio,
    has_text: hasQuestion,
    timestamp: new Date().toISOString()
  };

  console.log('📊 Live Assist Telemetry:', JSON.stringify(telemetry, null, 2));
  
  // In a production app, you'd send this to your analytics service
  // analytics.track('live_assist_completed', telemetry);
}
