import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAIProvider, GenOptions, GenResult } from './IAIProvider.js';

export function buildSystemPrompt(mode: 'scene'|'ocr'|'qa', options?: GenOptions) {
  const verbosity = options?.verbosity ?? 'brief';
  const language = options?.language ?? 'darija';
  const langDir = language === 'darija' ? 'Respond in Darija (Moroccan Arabic).' : language === 'ar' ? 'Respond in Modern Standard Arabic.' : 'Respond in English.';
  const base = {
    scene: `${langDir} You are Nadar, assisting blind users. Format strictly as:\nIMMEDIATE: [1 short sentence]\nOBJECTS: [up to 2 bullets]\nNAVIGATION: [1 short sentence]\nKeep each part short and practical. Don’t identify people; avoid private screens; express uncertainty when unsure.`,
    ocr: `${langDir} Extract visible text and summarize in 2 bullets. If mixed languages, note them. Ask the user: 'Do you want a full readout?' Keep it concise.`,
    qa: `${langDir} Answer in one short sentence. If uncertain, say you are not sure and propose one clarifying question. Be helpful and safe.`,
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
  private gen = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  private visionModel = this.gen.getGenerativeModel({ model: 'gemini-2.5-flash' });
  private ttsModel = this.gen.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });

  async describe({ imageBase64, mimeType, options }: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    const sys = buildSystemPrompt('scene', options);
    const parts = [sys, toInlineImage(imageBase64, mimeType)];
    const t0 = Date.now();
    const result = await Promise.race([
      this.visionModel.generateContent(parts as any),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
    ]) as any;
    const t1 = Date.now();
    const text = result.response.text();
    return { text, timings: { modelMs: t1 - t0 } };
  }

  async ocr({ imageBase64, mimeType, options }: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    const sys = buildSystemPrompt('ocr', options);
    const parts = [sys, toInlineImage(imageBase64, mimeType)];
    const t0 = Date.now();
    const result = await Promise.race([
      this.visionModel.generateContent(parts as any),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
    ]) as any;
    const t1 = Date.now();
    const text = result.response.text();
    return { text, timings: { modelMs: t1 - t0 } };
  }

  async qa({ imageBase64, question, mimeType, options }: { imageBase64: string; question: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    const sys = buildSystemPrompt('qa', options);
    const parts = [sys + `\n\nQUESTION: ${question}`, toInlineImage(imageBase64, mimeType)];
    const t0 = Date.now();
    const result = await Promise.race([
      this.visionModel.generateContent(parts as any),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
    ]) as any;
    const t1 = Date.now();
    const text = result.response.text();
    return { text, timings: { modelMs: t1 - t0 } };
  }

  async tts({ text, voice }: { text: string; voice?: string }): Promise<{ audioBase64: string }> {
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
            }
          }
        }
      } as any),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), 20000))
    ]) as any;
    const audioBase64 = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
    return { audioBase64 };
  }
}

