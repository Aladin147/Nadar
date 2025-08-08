import type { IAIProvider, GenOptions, GenResult } from './IAIProvider.js';

export class GeminiProvider implements IAIProvider {
  async describe({ imageBase64, options }: { imageBase64: string; options?: GenOptions }): Promise<GenResult> {
    // TODO: Wire to Gemini vision; for now, pass-through placeholder
    return { text: 'Describe: not implemented yet' };
  }
  async ocr({ imageBase64, options }: { imageBase64: string; options?: GenOptions }): Promise<GenResult> {
    return { text: 'OCR: not implemented yet' };
  }
  async qa({ imageBase64, question, options }: { imageBase64: string; question: string; options?: GenOptions }): Promise<GenResult> {
    return { text: 'Q&A: not implemented yet' };
  }
  async tts({ text, voice }: { text: string; voice?: string }): Promise<{ audioBase64: string }> {
    return { audioBase64: '' };
  }
}

