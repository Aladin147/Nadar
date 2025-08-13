import { GeminiProvider, buildSystemPrompt, mapGeminiError } from './geminiProvider';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ProviderError } from './ProviderError';

// Mock the GoogleGenerativeAI class
jest.mock('@google/generative-ai');

const mockGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;

describe('buildSystemPrompt', () => {
  it('includes JSON structure for scene mode', () => {
    const p = buildSystemPrompt('scene', { verbosity: 'brief' });
    expect(p).toContain('JSON object');
    expect(p).toContain('"paragraph"');
    expect(p).toContain('"details"');
    expect(p).toContain('safety/next-step first');
  });

  it('adds comprehensive detail note when verbosity is detailed', () => {
    const p = buildSystemPrompt('ocr', { verbosity: 'detailed' });
    expect(p.toLowerCase()).toContain('comprehensive details');
  });

  it('qa prompt encourages uncertainty when unsure', () => {
    const p = buildSystemPrompt('qa');
    expect(p.toLowerCase()).toContain('uncertain');
  });
});

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockGenerateContent: jest.Mock;
  let mockGetGenerativeModel: jest.Mock;
  let mockGenAIInstance: jest.Mocked<GoogleGenerativeAI>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGenerateContent = jest.fn();
    mockGetGenerativeModel = jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    mockGenAIInstance = {
      getGenerativeModel: mockGetGenerativeModel,
    } as any;

    mockGoogleGenerativeAI.mockImplementation(() => mockGenAIInstance);

    provider = new GeminiProvider();
  });

  describe('initialization', () => {
    it('should use gemini-2.5-flash-lite model by default', () => {
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash-lite'
      });
    });

    it('should respect GEMINI_MODEL environment variable', () => {
      const originalEnv = process.env.GEMINI_MODEL;
      process.env.GEMINI_MODEL = 'gemini-1.5-pro';

      new GeminiProvider();

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro'
      });

      process.env.GEMINI_MODEL = originalEnv;
    });
  });

  describe('tts', () => {
    it('should throw ProviderError if the API returns empty audio data', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { candidates: [{ content: { parts: [{ inlineData: { data: '' } }] } }] }
      });
      await expect(provider.tts({ text: 'hello' })).rejects.toHaveProperty('err_code', 'GEMINI_EMPTY_AUDIO');
    });

    it('should return base64 audio data on success', async () => {
      const mockAudioBase64 = 'c29tZSBhdWRpbyBkYXRh';
      mockGenerateContent.mockResolvedValue({
        response: { candidates: [{ content: { parts: [{ inlineData: { data: mockAudioBase64, mimeType: 'audio/mp3' } }] } }] }
      });
      const result = await provider.tts({ text: 'hello' });
      expect(result.audioBase64).toBe(mockAudioBase64);
      expect(result.mimeType).toBe('audio/mp3');
    });

    it('should wrap other errors in ProviderError using mapGeminiError', async () => {
        mockGenerateContent.mockRejectedValue(new Error('quota limit reached'));
        await expect(provider.tts({ text: 'hello' })).rejects.toHaveProperty('err_code', 'QUOTA');
    });
  });

  describe('describe', () => {
    it('should wrap errors in ProviderError', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Request timeout'));
      await expect(provider.describe({ imageBase64: 'test' })).rejects.toHaveProperty('err_code', 'TIMEOUT');
    });
  });

  describe('ocr', () => {
    it('should wrap errors in ProviderError', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Image too large'));
      await expect(provider.ocr({ imageBase64: 'test' })).rejects.toHaveProperty('err_code', 'TOO_LARGE');
    });
  });

  describe('qa', () => {
    it('should wrap errors in ProviderError', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Some unknown API error'));
      await expect(provider.qa({ imageBase64: 'test', question: 'what is this?' })).rejects.toHaveProperty('err_code', 'UNKNOWN');
    });
  });
});
