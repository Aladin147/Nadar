import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// TTS endpoint with Gemini and ElevenLabs support
interface TTSRequest {
  text: string;
  voice?: string;
  provider?: 'gemini' | 'elevenlabs';
  rate?: number;
}

interface TTSResponse {
  audioBase64: string;
  mimeType?: string;
}

// ElevenLabs TTS implementation
class ElevenLabsProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = 'https://api.elevenlabs.io';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async tts({ text, voice, rate }: { text: string; voice?: string; rate?: number }): Promise<{ audioBase64: string; mimeType?: string }> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceMap: Record<string, string> = {
      'alloy': 'pNInz6obpgDQGcFmaJgB', // Adam
      'echo': 'VR6AewLTigWG4xSOukaG', // Antoni
      'fable': 'ErXwobaYiN019PkySvjV', // Arnold
      'onyx': 'VR6AewLTigWG4xSOukaG', // Antoni
      'nova': 'jsCqWAovK2LkecY7zXl4', // Bella
      'shimmer': 'AZnzlk1XvdvUeBnXmlld', // Domi
      'Kore': 'OfGMGmhShO8iL9jCkXy8', // Darija voice
      'darija': 'OfGMGmhShO8iL9jCkXy8', // Direct Darija mapping
    };

    const voiceId = voiceMap[voice || 'Kore'] || voiceMap['Kore'];

    const response = await fetch(`${this.baseUrl}/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          speaking_rate: rate || 1.0
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return {
      audioBase64,
      mimeType: 'audio/mpeg'
    };
  }
}

// Gemini TTS implementation
class GeminiTTSProvider {
  private genAI: GoogleGenerativeAI;
  private ttsModel: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.ttsModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });
  }

  async tts({ text, voice, rate }: { text: string; voice?: string; rate?: number }): Promise<{ audioBase64: string; mimeType?: string }> {
    const result = await this.ttsModel.generateContent({
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
    } as any);

    const response = await result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      throw new Error('No audio generated');
    }

    const audioData = candidates[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      throw new Error('No audio data in response');
    }

    return {
      audioBase64: audioData,
      mimeType: 'audio/pcm'
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'tts-endpoint');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      text,
      voice,
      provider = 'gemini',
      rate = 1.0
    }: TTSRequest = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    console.log(`🔊 TTS request: ${text.substring(0, 50)}... (provider: ${provider}, voice: ${voice}, rate: ${rate})`);

    let result: TTSResponse;

    if (provider === 'elevenlabs') {
      const elevenLabs = new ElevenLabsProvider();
      if (!elevenLabs.isAvailable()) {
        console.log('⚠️ ElevenLabs not available, falling back to Gemini');
        const gemini = new GeminiTTSProvider();
        result = await gemini.tts({ text, voice, rate });
      } else {
        console.log('🎙️ Using ElevenLabs TTS');
        result = await elevenLabs.tts({ text, voice, rate });
      }
    } else {
      console.log('🎙️ Using Gemini TTS');
      const gemini = new GeminiTTSProvider();
      result = await gemini.tts({ text, voice, rate });
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ TTS completed in ${processingTime}ms`);

    return res.status(200).json(result);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ TTS error:', error);

    return res.status(500).json({
      error: 'TTS failed',
      message: error?.message || 'Unknown error',
      processingTime
    });
  }
}
