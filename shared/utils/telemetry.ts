import { TelemetryData, RequestContext, ImageSignals } from '../types/api';

// Shared telemetry utilities for both Express and Vercel

export function logTelemetry(data: TelemetryData): void {
  // Log to stdout as JSON for easy parsing
  console.log(JSON.stringify(data));
}

export function extractTelemetryContext(req: any): RequestContext {
  // Works for both Express Request and VercelRequest
  return {
    route_path: req.url || req.path || 'unknown',
    remote_addr: req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    user_agent: req.headers?.['user-agent'] || 'unknown',
    request_id: req.headers?.['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

export function calculateImageBytes(imageBase64?: string): number {
  if (!imageBase64) return 0;
  // Base64 adds ~33% overhead, so actual image size is ~75% of base64 length
  return Math.floor(imageBase64.length * 0.75);
}

export function calculateAudioBytes(audioBase64?: string): number {
  if (!audioBase64) return 0;
  // Base64 adds ~33% overhead, so actual audio size is ~75% of base64 length
  return Math.floor(audioBase64.length * 0.75);
}

export function createTelemetryLogger(
  mode: 'describe' | 'ocr' | 'qa' | 'tts' | 'assist',
  context: RequestContext
) {
  const startTime = Date.now();

  return {
    log: (
      success: boolean,
      modelMs: number = 0,
      ttsMs: number = 0,
      imageBytes: number = 0,
      audioBytesIn: number = 0,
      charsOut: number = 0,
      errCode: string | null = null,
      modelName?: string,
      providerName?: string,
      signals?: ImageSignals
    ) => {
      const totalMs = Date.now() - startTime;

      logTelemetry({
        ts: new Date().toISOString(),
        mode,
        route_path: context.route_path,
        image_bytes: imageBytes,
        audio_bytes_in: audioBytesIn,
        total_ms: totalMs,
        model_ms: modelMs,
        tts_ms: ttsMs,
        chars_out: charsOut,
        signals,
        ok: success,
        err_code: errCode,
        model_name: modelName,
        provider_name: providerName,
        remote_addr: context.remote_addr,
        user_agent: context.user_agent,
        request_id: context.request_id
      });
    }
  };
}

export function createErrorTelemetry(
  mode: 'describe' | 'ocr' | 'qa' | 'tts' | 'assist',
  context: RequestContext,
  error: any,
  startTime: number
): TelemetryData {
  return {
    ts: new Date().toISOString(),
    mode,
    route_path: context.route_path,
    image_bytes: 0,
    audio_bytes_in: 0,
    total_ms: Date.now() - startTime,
    model_ms: 0,
    tts_ms: 0,
    chars_out: 0,
    ok: false,
    err_code: error.err_code || 'UNKNOWN',
    remote_addr: context.remote_addr,
    user_agent: context.user_agent,
    request_id: context.request_id
  };
}
