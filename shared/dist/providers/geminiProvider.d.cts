import { AIProvider, Result, ImageSignals } from '../types/api.cjs';

interface PerformanceConfig {
    fastModel: string;
    qualityModel: string;
    maxPromptLength: number;
    useCompactPrompts: boolean;
    maxImageSize: number;
    compressionQuality: number;
    enableParallelInspection: boolean;
    enableResponseCache: boolean;
    cacheKeyFields: string[];
}

declare class GeminiProvider implements AIProvider {
    private genAI;
    private config;
    constructor(apiKey: string, config?: Partial<PerformanceConfig>);
    inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>>;
    generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>>;
}

export { GeminiProvider };
