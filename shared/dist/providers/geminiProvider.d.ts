import { AIProvider, Result, ImageSignals } from '../types/api.js';

declare class GeminiProvider implements AIProvider {
    private genAI;
    constructor(apiKey: string);
    inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>>;
    generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>>;
}

export { GeminiProvider };
