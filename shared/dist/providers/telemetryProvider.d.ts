import { TelemetryLogger, TelemetryData } from '../types/api.js';

declare class ConsoleTelemetryLogger implements TelemetryLogger {
    log(data: TelemetryData): void;
}
declare class RingBufferTelemetryLogger implements TelemetryLogger {
    private buffer;
    private maxSize;
    constructor(maxSize?: number);
    log(data: TelemetryData): void;
    getRecentEntries(count?: number): TelemetryData[];
    getMetrics(): {
        total_calls: number;
        success_rate: number;
        avg_latency_ms: number;
        p95_latency_ms: number;
        error_breakdown: Record<string, number>;
    };
}

export { ConsoleTelemetryLogger, RingBufferTelemetryLogger };
