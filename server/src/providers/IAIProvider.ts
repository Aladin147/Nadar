export type Mode = 'scene' | 'ocr' | 'qa';

export interface GenOptions {
  verbosity?: 'brief' | 'normal' | 'detailed';
  language?: 'darija' | 'ar' | 'en';
}

export interface GenResult {
  text: string;
  timings?: { modelMs?: number };
  tokens?: { input?: number; output?: number };
}

export interface IAIProvider {
  describe(args: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult>;
  ocr(args: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult>;
  qa(args: { imageBase64: string; question: string; mimeType?: string; options?: GenOptions }): Promise<GenResult>;
  tts(args: { text: string; voice?: string }): Promise<{ audioBase64: string }>;
}

