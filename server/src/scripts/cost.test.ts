import { analyzeTelemetryData, calculateRequestCost, PRICING } from '../utils/costAnalysis';
import type { TelemetryData } from '../utils/telemetry';

describe('Cost Estimator', () => {
  const mockTelemetryEntry: TelemetryData = {
    ts: '2024-01-15T10:30:00.000Z',
    mode: 'assist',
    engine: 'gemini',
    route_path: '/assist',
    image_bytes: 50000, // 50KB image
    audio_bytes_in: 0,
    total_ms: 2500,
    model_ms: 2000,
    tts_ms: 500,
    chars_out: 200, // 200 character response
    ok: true,
    provider_name: 'gemini'
  };

  describe('calculateRequestCost', () => {
    it('should calculate costs for a Gemini Flash request', () => {
      const cost = calculateRequestCost(mockTelemetryEntry);
      
      expect(cost.totalCost).toBeGreaterThan(0);
      expect(cost.geminiTotalCost).toBeGreaterThan(0);
      expect(cost.elevenLabsCost).toBeGreaterThan(0); // TTS was used (tts_ms > 0)
      expect(cost.estimatedTokens.input).toBeGreaterThan(0);
      expect(cost.estimatedTokens.output).toBe(50); // 200 chars / 4
      expect(cost.estimatedTokens.image).toBeGreaterThan(0);
    });

    it('should calculate higher costs for Gemini Live', () => {
      const liveEntry = { ...mockTelemetryEntry, engine: 'live' };
      const flashCost = calculateRequestCost(mockTelemetryEntry);
      const liveCost = calculateRequestCost(liveEntry);
      
      expect(liveCost.geminiTotalCost).toBeGreaterThan(flashCost.geminiTotalCost);
    });

    it('should not charge for TTS when not used', () => {
      const noTtsEntry = { ...mockTelemetryEntry, tts_ms: 0 };
      const cost = calculateRequestCost(noTtsEntry);
      
      expect(cost.elevenLabsCost).toBe(0);
      expect(cost.elevenLabsChars).toBe(0);
    });

    it('should handle missing optional fields', () => {
      const minimalEntry: TelemetryData = {
        ts: '2024-01-15T10:30:00.000Z',
        mode: 'describe',
        route_path: '/describe',
        image_bytes: 0,
        audio_bytes_in: 0,
        total_ms: 1000,
        model_ms: 800,
        tts_ms: 0,
        ok: true
      };
      
      const cost = calculateRequestCost(minimalEntry);
      expect(cost.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeTelemetryData', () => {
    const mockLogData = [
      mockTelemetryEntry,
      { ...mockTelemetryEntry, ts: '2024-01-15T11:00:00.000Z', ok: false, err_code: 'TIMEOUT' },
      { ...mockTelemetryEntry, ts: '2024-01-15T11:30:00.000Z', engine: 'live', total_ms: 3000 }
    ];

    it('should analyze telemetry data correctly', () => {
      const stats = analyzeTelemetryData(mockLogData);
      
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.errorRate).toBeCloseTo(1/3);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.latencyStats.p95).toBeGreaterThan(0);
      expect(stats.engineBreakdown).toHaveProperty('gemini');
      expect(stats.engineBreakdown).toHaveProperty('live');
    });

    it('should handle mixed engine data', () => {
      const oldEntry = { ...mockTelemetryEntry, ts: '2020-01-01T00:00:00.000Z' };
      const recentEntry = { ...mockTelemetryEntry, ts: new Date().toISOString() };
      const mixedLogData = [oldEntry, recentEntry];
      
      const stats = analyzeTelemetryData(mixedLogData);
      expect(stats.totalRequests).toBe(2);
    });

    it('should handle single entry', () => {
      const singleEntryData = [mockTelemetryEntry];
      
      const stats = analyzeTelemetryData(singleEntryData);
      expect(stats.totalRequests).toBe(1);
    });

    it('should throw error for empty data', () => {
      expect(() => analyzeTelemetryData([])).toThrow('No valid telemetry entries found');
    });
  });

  describe('PRICING constants', () => {
    it('should have valid pricing structure', () => {
      expect(PRICING.GEMINI_FLASH.INPUT_PER_1M_TOKENS).toBeGreaterThan(0);
      expect(PRICING.GEMINI_FLASH.OUTPUT_PER_1M_TOKENS).toBeGreaterThan(0);
      expect(PRICING.GEMINI_LIVE.INPUT_PER_1M_TOKENS).toBeGreaterThan(PRICING.GEMINI_FLASH.INPUT_PER_1M_TOKENS);
      expect(PRICING.ELEVENLABS.COST_PER_CHARACTER).toBeGreaterThan(0);
    });
  });
});