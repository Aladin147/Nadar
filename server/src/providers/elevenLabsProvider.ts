import { IAIProvider, GenResult } from './IAIProvider';
import { FetchLike } from './types';
import { ProviderError } from './ProviderError';

export class ElevenLabsProvider implements Partial<IAIProvider> {
  private apiKey: string;
  private baseUrl: string;
  private fetch: FetchLike;

  constructor(opts: {
    apiKey?: string;
    baseUrl?: string;
    fetchImpl?: FetchLike;
  }) {
    this.apiKey = opts.apiKey || process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.baseUrl = opts.baseUrl || 'https://api.elevenlabs.io';
    this.fetch = opts.fetchImpl || globalThis.fetch;
  }

  async describe(): Promise<GenResult> {
    throw new Error('ElevenLabs provider does not support image description');
  }

  async ocr(): Promise<GenResult> {
    throw new Error('ElevenLabs provider does not support OCR');
  }

  async qa(): Promise<GenResult> {
    throw new Error('ElevenLabs provider does not support Q&A');
  }

  async tts({ text, voice, rate }: { text: string; voice?: string; rate?: number }): Promise<{ audioBase64: string; mimeType?: string }> {
    const voiceMap: Record<string, string> = {
      'alloy': 'pNInz6obpgDQGcFmaJgB', // Adam - warm, engaging
      'echo': 'VR6AewLTigWG4xSOukaG', // Antoni - well-rounded
      'fable': 'ErXwobaYiN019PkySvjV', // Arnold - crisp, clear
      'onyx': 'VR6AewLTigWG4xSOukaG', // Antoni (fallback)
      'nova': 'jsCqWAovK2LkecY7zXl4', // Bella - friendly
      'shimmer': 'AZnzlk1XvdvUeBnXmlld', // Domi - confident
      'Kore': 'OfGMGmhShO8iL9jCkXy8', // Darija voice - perfect for Moroccan Arabic
      'darija': 'OfGMGmhShO8iL9jCkXy8', // Direct Darija voice mapping
    };

    const voiceId = voiceMap[voice || 'Kore'] || voiceMap['Kore'];
    const url = `${this.baseUrl}/v1/text-to-speech/${voiceId}`;

    const res = await this.fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'accept': 'audio/mpeg',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.7, style: 0, use_speaker_boost: true },
      }),
    });

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      throw new ProviderError('ELEVENLABS_HTTP_' + res.status, detail);
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('audio/')) {
      const maybeText = await res.text().catch(() => '');
      throw new ProviderError('ELEVENLABS_BAD_CONTENT', maybeText.slice(0, 200));
    }

    const audioBuffer = await res.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      throw new ProviderError('ELEVENLABS_EMPTY_AUDIO', 'empty audio payload');
    }

    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return {
      audioBase64,
      mimeType: 'audio/mpeg'
    };
  }
}
