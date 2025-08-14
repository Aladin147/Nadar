// Core business logic for TTS endpoint - runtime agnostic

import { 
  Result, 
  ProviderError,
  TelemetryData
} from '../types/api';

export interface TTSRequest {
  sessionId: string;
  text: string;
  voice?: string;
  provider?: 'gemini' | 'elevenlabs';
  rate?: number;
}

export interface TTSResponse {
  audioBase64: string;
  mimeType: string;
  timing: {
    processing_ms: number;
    total_ms: number;
  };
}

export interface TTSDeps {
  telemetry: {
    log(data: TelemetryData): void;
  };
  now: () => number;
  geminiApiKey?: string;
  elevenLabsApiKey?: string;
}

// Core TTS handler - pure business logic
export async function handleTTS(
  request: TTSRequest,
  deps: TTSDeps
): Promise<Result<TTSResponse>> {
  const startTime = deps.now();
  
  try {
    // Validate input
    if (!request.text || request.text.trim().length === 0) {
      const error = {
        message: 'Text is required for TTS generation',
        err_code: 'INVALID_TEXT'
      };
      
      // Log error telemetry
      deps.telemetry.log({
        ts: new Date().toISOString(),
        mode: 'tts',
        engine: request.provider || 'gemini',
        route_path: '/tts',
        image_bytes: 0,
        audio_bytes_in: 0,
        total_ms: deps.now() - startTime,
        model_ms: 0,
        tts_ms: 0,
        chars_out: 0,
        ok: false,
        err_code: error.err_code,
        request_id: request.sessionId
      });
      
      return { ok: false, error };
    }
    
    // Generate TTS
    const processingStart = deps.now();
    const provider = request.provider || 'gemini';
    
    let audioBase64: string;
    let mimeType: string;
    
    if (provider === 'gemini') {
      const result = await generateGeminiTTS(request.text, deps.geminiApiKey);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      audioBase64 = result.data.audioBase64;
      mimeType = result.data.mimeType;
    } else if (provider === 'elevenlabs') {
      const result = await generateElevenLabsTTS(request.text, request.voice, deps.elevenLabsApiKey);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      audioBase64 = result.data.audioBase64;
      mimeType = result.data.mimeType;
    } else {
      const error = {
        message: `Unsupported TTS provider: ${provider}`,
        err_code: 'INVALID_PROVIDER'
      };
      
      // Log error telemetry
      deps.telemetry.log({
        ts: new Date().toISOString(),
        mode: 'tts',
        engine: provider,
        route_path: '/tts',
        image_bytes: 0,
        audio_bytes_in: 0,
        total_ms: deps.now() - startTime,
        model_ms: 0,
        tts_ms: 0,
        chars_out: 0,
        ok: false,
        err_code: error.err_code,
        request_id: request.sessionId
      });
      
      return { ok: false, error };
    }
    
    const processingTime = deps.now() - processingStart;
    const totalTime = deps.now() - startTime;
    
    // Calculate audio bytes
    const audioBytes = Math.floor(audioBase64.length * 0.75); // Base64 overhead
    
    // Log successful telemetry
    deps.telemetry.log({
      ts: new Date().toISOString(),
      mode: 'tts',
      engine: provider,
      route_path: '/tts',
      image_bytes: 0,
      audio_bytes_in: audioBytes,
      total_ms: totalTime,
      model_ms: 0,
      tts_ms: processingTime,
      chars_out: request.text.length,
      ok: true,
      request_id: request.sessionId
    });
    
    return {
      ok: true,
      data: {
        audioBase64,
        mimeType,
        timing: {
          processing_ms: processingTime,
          total_ms: totalTime
        }
      }
    };
    
  } catch (error: any) {
    const totalTime = deps.now() - startTime;
    
    // Log error telemetry
    deps.telemetry.log({
      ts: new Date().toISOString(),
      mode: 'tts',
      engine: request.provider || 'gemini',
      route_path: '/tts',
      image_bytes: 0,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: 0,
      tts_ms: 0,
      chars_out: 0,
      ok: false,
      err_code: error.err_code || 'UNKNOWN',
      request_id: request.sessionId
    });
    
    return {
      ok: false,
      error: {
        message: error.message || 'Internal server error',
        err_code: error.err_code || 'UNKNOWN',
        details: error.details
      }
    };
  }
}

// Gemini TTS implementation
async function generateGeminiTTS(text: string, apiKey?: string): Promise<Result<{audioBase64: string, mimeType: string}>> {
  try {
    if (!apiKey) {
      return {
        ok: false,
        error: {
          message: 'Gemini API key not configured',
          err_code: 'MISSING_API_KEY'
        }
      };
    }

    // For now, return a placeholder since Gemini TTS API details aren't available
    // In production, this would call the actual Gemini TTS API
    return {
      ok: false,
      error: {
        message: 'Gemini TTS not yet implemented',
        err_code: 'NOT_IMPLEMENTED'
      }
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        message: error.message || 'Gemini TTS generation failed',
        err_code: 'GEMINI_TTS_ERROR'
      }
    };
  }
}

// ElevenLabs TTS implementation
async function generateElevenLabsTTS(text: string, voice?: string, apiKey?: string): Promise<Result<{audioBase64: string, mimeType: string}>> {
  try {
    if (!apiKey) {
      return {
        ok: false,
        error: {
          message: 'ElevenLabs API key not configured',
          err_code: 'MISSING_API_KEY'
        }
      };
    }

    const voiceId = voice || 'pNInz6obpgDQGcFmaJgB'; // Default voice
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          message: `ElevenLabs API error: ${response.status} ${response.statusText}`,
          err_code: 'ELEVENLABS_API_ERROR'
        }
      };
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      ok: true,
      data: {
        audioBase64,
        mimeType: 'audio/mpeg'
      }
    };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        message: error.message || 'ElevenLabs TTS generation failed',
        err_code: 'ELEVENLABS_TTS_ERROR'
      }
    };
  }
}
