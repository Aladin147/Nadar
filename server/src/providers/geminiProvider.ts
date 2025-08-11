import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type { IAIProvider, GenOptions, GenResult } from './IAIProvider';
import { ProviderError } from './ProviderError';

// Error code mapping for consistent error handling
export function mapGeminiError(error: any): { message: string; err_code: string } {
  const errorMessage = error?.message || 'Unknown error';

  if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
    return { message: 'The model took too long. Try again.', err_code: 'TIMEOUT' };
  }
  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return { message: 'Daily limit reached. Try later or switch provider in Settings.', err_code: 'QUOTA' };
  }
  if (errorMessage.includes('unauthorized') || errorMessage.includes('API key')) {
    return { message: 'API key invalid on server.', err_code: 'UNAUTHORIZED' };
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return { message: 'No connection. Check internet or server in Settings.', err_code: 'NETWORK' };
  }
  if (errorMessage.includes('too large') || errorMessage.includes('size')) {
    return { message: 'Image too large. Move closer or try again.', err_code: 'TOO_LARGE' };
  }
  return { message: errorMessage, err_code: 'UNKNOWN' };
}

export function buildSystemPrompt(mode: 'scene'|'ocr'|'ocr_full'|'qa', options?: GenOptions) {
  const verbosity = options?.verbosity ?? 'brief';
  const language = options?.language ?? 'darija';
  const langDir = language === 'darija' ? 'Respond in Darija (Moroccan Arabic).' : language === 'ar' ? 'Respond in Modern Standard Arabic.' : 'Respond in English.';
  const base = {
    scene: `${langDir} You are نظر (Nadar), an AI assistant for blind users in Morocco. You are their eyes, guiding them through daily navigation.

When analyzing images, prioritize by proximity and importance:
1. IMMEDIATE dangers or critical safety information (red lights, obstacles, hazards)
2. Navigation guidance (what's ahead, direction, movement options)
3. Environmental context (location, objects, people nearby)

Format strictly as:
Only respond using Darija in Arabic Script.
IMMEDIATE: [1 short sentence - safety/critical info first]
OBJECTS: [up to 2 bullets - key items by proximity]
NAVIGATION: [1 short sentence - movement guidance]

Keep responses very concise and actionable. Assume users are on the move and need quick, essential information. Don't identify people; avoid reading private screens; express uncertainty when unsure. Never use phrases like "as you can see" or "if you look".`,

    ocr: `${langDir} You are نظر (Nadar), helping blind users read text. Extract visible text and summarize in 2 bullets maximum. If mixed languages are present, note them. Keep responses concise and practical. Avoid reading private or sensitive information.`,

    ocr_full: `${langDir} You are نظر (Nadar), helping blind users read text. Extract and return the full visible text verbatim. No summary. Present the text exactly as it appears, maintaining structure and formatting where possible.`,

    qa: `${langDir} You are نظر (Nadar), answering specific questions for blind users. Provide one short, direct sentence. If uncertain about anything, clearly state you are not sure and suggest one clarifying question. Always prioritize safety - if you see imminent danger or critical information, mention it first regardless of the question asked.`,
  }[mode];
  const vb = verbosity === 'brief' ? ' Keep response to max 3 short bullet points.'
    : verbosity === 'detailed' ? ' Provide more detail but remain structured and concise.'
    : '';
  return base + vb;
}

function toInlineImage(imageBase64: string, mimeType: string = 'image/jpeg') {
  return { inlineData: { data: imageBase64, mimeType } } as const;
}

export class GeminiProvider implements IAIProvider {
  private gen: GoogleGenerativeAI;
  private visionModel: GenerativeModel;
  private ttsModel: GenerativeModel;
  private timeoutMs: number;
  private ttsTimeoutMs: number;

  constructor(genAI?: GoogleGenerativeAI) {
    this.gen = genAI || new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

    // Use 2.5 Flash-Lite (no thinking by default) for optimal speed, or allow override via env var
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

    this.visionModel = this.gen.getGenerativeModel({
      model: modelName
    });

    this.ttsModel = this.gen.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });
    this.timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;
    this.ttsTimeoutMs = Number(process.env.GEMINI_TTS_TIMEOUT_MS) || 20000;
  }

  async describe({ imageBase64, mimeType, options }: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    let timeoutId: NodeJS.Timeout;
    try {
      const sys = buildSystemPrompt('scene', options);
      const parts = [sys, toInlineImage(imageBase64, mimeType)];
      const t0 = Date.now();
      const result = await Promise.race([
        this.visionModel.generateContent(parts as any),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.timeoutMs);
        })
      ]) as any;
      const t1 = Date.now();
      const text = result.response.text();
      const structured = parseSceneStructured(text);
      return { text, timings: { prep: 0, model: t1 - t0, total: t1 - t0 }, structured };
    } catch (error) {
        const { message, err_code } = mapGeminiError(error);
        throw new ProviderError(err_code, message);
    } finally {
      if (timeoutId!) clearTimeout(timeoutId);
    }
  }

  async ocr({ imageBase64, mimeType, options, full }: { imageBase64: string; mimeType?: string; options?: GenOptions; full?: boolean }): Promise<GenResult> {
    let timeoutId: NodeJS.Timeout;
    try {
      const mode = full ? 'ocr_full' : 'ocr';
      const sys = buildSystemPrompt(mode, options);
      const parts = [sys, toInlineImage(imageBase64, mimeType)];
      const t0 = Date.now();
      const result = await Promise.race([
        this.visionModel.generateContent(parts as any),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.timeoutMs);
        })
      ]) as any;
      const t1 = Date.now();
      const text = result.response.text();
      return { text, timings: { prep: 0, model: t1 - t0, total: t1 - t0 } };
    } catch (error) {
        const { message, err_code } = mapGeminiError(error);
        throw new ProviderError(err_code, message);
    } finally {
      if (timeoutId!) clearTimeout(timeoutId);
    }
  }

  async qa({ imageBase64, question, mimeType, options }: { imageBase64: string; question: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    let timeoutId: NodeJS.Timeout;
    try {
      const sys = buildSystemPrompt('qa', options);
      const parts = [sys + `\n\nQUESTION: ${question}`, toInlineImage(imageBase64, mimeType)];
      const t0 = Date.now();
      const result = await Promise.race([
        this.visionModel.generateContent(parts as any),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.timeoutMs);
        })
      ]) as any;
      const t1 = Date.now();
      const text = result.response.text();
      return { text, timings: { prep: 0, model: t1 - t0, total: t1 - t0 } };
    } catch (error) {
        const { message, err_code } = mapGeminiError(error);
        throw new ProviderError(err_code, message);
    } finally {
      if (timeoutId!) clearTimeout(timeoutId);
    }
  }

  async tts({ text, voice, rate }: { text: string; voice?: string; rate?: number }): Promise<{ audioBase64: string; mimeType?: string }> {
    let timeoutId: NodeJS.Timeout;
    try {
      const result = await Promise.race([
          this.ttsModel.generateContent({
              contents: [{ role: 'user', parts: [{ text }] }],
              generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                      voiceConfig: {
                          prebuiltVoiceConfig: {
                              voiceName: voice || 'Kore'
                          }
                      },
                      ...(rate && { speakingRate: rate })
                  }
              }
          } as any),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('TTS timeout')), this.ttsTimeoutMs);
          })
      ]) as any;

      const inline = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData || {};
      const audioBase64 = inline.data || '';
      if (!audioBase64) {
          throw new ProviderError('GEMINI_EMPTY_AUDIO', 'Gemini TTS returned empty audio');
      }
      const mimeType = inline.mimeType || 'audio/wav';
      return { audioBase64, mimeType };
    } catch (error) {
        if (error instanceof ProviderError) throw error;
        const { message, err_code } = mapGeminiError(error);
        throw new ProviderError(err_code, message);
    } finally {
      if (timeoutId!) clearTimeout(timeoutId);
    }
  }
}

function parseSceneStructured(text: string): GenResult['structured'] {
  const structured: GenResult['structured'] = {};
  const lines = text.split(/\r?\n/);
  const getAfter = (prefix: string) => {
    const line = lines.find(l => l.toUpperCase().startsWith(prefix));
    if (!line) return undefined;
    return line.split(':').slice(1).join(':').trim();
  };
  structured.immediate = getAfter('IMMEDIATE:');
  const objectsRaw = getAfter('OBJECTS:');
  if (objectsRaw) {
    const bullets = objectsRaw.split(/\s*[•\-*]\s*/).map(s => s.trim()).filter(Boolean);
    structured.objects = bullets.length ? bullets : objectsRaw.split(',').map(s => s.trim()).filter(Boolean);
  }
  structured.navigation = getAfter('NAVIGATION:');
  if (!structured.immediate && !structured.objects && !structured.navigation) return undefined;
  return structured;
}
