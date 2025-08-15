// Production reliability utilities for Nadar shared core

import { Result, ProviderError } from '../types/api';

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  timeoutMs: number;
}

// Default retry configuration optimized for AI services
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,      // Start with 1s delay
  maxDelayMs: 10000,      // Max 10s delay
  backoffMultiplier: 2,   // Exponential backoff
  retryableErrors: [
    'RATE_LIMIT',
    'TIMEOUT',
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_ERROR'
  ],
  timeoutMs: 30000        // 30s timeout per attempt
};

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  recoveryTimeoutMs: number;   // Time before trying half-open
  successThreshold: number;    // Successes needed to close
  monitoringWindowMs: number;  // Window for failure counting
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,         // Open after 5 failures
  recoveryTimeoutMs: 60000,    // Try recovery after 1 minute
  successThreshold: 2,         // Close after 2 successes
  monitoringWindowMs: 300000   // 5-minute monitoring window
};

// Enhanced error types with specific handling
export interface EnhancedError extends ProviderError {
  isRetryable: boolean;
  isTemporary: boolean;
  suggestedAction: string;
  originalError?: any;
}

// Retry utility with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<Result<T>>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: string = 'operation'
): Promise<Result<T>> {
  let lastError: EnhancedError | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔄 ${context}: Attempt ${attempt}/${config.maxAttempts}`);
      
      // Add timeout to the operation
      const result = await Promise.race([
        operation(),
        new Promise<Result<T>>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), config.timeoutMs)
        )
      ]);
      
      if (result.ok) {
        if (attempt > 1) {
          console.log(`✅ ${context}: Succeeded on attempt ${attempt}`);
        }
        return result;
      }
      
      // Enhance error with retry information
      const errorResult = result as { ok: false; error: ProviderError };
      const enhancedError = enhanceError(errorResult.error, config);
      lastError = enhancedError;
      
      // Check if error is retryable
      if (!enhancedError.isRetryable || attempt === config.maxAttempts) {
        console.log(`❌ ${context}: Non-retryable error or max attempts reached`);
        return { ok: false, error: enhancedError };
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      
      console.log(`⏳ ${context}: Retrying in ${delay}ms (attempt ${attempt + 1})`);
      await sleep(delay);
      
    } catch (error: any) {
      const enhancedError = enhanceError({
        message: error.message || 'Unknown error',
        err_code: 'UNKNOWN'
      }, config);
      
      lastError = enhancedError;
      
      if (attempt === config.maxAttempts) {
        console.log(`❌ ${context}: Max attempts reached with exception`);
        return { ok: false, error: enhancedError };
      }
      
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      
      console.log(`⏳ ${context}: Exception, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  
  return { ok: false, error: lastError! };
}

// Circuit breaker implementation
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;
  
  constructor(name: string, config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG) {
    this.name = name;
    this.config = config;
  }
  
  async execute<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeoutMs) {
        console.log(`🚫 Circuit breaker ${this.name} is OPEN, rejecting request`);
        return {
          ok: false,
          error: {
            message: `Service ${this.name} is temporarily unavailable`,
            err_code: 'CIRCUIT_OPEN'
          }
        };
      } else {
        // Try half-open
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
        console.log(`🔄 Circuit breaker ${this.name} trying HALF_OPEN`);
      }
    }
    
    try {
      const result = await operation();
      
      if (result.ok) {
        this.onSuccess();
        return result;
      } else {
        this.onFailure();
        return result;
      }
    } catch (error: any) {
      this.onFailure();
      return {
        ok: false,
        error: {
          message: error.message || 'Circuit breaker caught exception',
          err_code: 'CIRCUIT_ERROR'
        }
      };
    }
  }
  
  private onSuccess(): void {
    this.successes++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = [];
        console.log(`✅ Circuit breaker ${this.name} is now CLOSED`);
      }
    }
  }
  
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    
    // Clean old failures outside monitoring window
    this.failures = this.failures.filter(
      time => now - time < this.config.monitoringWindowMs
    );
    
    this.failures.push(now);
    
    if (this.failures.length >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.successes = 0;
      console.log(`🚫 Circuit breaker ${this.name} is now OPEN`);
    }
  }
  
  getState(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes
    };
  }
  
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = 0;
    console.log(`🔄 Circuit breaker ${this.name} manually reset`);
  }
}

// Global circuit breakers for different services
export const geminiCircuitBreaker = new CircuitBreaker('Gemini');
export const elevenLabsCircuitBreaker = new CircuitBreaker('ElevenLabs');

// Error enhancement utility
function enhanceError(error: ProviderError, config: RetryConfig): EnhancedError {
  const isRetryable = config.retryableErrors.includes(error.err_code);
  
  let suggestedAction = 'Contact support if problem persists';
  let isTemporary = false;
  
  switch (error.err_code) {
    case 'RATE_LIMIT':
      suggestedAction = 'Reduce request frequency or upgrade API plan';
      isTemporary = true;
      break;
    case 'TIMEOUT':
      suggestedAction = 'Check network connection and try again';
      isTemporary = true;
      break;
    case 'NETWORK_ERROR':
      suggestedAction = 'Check internet connection';
      isTemporary = true;
      break;
    case 'SERVICE_UNAVAILABLE':
      suggestedAction = 'Service is temporarily down, try again later';
      isTemporary = true;
      break;
    case 'INVALID_IMAGE':
      suggestedAction = 'Use a different image or check image format';
      isTemporary = false;
      break;
    case 'MISSING_API_KEY':
      suggestedAction = 'Configure API key in environment variables';
      isTemporary = false;
      break;
  }
  
  return {
    ...error,
    isRetryable,
    isTemporary,
    suggestedAction
  };
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Health check utilities
export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  circuitState?: CircuitState;
  details?: string;
}

export async function checkServiceHealth(
  serviceName: string,
  healthCheck: () => Promise<boolean>,
  circuitBreaker?: CircuitBreaker
): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await Promise.race([
      healthCheck(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      service: serviceName,
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      circuitState: circuitBreaker?.getState().state,
      details: isHealthy ? 'Service responding normally' : 'Service check failed'
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime,
      lastCheck: new Date().toISOString(),
      circuitState: circuitBreaker?.getState().state,
      details: error.message || 'Health check failed'
    };
  }
}
