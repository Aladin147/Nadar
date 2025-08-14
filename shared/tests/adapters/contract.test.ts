// Contract tests to ensure adapter parity

import { describe, it, expect, beforeEach } from 'vitest';
import { createExpressAssistHandler } from '../../adapters/expressAdapter';
import { createVercelAssistHandler } from '../../adapters/vercelAdapter';
import { MockAIProvider, MockTelemetryLogger, MockImageStore } from '../mocks/providers';
import { AssistDeps } from '../../types/api';

// Mock Express Request/Response
class MockExpressRequest {
  public body: any;
  public path: string = '/assist';
  public ip: string = '127.0.0.1';
  public headers: Record<string, string> = { 'user-agent': 'test-agent' };
  public connection = { remoteAddress: '127.0.0.1' };

  constructor(body: any) {
    this.body = body;
  }
}

class MockExpressResponse {
  private statusCode: number = 200;
  private responseData: any;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.responseData = data;
    return this;
  }

  getStatus() { return this.statusCode; }
  getData() { return this.responseData; }
}

// Mock Vercel Request/Response
class MockVercelRequest {
  public method: string = 'POST';
  public body: any;
  public url: string = '/api/assist-shared';
  public headers: Record<string, string> = { 
    'user-agent': 'test-agent',
    'x-forwarded-for': '127.0.0.1'
  };

  constructor(body: any) {
    this.body = body;
  }
}

class MockVercelResponse {
  private statusCode: number = 200;
  private responseData: any;
  private responseHeaders: Record<string, string> = {};

  setHeader(name: string, value: string) {
    this.responseHeaders[name] = value;
    return this;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.responseData = data;
    return this;
  }

  getStatus() { return this.statusCode; }
  getData() { return this.responseData; }
  getHeaders() { return this.responseHeaders; }
}

describe('Adapter Contract Tests', () => {
  let deps: AssistDeps;
  let mockProvider: MockAIProvider;
  let mockTelemetry: MockTelemetryLogger;
  let mockImageStore: MockImageStore;

  beforeEach(() => {
    mockProvider = new MockAIProvider();
    mockTelemetry = new MockTelemetryLogger();
    mockImageStore = new MockImageStore();

    deps = {
      providers: mockProvider,
      telemetry: mockTelemetry,
      imageStore: mockImageStore,
      now: () => Date.now()
    };
  });

  describe('Successful requests', () => {
    it('should produce identical responses from Express and Vercel adapters', async () => {
      const requestBody = {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        language: 'darija',
        sessionId: 'test-session'
      };

      // Test Express adapter
      const expressHandler = createExpressAssistHandler(deps);
      const expressReq = new MockExpressRequest(requestBody);
      const expressRes = new MockExpressResponse();
      
      await expressHandler(expressReq as any, expressRes as any);

      // Test Vercel adapter
      const vercelHandler = createVercelAssistHandler(deps);
      const vercelReq = new MockVercelRequest(requestBody);
      const vercelRes = new MockVercelResponse();
      
      await vercelHandler(vercelReq as any, vercelRes as any);

      // Compare responses
      expect(expressRes.getStatus()).toBe(vercelRes.getStatus());
      
      const expressData = expressRes.getData();
      const vercelData = vercelRes.getData();
      
      // Core response fields should be identical
      expect(expressData.speak).toBe(vercelData.speak);
      expect(expressData.details).toEqual(vercelData.details);
      expect(expressData.signals).toEqual(vercelData.signals);
      expect(expressData.followup_suggest).toEqual(vercelData.followup_suggest);
      
      // Timing may differ slightly, but should be in same ballpark
      expect(Math.abs(expressData.timing.total_ms - vercelData.timing.total_ms)).toBeLessThan(100);
    });

    it('should handle validation errors identically', async () => {
      const invalidRequestBody = {
        // Missing required image data
        language: 'darija',
        sessionId: 'test-session'
      };

      // Test Express adapter
      const expressHandler = createExpressAssistHandler(deps);
      const expressReq = new MockExpressRequest(invalidRequestBody);
      const expressRes = new MockExpressResponse();
      
      await expressHandler(expressReq as any, expressRes as any);

      // Test Vercel adapter
      const vercelHandler = createVercelAssistHandler(deps);
      const vercelReq = new MockVercelRequest(invalidRequestBody);
      const vercelRes = new MockVercelResponse();
      
      await vercelHandler(vercelReq as any, vercelRes as any);

      // Both should return same error status
      expect(expressRes.getStatus()).toBe(vercelRes.getStatus());
      expect(expressRes.getStatus()).toBe(500); // Internal error for missing image
      
      const expressError = expressRes.getData();
      const vercelError = vercelRes.getData();
      
      expect(expressError.error).toBe(vercelError.error);
      expect(expressError.err_code).toBe(vercelError.err_code);
    });
  });

  describe('Error handling parity', () => {
    it('should handle provider errors identically', async () => {
      // Setup provider to fail
      mockProvider.setInspectionResult({
        ok: false,
        error: {
          message: 'Provider inspection failed',
          err_code: 'INSPECTION_ERROR'
        }
      });

      const requestBody = {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        language: 'darija',
        sessionId: 'test-session'
      };

      // Test Express adapter
      const expressHandler = createExpressAssistHandler(deps);
      const expressReq = new MockExpressRequest(requestBody);
      const expressRes = new MockExpressResponse();
      
      await expressHandler(expressReq as any, expressRes as any);

      // Test Vercel adapter
      const vercelHandler = createVercelAssistHandler(deps);
      const vercelReq = new MockVercelRequest(requestBody);
      const vercelRes = new MockVercelResponse();
      
      await vercelHandler(vercelReq as any, vercelRes as any);

      // Both should handle the error identically
      expect(expressRes.getStatus()).toBe(vercelRes.getStatus());
      expect(expressRes.getStatus()).toBe(500);
      
      const expressError = expressRes.getData();
      const vercelError = vercelRes.getData();
      
      expect(expressError.error).toBe(vercelError.error);
      expect(expressError.err_code).toBe(vercelError.err_code);
    });
  });

  describe('Method validation', () => {
    it('should reject non-POST methods in Vercel adapter', async () => {
      const vercelHandler = createVercelAssistHandler(deps);
      const vercelReq = new MockVercelRequest({});
      vercelReq.method = 'GET';
      const vercelRes = new MockVercelResponse();
      
      await vercelHandler(vercelReq as any, vercelRes as any);

      expect(vercelRes.getStatus()).toBe(405);
      expect(vercelRes.getData().err_code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('Header consistency', () => {
    it('should set appropriate headers in Vercel adapter', async () => {
      const requestBody = {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        language: 'darija',
        sessionId: 'test-session'
      };

      const vercelHandler = createVercelAssistHandler(deps);
      const vercelReq = new MockVercelRequest(requestBody);
      const vercelRes = new MockVercelResponse();
      
      await vercelHandler(vercelReq as any, vercelRes as any);

      const headers = vercelRes.getHeaders();
      expect(headers['cache-control']).toBe('no-store');
      expect(headers['x-handler']).toBe('shared-core');
    });
  });
});
