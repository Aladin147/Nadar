import { 
  logTelemetry, 
  sanitizeRemoteAddr, 
  extractTelemetryContext, 
  calculateRequestSize,
  calculateImageBytes,
  calculateAudioBytes,
  createTelemetryLogger,
  TelemetryData 
} from './telemetry';

// Mock console.log to capture telemetry output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Telemetry Utils', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('logTelemetry', () => {
    it('should log telemetry data as JSON with new schema', () => {
      const telemetryData: TelemetryData = {
        ts: '2024-01-01T00:00:00.000Z',
        mode: 'assist',
        engine: 'gemini',
        route_path: '/assist',
        image_bytes: 1024,
        audio_bytes_in: 512,
        total_ms: 1500,
        model_ms: 1200,
        tts_ms: 300,
        chars_out: 150,
        signals: {
          has_text: true,
          hazards: ['stairs'],
          people_count: 2,
          lighting_ok: true,
          confidence: 0.85
        },
        ok: true,
        err_code: null
      };

      logTelemetry(telemetryData);

      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(telemetryData));
    });

    it('should include backward compatibility bytes_in field', () => {
      const telemetryData: TelemetryData = {
        ts: '2024-01-01T00:00:00.000Z',
        mode: 'describe',
        route_path: '/describe',
        image_bytes: 1024,
        audio_bytes_in: 512,
        total_ms: 1000,
        model_ms: 800,
        tts_ms: 0,
        ok: true,
        bytes_in: 1536 // Should be image_bytes + audio_bytes_in
      };

      logTelemetry(telemetryData);

      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedData.bytes_in).toBe(1536);
      expect(loggedData.image_bytes).toBe(1024);
      expect(loggedData.audio_bytes_in).toBe(512);
    });
  });

  describe('calculateImageBytes', () => {
    it('should calculate image bytes from base64', () => {
      const body = { imageBase64: 'SGVsbG8gV29ybGQ=' }; // "Hello World" in base64
      const bytes = calculateImageBytes(body);
      expect(bytes).toBe(Math.floor('SGVsbG8gV29ybGQ='.length * 0.75));
    });

    it('should return 0 for no image', () => {
      const body = { text: 'hello' };
      const bytes = calculateImageBytes(body);
      expect(bytes).toBe(0);
    });
  });

  describe('calculateAudioBytes', () => {
    it('should calculate audio bytes from base64', () => {
      const body = { audioBase64: 'SGVsbG8gV29ybGQ=' }; // "Hello World" in base64
      const bytes = calculateAudioBytes(body);
      expect(bytes).toBe(Math.floor('SGVsbG8gV29ybGQ='.length * 0.75));
    });

    it('should calculate audio bytes from buffer', () => {
      const audioBuffer = Buffer.from('Hello World');
      const body = { audio: audioBuffer };
      const bytes = calculateAudioBytes(body);
      expect(bytes).toBe(audioBuffer.length);
    });

    it('should return 0 for no audio', () => {
      const body = { text: 'hello' };
      const bytes = calculateAudioBytes(body);
      expect(bytes).toBe(0);
    });
  });

  describe('createTelemetryLogger', () => {
    it('should create logger with new signature', () => {
      const context = {
        route_path: '/test',
        remote_addr: '127.0.0.1',
        user_agent: 'test-agent',
        request_id: 'test-123'
      };

      const logger = createTelemetryLogger('qa', context);
      
      // Test successful log
      logger.log(
        true,      // success
        1000,      // modelMs
        200,       // ttsMs
        1024,      // imageBytes
        512,       // audioBytesIn
        150,       // charsOut
        null,      // errCode
        'gemini-1.5-flash', // modelName
        'gemini',  // providerName
        { has_text: true, hazards: [], people_count: 1, lighting_ok: true, confidence: 0.9 } // signals
      );

      expect(mockConsoleLog).toHaveBeenCalled();
      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      
      expect(loggedData.mode).toBe('qa');
      expect(loggedData.route_path).toBe('/test');
      expect(loggedData.image_bytes).toBe(1024);
      expect(loggedData.audio_bytes_in).toBe(512);
      expect(loggedData.model_ms).toBe(1000);
      expect(loggedData.tts_ms).toBe(200);
      expect(loggedData.chars_out).toBe(150);
      expect(loggedData.ok).toBe(true);
      expect(loggedData.signals.has_text).toBe(true);
      expect(loggedData.bytes_in).toBe(1536); // Backward compatibility
    });
  });

  describe('sanitizeRemoteAddr', () => {
    it('should keep localhost addresses as-is', () => {
      expect(sanitizeRemoteAddr('127.0.0.1')).toBe('127.0.0.1');
      expect(sanitizeRemoteAddr('::1')).toBe('::1');
    });

    it('should mask public IPv4 addresses', () => {
      expect(sanitizeRemoteAddr('203.0.113.45')).toBe('203.0.113.*');
    });

    it('should keep private ranges as-is', () => {
      expect(sanitizeRemoteAddr('192.168.1.1')).toBe('192.168.1.1');
      expect(sanitizeRemoteAddr('10.0.0.1')).toBe('10.0.0.1');
    });
  });
});