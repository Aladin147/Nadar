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

export function buildSystemPrompt(mode: 'scene'|'ocr'|'ocr_full'|'qa', options?: GenOptions, signals?: any) {
  const verbosity = options?.verbosity ?? 'brief';
  const language = options?.language ?? 'darija';
  const langDir = language === 'darija' ? 'Respond in Darija (Moroccan Arabic).' : language === 'ar' ? 'Respond in Modern Standard Arabic.' : 'Respond in English.';
  
  const base = {
    scene: `${langDir} You are نظر (Nadar), an AI assistant for blind users in Morocco. You are their eyes, guiding them through daily navigation.

Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short Darija paragraph (≤2 sentences) with safety/next-step first",
  "details": ["Additional detail 1", "Additional detail 2", "Additional detail 3"],
  "has_text_content": ${signals?.has_text ? 'true' : 'false'}
}

For the paragraph:
- Start with safety information or immediate next steps
- Keep to maximum 2 sentences in Darija
- Be actionable and concise
${signals?.has_text ? 
  '- IMPORTANT: Since text was detected, mention the visible text content prominently in your response' : 
  '- Focus on scene description and navigation guidance'}

For details array:
- Provide 2-4 additional bullet points for "More" expansion
- Include objects, navigation guidance, environmental context
${signals?.has_text ? '- Include text-related details since text was detected' : ''}
- Keep each detail concise but informative

Don't identify people; avoid reading private screens; express uncertainty when unsure. Never use phrases like "as you can see" or "if you look".`,

    ocr: `${langDir} You are نظر (Nadar), helping blind users read text. 

Format your response as a JSON object:
{
  "paragraph": "One short Darija paragraph (≤2 sentences) summarizing the text content",
  "details": ["Text excerpt 1", "Text excerpt 2", "Additional context"],
  "has_text_content": true
}

Extract visible text and provide a concise summary in the paragraph. Include key text excerpts in details. If mixed languages are present, note them. Avoid reading private or sensitive information.`,

    ocr_full: `${langDir} You are نظر (Nadar), helping blind users read text. Extract and return the full visible text verbatim. No summary. Present the text exactly as it appears, maintaining structure and formatting where possible.`,

    qa: `${langDir} You are نظر (Nadar), answering specific questions for blind users.

Format your response as a JSON object:
{
  "paragraph": "One short Darija sentence directly answering the question first",
  "details": ["Supporting detail 1", "Supporting detail 2"],
  "has_text_content": ${signals?.has_text ? 'true' : 'false'}
}

CRITICAL: Answer the user's question FIRST in the paragraph, then provide context.
${signals?.has_text ? 'Since text was detected, incorporate text information in your answer if relevant.' : ''}

Always prioritize safety - if you see imminent danger or critical information, mention it first regardless of the question asked. If uncertain, clearly state you are not sure.`,
  }[mode];
  
  const vb = verbosity === 'brief' ? ' Keep details concise.'
    : verbosity === 'detailed' ? ' Provide more comprehensive details.'
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

  async describe({ imageBase64, mimeType, options, signals }: { imageBase64: string; mimeType?: string; options?: GenOptions; signals?: any }): Promise<GenResult> {
    let timeoutId: NodeJS.Timeout;
    try {
      const sys = buildSystemPrompt('scene', options, signals);
      const parts = [sys, toInlineImage(imageBase64, mimeType)];
      const t0 = Date.now();
      const result = await Promise.race([
        this.visionModel.generateContent(parts as any),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.timeoutMs);
        })
      ]) as any;
      const t1 = Date.now();
      const responseText = result.response.text();
      
      // Parse JSON response for single-paragraph format
      const { text, structured } = this.parseSingleParagraphResponse(responseText);
      
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

  async qa({ imageBase64, question, mimeType, options, signals }: { imageBase64: string; question: string; mimeType?: string; options?: GenOptions; signals?: any }): Promise<GenResult> {
    let timeoutId: NodeJS.Timeout;
    try {
      const sys = buildSystemPrompt('qa', options, signals);
      const parts = [sys + `\n\nQUESTION: ${question}`, toInlineImage(imageBase64, mimeType)];
      const t0 = Date.now();
      const result = await Promise.race([
        this.visionModel.generateContent(parts as any),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.timeoutMs);
        })
      ]) as any;
      const t1 = Date.now();
      const responseText = result.response.text();
      
      // Parse JSON response for single-paragraph format
      const { text, structured } = this.parseSingleParagraphResponse(responseText);
      
      return { text, timings: { prep: 0, model: t1 - t0, total: t1 - t0 }, structured };
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

  private parseSingleParagraphResponse(responseText: string): { text: string; structured?: GenResult['structured'] } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText.trim());
      
      if (parsed.paragraph && Array.isArray(parsed.details)) {
        return {
          text: parsed.paragraph,
          structured: {
            paragraph: parsed.paragraph,
            details: parsed.details,
            has_text_content: parsed.has_text_content || false
          }
        };
      }
    } catch (parseError) {
      // Fallback: treat entire response as paragraph
      console.warn('Failed to parse single-paragraph JSON response, using fallback:', responseText);
    }
    
    // Fallback: use the entire response as the paragraph
    return {
      text: responseText.trim(),
      structured: {
        paragraph: responseText.trim(),
        details: [],
        has_text_content: false
      }
    };
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
