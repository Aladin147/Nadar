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

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private config: PerformanceConfig;

  constructor(apiKey: string, config?: Partial<PerformanceConfig>) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  async inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>> {
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
      console.error('Image inspection failed:', error);
      return {
        ok: false,
        error: {
          message: error.message || 'Image inspection failed',
          err_code: 'INSPECTION_ERROR',
          details: error.toString()
        }
      };
    }
  }

  async generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>> {
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
      return {
        ok: false,
        error: {
          message: error.message || 'Response generation failed',
          err_code: 'GENERATION_ERROR',
          details: error.toString()
        }
      };
    }
  }
}
