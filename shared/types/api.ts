// Shared API types for both Express server and Vercel functions

export interface ImageSignals {
  has_text: boolean;
  hazards: string[];
  people_count: number;
  lighting_ok: boolean;
  confidence: number;
}

export interface GenOptions {
  verbosity?: 'brief' | 'normal' | 'detailed';
  language?: 'darija' | 'ar' | 'en';
}

export interface GenResult {
  text: string;
  timings?: { prep?: number; model?: number; total?: number };
  tokens?: { input?: number; output?: number };
  structured?: {
    immediate?: string;
    objects?: string[];
    navigation?: string;
    paragraph?: string;
    details?: string[];
    has_text_content?: boolean;
  };
}

export interface TTSResult {
  audioBase64: string;
  mimeType?: string;
}

// Request types
export interface AssistRequest {
  imageBase64?: string;
  imageRef?: 'last';
  sessionId?: string;
  mimeType?: string;
  question?: string;
  options?: GenOptions;
}

export interface DescribeRequest {
  imageBase64: string;
  mimeType?: string;
  options?: GenOptions;
  sessionId?: string;
}

export interface OCRRequest {
  imageBase64: string;
  mimeType?: string;
  options?: GenOptions;
  full?: boolean;
}

export interface QARequest {
  imageBase64: string;
  question: string;
  mimeType?: string;
  options?: GenOptions;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  provider?: 'gemini' | 'elevenlabs';
  rate?: number;
}

// Response types
export interface AssistResponse {
  result: string;
  signals: ImageSignals;
  model: string;
  timing: {
    inspection_ms: number;
    processing_ms: number;
    total_ms: number;
  };
  structured?: GenResult['structured'];
  paragraph?: string;
  details?: string[];
  show_read_all_text?: boolean;
}

export interface StandardResponse {
  text: string;
  timings?: { modelMs: number };
  tokens?: { input: number; output: number };
}

// Error types
export interface ErrorResponse {
  error: string;
  err_code: string;
  details?: string;
}

// Telemetry types
export interface TelemetryData {
  ts: string;
  mode: 'describe' | 'ocr' | 'qa' | 'tts' | 'assist';
  engine?: string;
  route_path: string;
  image_bytes: number;
  audio_bytes_in: number;
  total_ms: number;
  model_ms: number;
  tts_ms: number;
  chars_out?: number;
  signals?: ImageSignals;
  ok: boolean;
  err_code?: string | null;
  model_name?: string;
  provider_name?: string;
  remote_addr?: string;
  user_agent?: string;
  request_id?: string;
}

// Environment context
export interface RequestContext {
  route_path: string;
  remote_addr?: string;
  user_agent?: string;
  request_id?: string;
}
