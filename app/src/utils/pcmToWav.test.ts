import { base64ToUint8Array, pcm16ToWavBytes, uint8ToBase64 } from './pcmToWav';

// 4 samples of 16-bit PCM zero-valued (silence)
const pcm = new Uint8Array([0,0, 0,0, 0,0, 0,0]);

describe('pcm utilities', () => {
  it('wraps pcm into a valid wav header and payload', () => {
    const wav = pcm16ToWavBytes(pcm, 24000, 1);
    // RIFF header
    expect(String.fromCharCode(...wav.slice(0,4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8,12))).toBe('WAVE');
    expect(String.fromCharCode(...wav.slice(12,16))).toBe('fmt ');
    expect(String.fromCharCode(...wav.slice(36,40))).toBe('data');
    // payload length should be 8 bytes
    const dataLen = new DataView(wav.buffer).getUint32(40, true);
    expect(dataLen).toBe(8);
    // payload is all zeros
    expect([...wav.slice(44)]).toEqual([...pcm]);
  });

  it('base64 <-> bytes', () => {
    const b64 = uint8ToBase64(pcm);
    const back = base64ToUint8Array(b64);
    expect(back.length).toBe(pcm.length);
  })
});

