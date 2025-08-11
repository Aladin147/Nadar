import { calculateRequestSize, formatBytes, isValidBase64 } from './requestSize';

describe('Request Size Utilities', () => {
  describe('calculateRequestSize', () => {
    it('returns 0 for null or undefined input', () => {
      expect(calculateRequestSize(null)).toBe(0);
      expect(calculateRequestSize(undefined)).toBe(0);
      expect(calculateRequestSize('')).toBe(0);
    });

    it('calculates size for base64 image data', () => {
      const base64Data =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const body = { imageBase64: base64Data };

      // Expected: base64Data.length * 0.75 = 96 * 0.75 = 72
      expect(calculateRequestSize(body)).toBe(72);
    });

    it('calculates size for text content', () => {
      const body = { text: 'Hello, world!' };

      // Expected: 'Hello, world!'.length = 13
      expect(calculateRequestSize(body)).toBe(13);
    });

    it('falls back to JSON stringify for other objects', () => {
      const body = { mode: 'describe', language: 'en' };
      const jsonString = JSON.stringify(body);

      expect(calculateRequestSize(body)).toBe(jsonString.length);
    });

    it('prioritizes imageBase64 over other fields', () => {
      const body = {
        imageBase64: 'dGVzdA==', // 'test' in base64 (8 chars)
        text: 'This text should be ignored',
      };

      // Expected: 8 * 0.75 = 6
      expect(calculateRequestSize(body)).toBe(6);
    });

    it('handles JSON stringify errors gracefully', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;

      expect(calculateRequestSize(circularObj)).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('handles decimal places correctly', () => {
      expect(formatBytes(1234)).toBe('1.2 KB');
      expect(formatBytes(1234567)).toBe('1.2 MB');
    });
  });

  describe('isValidBase64', () => {
    it('validates correct base64 strings', () => {
      expect(isValidBase64('dGVzdA==')).toBe(true);
      expect(isValidBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isValidBase64('YWJjZA==')).toBe(true);
      expect(isValidBase64('YWJjZGU=')).toBe(true);
      expect(isValidBase64('YWJjZGVm')).toBe(true);
    });

    it('rejects invalid base64 strings', () => {
      expect(isValidBase64('')).toBe(false);
      expect(isValidBase64('invalid!')).toBe(false);
      expect(isValidBase64('dGVzdA=')).toBe(false); // Wrong padding
      expect(isValidBase64('dGVzdA===')).toBe(false); // Too much padding
      expect(isValidBase64('dGVzd')).toBe(false); // Wrong length
    });

    it('handles null and undefined input', () => {
      expect(isValidBase64(null as any)).toBe(false);
      expect(isValidBase64(undefined as any)).toBe(false);
    });

    it('handles non-string input', () => {
      expect(isValidBase64(123 as any)).toBe(false);
      expect(isValidBase64({} as any)).toBe(false);
      expect(isValidBase64([] as any)).toBe(false);
    });
  });
});
