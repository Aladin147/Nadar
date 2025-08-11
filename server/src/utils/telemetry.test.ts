import { 
  sanitizeRemoteAddr, 
  extractTelemetryContext, 
  createTelemetryLogger,
  logTelemetry 
} from './telemetry';

describe('Enhanced Telemetry', () => {
  describe('sanitizeRemoteAddr', () => {
    it('preserves localhost addresses', () => {
      expect(sanitizeRemoteAddr('127.0.0.1')).toBe('127.0.0.1');
      expect(sanitizeRemoteAddr('::1')).toBe('::1');
      expect(sanitizeRemoteAddr('::ffff:127.0.0.1')).toBe('::ffff:127.0.0.1');
    });

    it('preserves private network addresses', () => {
      expect(sanitizeRemoteAddr('192.168.1.100')).toBe('192.168.1.100');
      expect(sanitizeRemoteAddr('10.0.0.50')).toBe('10.0.0.50');
      expect(sanitizeRemoteAddr('172.16.0.10')).toBe('172.16.0.10');
    });

    it('masks public IPv4 addresses', () => {
      expect(sanitizeRemoteAddr('203.0.113.45')).toBe('203.0.113.*');
      expect(sanitizeRemoteAddr('8.8.8.8')).toBe('8.8.8.*');
    });

    it('handles undefined addresses', () => {
      expect(sanitizeRemoteAddr(undefined)).toBeUndefined();
    });

    it('masks unrecognized addresses', () => {
      expect(sanitizeRemoteAddr('invalid-ip')).toBe('masked');
    });
  });

  describe('extractTelemetryContext', () => {
    it('extracts context from Express request', () => {
      const mockReq = {
        route: { path: '/test' },
        path: '/test',
        ip: '192.168.1.100',
        get: jest.fn((header: string) => {
          if (header === 'User-Agent') return 'Test-Agent/1.0';
          if (header === 'X-Request-ID') return 'req-123';
          return undefined;
        })
      };

      const context = extractTelemetryContext(mockReq);

      expect(context).toEqual({
        route_path: '/test',
        remote_addr: '192.168.1.100',
        user_agent: 'Test-Agent/1.0',
        request_id: 'req-123'
      });
    });

    it('handles missing request properties', () => {
      const mockReq = {
        get: jest.fn(() => undefined)
      };

      const context = extractTelemetryContext(mockReq);

      expect(context).toEqual({
        route_path: 'unknown',
        remote_addr: undefined,
        user_agent: undefined,
        request_id: undefined
      });
    });
  });

  describe('createTelemetryLogger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('logs enhanced telemetry data', () => {
      const context = {
        route_path: '/test',
        remote_addr: '192.168.1.100',
        user_agent: 'Test-Agent/1.0',
        request_id: 'req-123'
      };

      const logger = createTelemetryLogger('describe', context);
      logger.log(true, 100, 50, 1024, null, 'gemini-1.5-flash', 'gemini');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"mode":"describe"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"route_path":"/test"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"model_name":"gemini-1.5-flash"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"provider_name":"gemini"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"remote_addr":"192.168.1.100"')
      );
    });

    it('logs error telemetry with error codes', () => {
      const context = {
        route_path: '/tts',
        remote_addr: '203.0.113.*',
        user_agent: 'Test-Agent/1.0'
      };

      const logger = createTelemetryLogger('tts', context);
      logger.log(false, 0, 0, 512, 'QUOTA', 'eleven-multilingual-v2', 'elevenlabs');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"ok":false')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"err_code":"QUOTA"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"model_name":"eleven-multilingual-v2"')
      );
    });
  });
});
