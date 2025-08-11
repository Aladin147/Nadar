// Enhanced telemetry logging for request tracking and debugging
export interface TelemetryData {
  ts: string;
  mode: 'describe' | 'ocr' | 'qa' | 'tts';
  route_path: string;
  bytes_in: number;
  total_ms: number;
  model_ms: number;
  tts_ms: number;
  ok: boolean;
  err_code: string | null;
  model_name?: string;
  provider_name?: string;
  remote_addr?: string;
  user_agent?: string;
  request_id?: string;
}

export function logTelemetry(data: TelemetryData): void {
  // Log to stdout as JSON for easy parsing
  console.log(JSON.stringify(data));
}

/**
 * Sanitize remote address for privacy while preserving debugging utility
 * - Keeps local/private IPs as-is for development
 * - Masks public IPs to subnet level for privacy
 */
export function sanitizeRemoteAddr(addr: string | undefined): string | undefined {
  if (!addr) return undefined;

  // Keep localhost and private ranges as-is for debugging
  if (addr === '::1' || addr === '127.0.0.1' || addr.startsWith('::ffff:127.') ||
      addr.startsWith('192.168.') || addr.startsWith('10.') ||
      addr.startsWith('172.16.') || addr.startsWith('172.17.') ||
      addr.startsWith('172.18.') || addr.startsWith('172.19.') ||
      addr.startsWith('172.2') || addr.startsWith('172.3')) {
    return addr;
  }

  // For public IPs, mask to subnet level (e.g., 203.0.113.x -> 203.0.113.*)
  const ipv4Match = addr.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.*`;
  }

  // For IPv6, keep first 64 bits (network portion)
  const ipv6Match = addr.match(/^([0-9a-f:]+)::[0-9a-f:]*$/i);
  if (ipv6Match) {
    return `${ipv6Match[1]}::*`;
  }

  // Fallback: return masked
  return 'masked';
}

/**
 * Extract telemetry context from Express request
 */
export function extractTelemetryContext(req: any): TelemetryContext {
  const remoteAddr = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  const userAgent = req.get('User-Agent');
  const requestId = req.get('X-Request-ID') || req.get('X-Correlation-ID');

  return {
    route_path: req.route?.path || req.path || 'unknown',
    remote_addr: sanitizeRemoteAddr(remoteAddr),
    user_agent: userAgent ? userAgent.substring(0, 200) : undefined, // Limit length
    request_id: requestId
  };
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

export interface TelemetryContext {
  route_path: string;
  remote_addr?: string;
  user_agent?: string;
  request_id?: string;
}

export function createTelemetryLogger(mode: 'describe' | 'ocr' | 'qa' | 'tts', context: TelemetryContext) {
  const startTime = Date.now();

  return {
    log: (
      success: boolean,
      modelMs: number = 0,
      ttsMs: number = 0,
      bytesIn: number = 0,
      errCode: string | null = null,
      modelName?: string,
      providerName?: string
    ) => {
      const totalMs = Date.now() - startTime;

      logTelemetry({
        ts: new Date().toISOString(),
        mode,
        route_path: context.route_path,
        bytes_in: bytesIn,
        total_ms: totalMs,
        model_ms: modelMs,
        tts_ms: ttsMs,
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
