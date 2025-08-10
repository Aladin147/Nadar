import { IAIProvider, GenOptions, GenResult } from './IAIProvider';
import { GeminiProvider } from './geminiProvider';
import { ElevenLabsProvider } from './elevenLabsProvider';

export type TTSProvider = 'gemini' | 'elevenlabs';

export class HybridProvider implements IAIProvider {
  private geminiProvider: GeminiProvider;
  private elevenlabsProvider: ElevenLabsProvider | null = null;
  private defaultTTSProvider: TTSProvider = 'gemini';

  constructor() {
    this.geminiProvider = new GeminiProvider();
    
    // Initialize ElevenLabs if API key is available
    try {
      this.elevenlabsProvider = new ElevenLabsProvider();
      console.log('✅ ElevenLabs provider initialized');
    } catch (error) {
      console.log('⚠️ ElevenLabs provider not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  setTTSProvider(provider: TTSProvider) {
    this.defaultTTSProvider = provider;
    console.log(`🔄 TTS provider switched to: ${provider}`);
  }

  // Vision capabilities - always use Gemini
  async describe(args: { imageBase64: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    return this.geminiProvider.describe(args);
  }

  async ocr(args: { imageBase64: string; mimeType?: string; options?: GenOptions; full?: boolean }): Promise<GenResult> {
    return this.geminiProvider.ocr(args);
  }

  async qa(args: { imageBase64: string; question: string; mimeType?: string; options?: GenOptions }): Promise<GenResult> {
    return this.geminiProvider.qa(args);
  }

  // TTS - use selected provider with fallback
  async tts({ text, voice, provider, rate }: { text: string; voice?: string; provider?: TTSProvider; rate?: number }): Promise<{ audioBase64: string; mimeType?: string }> {
    const selectedProvider = provider || this.defaultTTSProvider;
    
    try {
      if (selectedProvider === 'elevenlabs' && this.elevenlabsProvider) {
        console.log('🎙️ Using ElevenLabs TTS');
        return await this.elevenlabsProvider.tts({ text, voice, rate });
      } else {
        console.log('🎙️ Using Gemini TTS');
        return await this.geminiProvider.tts({ text, voice, rate });
      }
    } catch (error) {
      console.error(`❌ ${selectedProvider} TTS failed:`, error);
      
      // Fallback to the other provider
      const fallbackProvider = selectedProvider === 'gemini' ? 'elevenlabs' : 'gemini';
      console.log(`🔄 Falling back to ${fallbackProvider} TTS`);
      
      try {
        if (fallbackProvider === 'elevenlabs' && this.elevenlabsProvider) {
          return await this.elevenlabsProvider.tts({ text, voice, rate });
        } else {
          return await this.geminiProvider.tts({ text, voice, rate });
        }
      } catch (fallbackError) {
        console.error(`❌ Fallback ${fallbackProvider} TTS also failed:`, fallbackError);
        throw new Error(`Both TTS providers failed. Primary: ${error instanceof Error ? error.message : 'Unknown error'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  // Utility method to check provider availability
  getAvailableProviders(): TTSProvider[] {
    const providers: TTSProvider[] = ['gemini'];
    if (this.elevenlabsProvider) {
      providers.push('elevenlabs');
    }
    return providers;
  }

  getCurrentTTSProvider(): TTSProvider {
    return this.defaultTTSProvider;
  }
}
