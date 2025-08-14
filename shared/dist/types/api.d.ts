type Result<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: ProviderError;
};
interface ProviderError {
    message: string;
    err_code: string;
    details?: string;
}
interface ImageSignals {
    has_text: boolean;
    hazards: string[];
    people_count: number;
    lighting_ok: boolean;
    confidence: number;
}
interface GenOptions {
    verbosity?: 'brief' | 'normal' | 'detailed';
    language?: 'darija' | 'ar' | 'en';
}
interface GenResult {
    text: string;
    timings?: {
        prep?: number;
        model?: number;
        total?: number;
    };
    tokens?: {
        input?: number;
        output?: number;
    };
    structured?: {
        immediate?: string;
        objects?: string[];
        navigation?: string;
        paragraph?: string;
        details?: string[];
        has_text_content?: boolean;
    };
}
interface TTSResult {
    audioBase64: string;
    mimeType?: string;
}
interface AssistRequest {
    sessionId: string;
    image?: Uint8Array;
    imageRef?: string;
    question?: string;
    language?: 'darija' | 'ar' | 'en';
    verbosity?: 'brief' | 'normal' | 'detailed';
}
interface DescribeRequest {
    imageBase64: string;
    mimeType?: string;
    options?: GenOptions;
    sessionId?: string;
}
interface OCRRequest {
    imageBase64: string;
    mimeType?: string;
    options?: GenOptions;
    full?: boolean;
}
interface QARequest {
    imageBase64: string;
    question: string;
    mimeType?: string;
    options?: GenOptions;
}
interface TTSRequest {
    text: string;
    voice?: string;
    provider?: 'gemini' | 'elevenlabs';
    rate?: number;
}
interface AssistResponse {
    speak: string;
    details?: string[];
    signals: ImageSignals;
    followup_suggest?: string[];
    followupToken?: string;
    timing: {
        inspection_ms: number;
        processing_ms: number;
        total_ms: number;
    };
}
interface StandardResponse {
    text: string;
    timings?: {
        modelMs: number;
    };
    tokens?: {
        input: number;
        output: number;
    };
}
interface ErrorResponse {
    error: string;
    err_code: string;
    details?: string;
}
interface TelemetryData {
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
interface ImageStore {
    save(buffer: Uint8Array, ttlMinutes?: number): Promise<string>;
    get(token: string): Promise<Uint8Array | null>;
}
interface AIProvider {
    inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>>;
    generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>>;
}
interface TelemetryLogger {
    log(data: TelemetryData): void;
}
interface AssistDeps {
    providers: AIProvider;
    telemetry: TelemetryLogger;
    imageStore: ImageStore;
    now: () => number;
}
interface RequestContext {
    route_path: string;
    remote_addr?: string;
    user_agent?: string;
    request_id?: string;
}

export type { AIProvider, AssistDeps, AssistRequest, AssistResponse, DescribeRequest, ErrorResponse, GenOptions, GenResult, ImageSignals, ImageStore, OCRRequest, ProviderError, QARequest, RequestContext, Result, StandardResponse, TTSRequest, TTSResult, TelemetryData, TelemetryLogger };
