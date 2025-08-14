// Unit tests for assistCore business logic

import { describe, it, expect, beforeEach } from 'vitest';
import { handleAssist } from '../../core/assistCore';
import { MockAIProvider, MockTelemetryLogger, MockImageStore } from '../mocks/providers';
import { AssistRequest, AssistDeps } from '../../types/api';

describe('assistCore', () => {
  let mockProvider: MockAIProvider;
  let mockTelemetry: MockTelemetryLogger;
  let mockImageStore: MockImageStore;
  let deps: AssistDeps;
  let mockNow: () => number;
  let currentTime: number;

  beforeEach(() => {
    mockProvider = new MockAIProvider();
    mockTelemetry = new MockTelemetryLogger();
    mockImageStore = new MockImageStore();
    currentTime = 1000;
    mockNow = () => {
      currentTime += 10; // Advance time by 10ms each call
      return currentTime;
    };

    deps = {
      providers: mockProvider,
      telemetry: mockTelemetry,
      imageStore: mockImageStore,
      now: mockNow
    };
  });

  describe('successful requests', () => {
    it('should handle basic image request successfully', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session',
        image: new Uint8Array([1, 2, 3, 4]),
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.speak).toBe('Test response paragraph');
        expect(result.data.details).toEqual(['Detail 1', 'Detail 2', 'Detail 3']);
        expect(result.data.signals).toEqual({
          has_text: false,
          hazards: [],
          people_count: 0,
          lighting_ok: true,
          confidence: 0.85
        });
        expect(result.data.followupToken).toMatch(/^test-token-\d+$/);
        expect(result.data.timing.total_ms).toBeGreaterThan(0);
      }
    });

    it('should handle imageRef requests with cached image', async () => {
      // First save an image
      const imageBuffer = new Uint8Array([1, 2, 3, 4]);
      const token = await mockImageStore.save(imageBuffer);

      const request: AssistRequest = {
        sessionId: 'test-session',
        imageRef: token,
        language: 'en'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.speak).toBe('Test response paragraph');
        expect(result.data.followup_suggest).toEqual([
          'Read all text?',
          'Where is the clear path?',
          'What is next to me?'
        ]);
      }
    });

    it('should handle questions correctly', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session',
        image: new Uint8Array([1, 2, 3, 4]),
        question: 'What do you see?',
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(true);
      // Verify telemetry logs the request as 'qa' mode
      const log = mockTelemetry.getLastLog();
      expect(log?.mode).toBe('qa');
    });

    it('should generate proper followup suggestions for different languages', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session',
        image: new Uint8Array([1, 2, 3, 4]),
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.followup_suggest).toEqual([
          'نقرا النص كامل؟',
          'فين الممر الخالي؟',
          'شنو كاين حداي؟'
        ]);
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing image gracefully', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session',
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('No valid image provided');
        expect(result.error.err_code).toBe('INVALID_IMAGE');
      }
    });

    it('should handle invalid imageRef gracefully', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session',
        imageRef: 'invalid-token',
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('No cached image found for imageRef: invalid-token');
        expect(result.error.err_code).toBe('IMAGE_NOT_FOUND');
      }
    });

    it('should handle AI provider inspection errors', async () => {
      mockProvider.setInspectionResult({
        ok: false,
        error: {
          message: 'Inspection failed',
          err_code: 'INSPECTION_ERROR'
        }
      });

      const request: AssistRequest = {
        sessionId: 'test-session',
        image: new Uint8Array([1, 2, 3, 4]),
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Inspection failed');
        expect(result.error.err_code).toBe('INSPECTION_ERROR');
      }
    });

    it('should handle AI provider response generation errors', async () => {
      mockProvider.setResponseResult({
        ok: false,
        error: {
          message: 'Generation failed',
          err_code: 'GENERATION_ERROR'
        }
      });

      const request: AssistRequest = {
        sessionId: 'test-session',
        image: new Uint8Array([1, 2, 3, 4]),
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Generation failed');
        expect(result.error.err_code).toBe('GENERATION_ERROR');
      }
    });
  });

  describe('telemetry logging', () => {
    it('should log successful requests correctly', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session-123',
        image: new Uint8Array([1, 2, 3, 4]),
        language: 'darija'
      };

      await handleAssist(request, deps);

      const log = mockTelemetry.getLastLog();
      expect(log).toBeDefined();
      expect(log?.mode).toBe('describe');
      expect(log?.ok).toBe(true);
      expect(log?.request_id).toBe('test-session-123');
      expect(log?.image_bytes).toBe(4);
      expect(log?.total_ms).toBeGreaterThan(0);
      expect(log?.signals).toEqual({
        has_text: false,
        hazards: [],
        people_count: 0,
        lighting_ok: true,
        confidence: 0.85
      });
    });

    it('should log failed requests correctly', async () => {
      const request: AssistRequest = {
        sessionId: 'test-session-456',
        language: 'darija'
        // Missing image - should cause error
      };

      const result = await handleAssist(request, deps);
      expect(result.ok).toBe(false); // Verify it actually failed

      const log = mockTelemetry.getLastLog();
      expect(log).toBeDefined();
      expect(log?.ok).toBe(false);
      expect(log?.err_code).toBe('INVALID_IMAGE');
      expect(log?.request_id).toBe('test-session-456');
    });
  });

  describe('timing and performance', () => {
    it('should track timing correctly', async () => {
      let timeStep = 0;
      mockNow = () => {
        timeStep += 100; // Each call advances by 100ms
        return timeStep;
      };
      deps.now = mockNow;

      const request: AssistRequest = {
        sessionId: 'test-session',
        image: new Uint8Array([1, 2, 3, 4]),
        language: 'darija'
      };

      const result = await handleAssist(request, deps);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.timing.inspection_ms).toBe(100);
        expect(result.data.timing.processing_ms).toBe(100);
        expect(result.data.timing.total_ms).toBeGreaterThan(200);
      }
    });
  });
});
