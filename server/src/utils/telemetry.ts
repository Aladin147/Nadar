// Light telemetry logging for request tracking
export interface TelemetryData {
  ts: string;
  mode: 'describe' | 'ocr' | 'qa' | 'tts';
  bytes_in: number;
  total_ms: number;
  model_ms: number;
  tts_ms: number;
  ok: boolean;
  err_code: string | null;
}

export function logTelemetry(data: TelemetryData): void {
  // Log to stdout as JSON for easy parsing
  console.log(JSON.stringify(data));
}

export function calculateRequestSize(body: any): number {
  // Estimate request size in bytes
  if (body.imageBase64) {
    // Base64 adds ~33% overhead, so actual image size is ~75% of base64 length
    return Math.floor(body.imageBase64.length * 0.75);
  }
  
  if (body.text) {
    // Rough estimate: 1 char ≈ 1 byte for text
    return body.text.length;
  }
  
  return JSON.stringify(body).length;
}

export function createTelemetryLogger(mode: 'describe' | 'ocr' | 'qa' | 'tts') {
  const startTime = Date.now();
  
  return {
    log: (success: boolean, modelMs: number = 0, ttsMs: number = 0, bytesIn: number = 0, errCode: string | null = null) => {
      const totalMs = Date.now() - startTime;
      
      logTelemetry({
        ts: new Date().toISOString(),
        mode,
        bytes_in: bytesIn,
        total_ms: totalMs,
        model_ms: modelMs,
        tts_ms: ttsMs,
        ok: success,
        err_code: errCode
      });
    }
  };
}
