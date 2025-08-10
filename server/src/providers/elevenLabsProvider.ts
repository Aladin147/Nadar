import { IAIProvider, GenResult } from './IAIProvider';

export class ElevenLabsProvider implements Partial<IAIProvider> {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
  }

  // ElevenLabs doesn't provide vision capabilities, only TTS
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
    try {
      // Map voice names to ElevenLabs voice IDs
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
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
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
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      return {
        audioBase64,
        mimeType: 'audio/mpeg'
      };
    } catch (error) {
      console.error('❌ ElevenLabs TTS error:', error);
      throw error;
    }
  }
}
