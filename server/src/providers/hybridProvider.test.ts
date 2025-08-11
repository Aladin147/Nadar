import { HybridProvider } from './hybridProvider';
import { GeminiProvider } from './geminiProvider';
import { ElevenLabsProvider } from './elevenLabsProvider';
import { ProviderError } from './ProviderError';

// Mock the underlying providers
jest.mock('./geminiProvider');
jest.mock('./elevenLabsProvider');

const mockGeminiProvider = GeminiProvider as jest.MockedClass<typeof GeminiProvider>;
const mockElevenLabsProvider = ElevenLabsProvider as jest.MockedClass<typeof ElevenLabsProvider>;

describe('HybridProvider', () => {
  let hybridProvider: HybridProvider;
  let geminiTtsMock: jest.Mock;
  let elevenLabsTtsMock: jest.Mock;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup mock implementations for the TTS methods
    geminiTtsMock = jest.fn().mockResolvedValue({ audioBase64: 'gemini-audio' });
    elevenLabsTtsMock = jest.fn().mockResolvedValue({ audioBase64: 'eleven-audio' });

    // Mock the constructor of the providers to return our mock instances
    mockGeminiProvider.mockImplementation(() => ({
      tts: geminiTtsMock,
    } as any));

    // We need to handle the constructor for ElevenLabs which might throw
    try {
      mockElevenLabsProvider.mockImplementation(() => ({
        tts: elevenLabsTtsMock,
      } as any));
    } catch (e) {
      // This can be ignored in tests where ElevenLabs isn't expected to be constructed
    }

    hybridProvider = new HybridProvider();
  });

  it('should use Gemini by default and succeed', async () => {
    const result = await hybridProvider.tts({ text: 'hello' });
    expect(result.audioBase64).toBe('gemini-audio');
    expect(geminiTtsMock).toHaveBeenCalledTimes(1);
    expect(elevenLabsTtsMock).not.toHaveBeenCalled();
  });

  it('should use ElevenLabs when selected and succeed', async () => {
    hybridProvider.setTTSProvider('elevenlabs');
    const result = await hybridProvider.tts({ text: 'hello' });
    expect(result.audioBase64).toBe('eleven-audio');
    expect(elevenLabsTtsMock).toHaveBeenCalledTimes(1);
    expect(geminiTtsMock).not.toHaveBeenCalled();
  });

  it('should fall back to ElevenLabs if Gemini fails', async () => {
    geminiTtsMock.mockRejectedValue(new ProviderError('GEMINI_ERROR'));

    const result = await hybridProvider.tts({ text: 'hello', provider: 'gemini' });

    expect(result.audioBase64).toBe('eleven-audio');
    expect(geminiTtsMock).toHaveBeenCalledTimes(1);
    expect(elevenLabsTtsMock).toHaveBeenCalledTimes(1);
  });

  it('should fall back to Gemini if ElevenLabs fails', async () => {
    elevenLabsTtsMock.mockRejectedValue(new ProviderError('ELEVEN_ERROR'));

    const result = await hybridProvider.tts({ text: 'hello', provider: 'elevenlabs' });

    expect(result.audioBase64).toBe('gemini-audio');
    expect(elevenLabsTtsMock).toHaveBeenCalledTimes(1);
    expect(geminiTtsMock).toHaveBeenCalledTimes(1);
  });

  it('should throw if both providers fail', async () => {
    geminiTtsMock.mockRejectedValue(new ProviderError('GEMINI_ERROR'));
    elevenLabsTtsMock.mockRejectedValue(new ProviderError('ELEVEN_ERROR'));

    await expect(hybridProvider.tts({ text: 'hello', provider: 'gemini' })).rejects.toThrow('Both TTS providers failed');
  });
});
