// Telemetry provider implementations

import { TelemetryLogger, TelemetryData } from '../types/api';

// Console-based telemetry for both Express and Vercel
export class ConsoleTelemetryLogger implements TelemetryLogger {
  log(data: TelemetryData): void {
    // Log to stdout as JSON for easy parsing
    console.log(JSON.stringify(data));
  }
}

// Ring buffer telemetry for Express (enables /metrics endpoint)
export class RingBufferTelemetryLogger implements TelemetryLogger {
  private buffer: TelemetryData[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  log(data: TelemetryData): void {
    // Add to ring buffer
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }

    // Also log to console
    console.log(JSON.stringify(data));
  }

  getRecentEntries(count: number = 100): TelemetryData[] {
    return this.buffer.slice(-count);
  }

  getMetrics(): {
    total_calls: number;
    success_rate: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    error_breakdown: Record<string, number>;
  } {
    if (this.buffer.length === 0) {
      return {
        total_calls: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        p95_latency_ms: 0,
        error_breakdown: {}
      };
    }

    const totalCalls = this.buffer.length;
    const successfulCalls = this.buffer.filter(entry => entry.ok).length;
    const successRate = successfulCalls / totalCalls;

    const latencies = this.buffer.map(entry => entry.total_ms).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;

    const errorBreakdown: Record<string, number> = {};
    this.buffer
      .filter(entry => !entry.ok && entry.err_code)
      .forEach(entry => {
        const errCode = entry.err_code!;
        errorBreakdown[errCode] = (errorBreakdown[errCode] || 0) + 1;
      });

    return {
      total_calls: totalCalls,
      success_rate: successRate,
      avg_latency_ms: avgLatency,
      p95_latency_ms: p95Latency,
      error_breakdown: errorBreakdown
    };
  }
}
