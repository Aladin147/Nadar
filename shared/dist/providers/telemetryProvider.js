// providers/telemetryProvider.ts
var ConsoleTelemetryLogger = class {
  log(data) {
    console.log(JSON.stringify(data));
  }
};
var RingBufferTelemetryLogger = class {
  buffer = [];
  maxSize;
  constructor(maxSize = 1e3) {
    this.maxSize = maxSize;
  }
  log(data) {
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
    console.log(JSON.stringify(data));
  }
  getRecentEntries(count = 100) {
    return this.buffer.slice(-count);
  }
  getMetrics() {
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
    const successfulCalls = this.buffer.filter((entry) => entry.ok).length;
    const successRate = successfulCalls / totalCalls;
    const latencies = this.buffer.map((entry) => entry.total_ms).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;
    const errorBreakdown = {};
    this.buffer.filter((entry) => !entry.ok && entry.err_code).forEach((entry) => {
      const errCode = entry.err_code;
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
};
export {
  ConsoleTelemetryLogger,
  RingBufferTelemetryLogger
};
//# sourceMappingURL=telemetryProvider.js.map