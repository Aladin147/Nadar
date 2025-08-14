import { AIProvider, Result, ImageSignals } from '../types/api.js';

interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
    timeoutMs: number;
}
declare enum CircuitState {
    CLOSED = "CLOSED",// Normal operation
    OPEN = "OPEN",// Failing, reject requests
    HALF_OPEN = "HALF_OPEN"
}
interface HealthStatus {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastCheck: string;
    circuitState?: CircuitState;
    details?: string;
}

interface PerformanceConfig {
    fastModel: string;
    qualityModel: string;
    maxPromptLength: number;
    useCompactPrompts: boolean;
    maxImageSize: number;
    compressionQuality: number;
    enableParallelInspection: boolean;
    enableResponseCache: boolean;
    cacheKeyFields: string[];
}

declare class GeminiProvider implements AIProvider {
    private genAI;
    private config;
    private retryConfig;
    constructor(apiKey: string, config?: Partial<PerformanceConfig>, retryConfig?: Partial<RetryConfig>);
    inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>>;
    private performInspection;
    generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>>;
    private performGeneration;
    checkHealth(): Promise<HealthStatus>;
    getCircuitBreakerStatus(): {
        state: CircuitState;
        failures: number;
        successes: number;
    };
    resetCircuitBreaker(): void;
}

export { GeminiProvider };
