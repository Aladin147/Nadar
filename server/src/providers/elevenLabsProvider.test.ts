import { ElevenLabsProvider } from './elevenLabsProvider';
import { ProviderError } from './ProviderError';
import { Buffer } from 'buffer';

// Helper to create mock Response objects
function responseFrom(body: Buffer | string, init?: ResponseInit) {
  // Ensure we pass an ArrayBuffer that is not a SharedArrayBuffer by slicing and casting
  const blob = typeof body === 'string'
    ? new Blob([body])
    : new Blob([body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)] as any);
  return new Response(blob, {
    status: 200,
    headers: { 'content-type': 'audio/mpeg' },
    ...init,
  });
}

describe('ElevenLabsProvider', () => {
  it('should return base64 on 200 audio response', async () => {
    const audio = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const mockFetch = jest.fn().mockResolvedValue(responseFrom(audio));
    const provider = new ElevenLabsProvider({ apiKey: 'test-key', fetchImpl: mockFetch });

    const result = await provider.tts({ text: 'salam' });

    expect(result.audioBase64).toBe(audio.toString('base64'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should throw ProviderError with HTTP status code on non-200 response', async () => {
    const mockFetch = jest.fn().mockResolvedValue(new Response('quota', { status: 429 }));
    const provider = new ElevenLabsProvider({ apiKey: 'test-key', fetchImpl: mockFetch });

    await expect(provider.tts({ text: 'salam' })).rejects.toThrow(new ProviderError('ELEVENLABS_HTTP_429', 'quota'));
  });

  it('should throw ProviderError on non-audio content-type', async () => {
    const mockFetch = jest.fn().mockResolvedValue(responseFrom(JSON.stringify({ error: 'x' }), {
      headers: { 'content-type': 'application/json' }
    }));
    const provider = new ElevenLabsProvider({ apiKey: 'test-key', fetchImpl: mockFetch });

    await expect(provider.tts({ text: 'salam' })).rejects.toThrow(new ProviderError('ELEVENLABS_BAD_CONTENT', '{\"error\":\"x\"}'));
  });

  it('should throw ProviderError on empty audio payload', async () => {
    const mockFetch = jest.fn().mockResolvedValue(responseFrom(Buffer.alloc(0)));
    const provider = new ElevenLabsProvider({ apiKey: 'test-key', fetchImpl: mockFetch });

    await expect(provider.tts({ text: 'salam' })).rejects.toThrow(new ProviderError('ELEVENLABS_EMPTY_AUDIO', 'empty audio payload'));
  });
});
