import request from 'supertest';
import express from 'express';
import { metricsRouter, addTelemetryEntry } from './metrics';
import type { TelemetryData } from '../utils/telemetry';

const app = express();
app.use(express.json());
app.use('/metrics', metricsRouter);

// Mock NODE_ENV to be development for testing
const originalNodeEnv = process.env.NODE_ENV;
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('Metrics Endpoint', () => {
  const mockTelemetryEntry: TelemetryData = {
    ts: new Date().toISOString(),
    mode: 'describe',
    engine: 'gemini',
    route_path: '/describe',
    image_bytes: 50000,
    audio_bytes_in: 0,
    total_ms: 2500,
    model_ms: 2000,
    tts_ms: 500,
    chars_out: 200,
    ok: true,
    provider_name: 'gemini'
  };

  beforeEach(() => {
    // Clear any existing telemetry data
    // Note: In a real implementation, you'd want a way to clear the in-memory storage
  });

  it('should return empty metrics when no data is available', async () => {
    const response = await request(app)
      .get('/metrics')
      .expect(200);

    expect(response.body).toMatchObject({
      total_entries: 0,
      time_window_hours: 24,
      recent_calls: [],
      cost_summary: {
        total_estimated_cost: 0,
        average_cost_per_request: 0
      }
    });
  });

  it('should return metrics with telemetry data', async () => {
    // Add some test telemetry data
    addTelemetryEntry(mockTelemetryEntry);
    addTelemetryEntry({
      ...mockTelemetryEntry,
      ts: new Date().toISOString(),
      ok: false,
      err_code: 'TIMEOUT'
    });

    const response = await request(app)
      .get('/metrics')
      .expect(200);

    expect(response.body.total_entries).toBe(2);
    expect(response.body.request_stats.total_requests).toBe(2);
    expect(response.body.request_stats.successful_requests).toBe(1);
    expect(response.body.request_stats.error_rate).toBe(50);
    expect(response.body.latency_stats.count).toBe(2);
    expect(response.body.error_breakdown).toHaveProperty('TIMEOUT');
    expect(response.body.engine_breakdown).toHaveProperty('gemini');
    expect(response.body.recent_calls).toHaveLength(2);
  });

  it('should respect query parameters', async () => {
    addTelemetryEntry(mockTelemetryEntry);

    const response = await request(app)
      .get('/metrics?limit=1&hours=1')
      .expect(200);

    expect(response.body.time_window_hours).toBe(1);
    expect(response.body.recent_calls.length).toBeLessThanOrEqual(1);
  });

  it('should restrict access in production mode', async () => {
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .get('/metrics')
      .expect(403);

    expect(response.body.error).toContain('development mode');
    expect(response.body.err_code).toBe('METRICS_DEV_ONLY');

    process.env.NODE_ENV = 'development';
  });

  it('should include cost estimates in recent calls', async () => {
    addTelemetryEntry(mockTelemetryEntry);

    const response = await request(app)
      .get('/metrics')
      .expect(200);

    expect(response.body.recent_calls[0]).toMatchObject({
      timestamp: expect.any(String),
      mode: 'describe',
      engine: 'gemini',
      latency: 2500,
      success: true,
      cost_estimate: expect.any(Number)
    });

    expect(response.body.recent_calls[0].cost_estimate).toBeGreaterThan(0);
  });

  it('should calculate latency percentiles correctly', async () => {
    // Add entries with different latencies
    const latencies = [1000, 2000, 3000, 4000, 5000];
    latencies.forEach(latency => {
      addTelemetryEntry({
        ...mockTelemetryEntry,
        ts: new Date().toISOString(),
        total_ms: latency
      });
    });

    const response = await request(app)
      .get('/metrics')
      .expect(200);

    // Check that we have the expected latency data (may include previous test data)
    expect(response.body.latency_stats.count).toBeGreaterThanOrEqual(5);
    expect(response.body.latency_stats.min).toBeLessThanOrEqual(1000);
    expect(response.body.latency_stats.max).toBeGreaterThanOrEqual(5000);
    expect(response.body.latency_stats.p95).toBeGreaterThan(0);
    expect(response.body.latency_stats.p50).toBeGreaterThan(0);
  });
});