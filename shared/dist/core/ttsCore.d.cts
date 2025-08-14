import { TelemetryData, Result } from '../types/api.cjs';

interface TTSRequest {
    sessionId: string;
    text: string;
    voice?: string;
    provider?: 'gemini' | 'elevenlabs';
    rate?: number;
}
interface TTSResponse {
    audioBase64: string;
    mimeType: string;
    timing: {
        processing_ms: number;
        total_ms: number;
    };
}
interface TTSDeps {
    telemetry: {
        log(data: TelemetryData): void;
    };
    now: () => number;
    geminiApiKey?: string;
    elevenLabsApiKey?: string;
}
declare function handleTTS(request: TTSRequest, deps: TTSDeps): Promise<Result<TTSResponse>>;

export { type TTSDeps, type TTSRequest, type TTSResponse, handleTTS };
