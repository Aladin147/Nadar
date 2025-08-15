// Robust TTS endpoint using working implementation from MVP
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

  async tts({ text, voice, rate }: { text: string; voice?: string; rate?: number }): Promise<TTSResponse> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Voice mapping for ElevenLabs
    const voiceMap: Record<string, string> = {
      'Kore': 'OfGMGmhShO8iL9jCkXy8', // Correct Kore voice ID
      'default': 'OfGMGmhShO8iL9jCkXy8'
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
        model_id: 'eleven_flash_v2_5', // Updated to Flash v2.5: 50% cheaper + ~75ms latency
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

// Gemini TTS implementation (working version from MVP)
class GeminiTTSProvider {
  private genAI: GoogleGenerativeAI;
  private ttsModel: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.ttsModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });
  }

  async tts({ text, voice, rate }: { text: string; voice?: string; rate?: number }): Promise<TTSResponse> {
    try {
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
      console.log('🔍 Gemini TTS response structure:', JSON.stringify(response, null, 2));

      const candidates = response.candidates;

      if (!candidates || candidates.length === 0) {
        console.error('❌ No candidates in Gemini TTS response');
        throw new Error('No audio generated - no candidates');
      }

      // Try different possible paths for audio data
      let audioData = null;

      // Path 1: Standard inline data path
      audioData = candidates[0]?.content?.parts?.[0]?.inlineData?.data;

      // Path 2: Direct audio data
      if (!audioData) {
        audioData = candidates[0]?.content?.parts?.[0]?.audioData;
      }

      // Path 3: Alternative structure
      if (!audioData) {
        audioData = response.audioData;
      }

      if (!audioData) {
        console.error('❌ No audio data found in any expected path');
        console.error('Candidate structure:', JSON.stringify(candidates[0], null, 2));
        throw new Error('No audio data in response - checked all paths');
      }

      console.log('✅ Found audio data, length:', audioData.length);

      return {
        audioBase64: audioData,
        mimeType: 'audio/pcm'
      };
    } catch (error) {
      console.error('❌ Gemini TTS error:', error);
      throw error;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'shared-tts-endpoint');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      text,
      voice,
      provider = 'elevenlabs', // Default to ElevenLabs as main TTS
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
        try {
          const gemini = new GeminiTTSProvider();
          result = await gemini.tts({ text, voice, rate });
        } catch (geminiError) {
          console.error('❌ Gemini TTS fallback also failed:', geminiError);
          throw new Error(`Both TTS providers failed. ElevenLabs: not configured, Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
        }
      } else {
        console.log('🎙️ Using ElevenLabs TTS');
        result = await elevenLabs.tts({ text, voice, rate });
      }
    } else {
      console.log('🎙️ Using Gemini TTS');
      try {
        const gemini = new GeminiTTSProvider();
        result = await gemini.tts({ text, voice, rate });
      } catch (geminiError) {
        console.error('❌ Gemini TTS failed, trying ElevenLabs fallback:', geminiError);
        const elevenLabs = new ElevenLabsProvider();
        if (elevenLabs.isAvailable()) {
          console.log('🎙️ Falling back to ElevenLabs TTS');
          result = await elevenLabs.tts({ text, voice, rate });
        } else {
          console.error('❌ ElevenLabs fallback not available');
          throw new Error(`Gemini TTS failed: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}, and ElevenLabs is not configured`);
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ TTS completed in ${processingTime}ms`);

    return res.status(200).json({
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      timing: {
        processing_ms: processingTime,
        total_ms: processingTime
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ TTS handler error:', error);

    return res.status(500).json({
      error: error.message || 'TTS generation failed',
      timing: {
        processing_ms: processingTime,
        total_ms: processingTime
      }
    });
  }
}


