export type Mode = 'scene' | 'ocr' | 'qa';

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
  };
}

export interface IAIProvider {
  describe(args: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult>;
  ocr(args: { imageBase64: string; mimeType?: string; options?: GenOptions; full?: boolean }): Promise<GenResult>;
  qa(args: { imageBase64: string; question: string; mimeType?: string; options?: GenOptions }): Promise<GenResult>;
  tts(args: { text: string; voice?: string; rate?: number }): Promise<{ audioBase64: string; mimeType?: string }>;
}

