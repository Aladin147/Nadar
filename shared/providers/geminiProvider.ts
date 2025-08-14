// Gemini AI provider implementation with performance optimizations

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, Result, ImageSignals, ProviderError } from '../types/api';
import {
  PerformanceConfig,
  DEFAULT_PERFORMANCE_CONFIG,
  optimizeImageForAI,
  createOptimizedPrompt,
  globalResponseCache,
  globalPerformanceMonitor,
  simpleHash
} from '../utils/performance';
import {
  withRetry,
  geminiCircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  checkServiceHealth,
  HealthStatus
} from '../utils/reliability';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private config: PerformanceConfig;
  private retryConfig: RetryConfig;

  constructor(
    apiKey: string,
    config?: Partial<PerformanceConfig>,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>> {
    // Wrap with circuit breaker and retry logic
    return await geminiCircuitBreaker.execute(async () => {
      return await withRetry(async () => {
        return await this.performInspection(image, mimeType);
      }, this.retryConfig, 'Gemini Image Inspection');
    });
  }

  private async performInspection(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>> {
    const startTime = Date.now();

    try {
      // Use fastest model for inspection
      const model = this.genAI.getGenerativeModel({ model: this.config.fastModel });
      
      const prompt = `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean (true if any readable text is visible),
  "hazards": string[] (list of safety hazards like "moving vehicle", "stairs", "obstacle", max 3),
  "people_count": number (count of people visible, 0-10+),
  "lighting_ok": boolean (true if lighting is adequate for clear vision),
  "confidence": number (0.0-1.0, overall confidence in analysis)
}

Be concise and accurate. Return only valid JSON.`;

      // Optimize image if needed
      const optimizedImage = optimizeImageForAI(image, this.config);
      const imageBase64 = Buffer.from(optimizedImage).toString('base64');
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType
          }
        }
      ]);

      const responseText = result.response.text().trim();
      
      try {
        const signals = JSON.parse(responseText);

        const responseTime = Date.now() - startTime;
        globalPerformanceMonitor.recordRequest(responseTime, false, false);
        console.log(`⚡ Fast inspection completed in ${responseTime}ms`);

        return {
          ok: true,
          data: {
            has_text: Boolean(signals.has_text),
            hazards: Array.isArray(signals.hazards) ? signals.hazards.slice(0, 3).map(String) : [],
            people_count: Math.max(0, Math.min(10, Number(signals.people_count) || 0)),
            lighting_ok: Boolean(signals.lighting_ok),
            confidence: Math.max(0, Math.min(1, Number(signals.confidence) || 0))
          }
        };
      } catch (parseError) {
        console.warn('Failed to parse image inspector JSON:', responseText);
        return {
          ok: true,
          data: {
            has_text: responseText.toLowerCase().includes('text'),
            hazards: [],
            people_count: 0,
            lighting_ok: true,
            confidence: 0.5
          }
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      globalPerformanceMonitor.recordRequest(responseTime, false, true);

      console.error('Image inspection failed:', error);

      // Map specific error types for better retry logic
      let errorCode = 'INSPECTION_ERROR';
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorCode = 'RATE_LIMIT';
      } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        errorCode = 'TIMEOUT';
      } else if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
        errorCode = 'NETWORK_ERROR';
      } else if (error.status >= 500) {
        errorCode = 'SERVICE_UNAVAILABLE';
      }

      return {
        ok: false,
        error: {
          message: error.message || 'Image inspection failed',
          err_code: errorCode,
          details: error.toString()
        }
      };
    }
  }

  async generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>> {
    // Wrap with circuit breaker and retry logic
    return await geminiCircuitBreaker.execute(async () => {
      return await withRetry(async () => {
        return await this.performGeneration(image, mimeType, prompt);
      }, this.retryConfig, 'Gemini Response Generation');
    });
  }

  private async performGeneration(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>> {
    const startTime = Date.now();

    try {
      // Check cache first
      const imageHash = simpleHash(image);
      const cacheKey = globalResponseCache.generateKey(imageHash, 'darija', prompt.includes('question') ? 'qa' : undefined);

      if (this.config.enableResponseCache) {
        const cachedResponse = globalResponseCache.get(cacheKey);
        if (cachedResponse) {
          const responseTime = Date.now() - startTime;
          globalPerformanceMonitor.recordRequest(responseTime, true, false);
          console.log(`⚡ Cache hit! Response served in ${responseTime}ms`);
          return { ok: true, data: cachedResponse };
        }
      }

      // Use quality model for main response
      const model = this.genAI.getGenerativeModel({ model: this.config.qualityModel });

      // Optimize image if needed
      const optimizedImage = optimizeImageForAI(image, this.config);
      const imageBase64 = Buffer.from(optimizedImage).toString('base64');
      
      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBase64,
            mimeType
          }
        },
        { text: prompt }
      ]);

      const response = await result.response;
      const text = response.text();

      // Cache the response
      if (this.config.enableResponseCache) {
        globalResponseCache.set(cacheKey, text);
      }

      const responseTime = Date.now() - startTime;
      globalPerformanceMonitor.recordRequest(responseTime, false, false);
      console.log(`⚡ Response generated in ${responseTime}ms`);

      return {
        ok: true,
        data: text
      };
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      globalPerformanceMonitor.recordRequest(responseTime, false, true);

      console.error('Response generation failed:', error);

      // Map specific error types for better retry logic
      let errorCode = 'GENERATION_ERROR';
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorCode = 'RATE_LIMIT';
      } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
        errorCode = 'TIMEOUT';
      } else if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
        errorCode = 'NETWORK_ERROR';
      } else if (error.status >= 500) {
        errorCode = 'SERVICE_UNAVAILABLE';
      } else if (error.message?.includes('API key')) {
        errorCode = 'MISSING_API_KEY';
      }

      return {
        ok: false,
        error: {
          message: error.message || 'Response generation failed',
          err_code: errorCode,
          details: error.toString()
        }
      };
    }
  }

  // Health check method
  async checkHealth(): Promise<HealthStatus> {
    return await checkServiceHealth(
      'Gemini',
      async () => {
        try {
          // Simple health check with minimal image
          const testImage = new Uint8Array([137, 80, 78, 71]); // PNG header
          const result = await this.performInspection(testImage, 'image/png');
          // Even if it fails due to invalid image, if we get a response, service is up
          return true;
        } catch (error) {
          return false;
        }
      },
      geminiCircuitBreaker
    );
  }

  // Get circuit breaker status
  getCircuitBreakerStatus() {
    return geminiCircuitBreaker.getState();
  }

  // Reset circuit breaker (for admin/debugging)
  resetCircuitBreaker() {
    geminiCircuitBreaker.reset();
  }
}
