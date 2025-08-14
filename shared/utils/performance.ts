// Performance optimization utilities for Nadar shared core

import { ImageSignals } from '../types/api';

// Performance configuration
export interface PerformanceConfig {
  // Gemini model selection for speed vs quality tradeoff
  fastModel: string;      // For inspection (speed priority)
  qualityModel: string;   // For main response (quality priority)
  
  // Prompt optimization
  maxPromptLength: number;
  useCompactPrompts: boolean;
  
  // Image optimization
  maxImageSize: number;   // Max bytes before compression
  compressionQuality: number; // 0.1-1.0
  
  // Parallel processing
  enableParallelInspection: boolean;
  
  // Caching
  enableResponseCache: boolean;
  cacheKeyFields: string[];
}

// Default performance configuration optimized for 3-4s target
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  fastModel: 'gemini-2.5-flash-lite',     // Fastest for inspection
  qualityModel: 'gemini-2.5-flash',       // Balanced for main response
  maxPromptLength: 1000,                  // Shorter prompts = faster
  useCompactPrompts: true,                // Use optimized prompt templates
  maxImageSize: 1024 * 1024,             // 1MB max before compression
  compressionQuality: 0.8,                // Good quality/speed balance
  enableParallelInspection: false,        // Keep sequential for now
  enableResponseCache: true,              // Cache similar requests
  cacheKeyFields: ['image_hash', 'language', 'question_type']
};

// Image optimization utilities
export function optimizeImageForAI(imageBuffer: Uint8Array, config: PerformanceConfig): Uint8Array {
  // If image is already small enough, return as-is
  if (imageBuffer.length <= config.maxImageSize) {
    return imageBuffer;
  }
  
  // For now, return original - would implement compression here
  // TODO: Implement actual image compression using sharp or similar
  console.log(`⚡ Image size ${imageBuffer.length} bytes exceeds ${config.maxImageSize}, compression needed`);
  return imageBuffer;
}

// Prompt optimization utilities
export function createOptimizedPrompt(
  basePrompt: string, 
  signals: ImageSignals, 
  config: PerformanceConfig
): string {
  if (!config.useCompactPrompts) {
    return basePrompt;
  }
  
  // Create more focused prompts based on signals
  let optimizedPrompt = basePrompt;
  
  // If no text detected, skip text-related instructions
  if (!signals.has_text) {
    optimizedPrompt = optimizedPrompt.replace(/text|reading|signs|labels/gi, '');
  }
  
  // If no people detected, skip people-related instructions
  if (signals.people_count === 0) {
    optimizedPrompt = optimizedPrompt.replace(/people|person|individuals/gi, '');
  }
  
  // Truncate if too long
  if (optimizedPrompt.length > config.maxPromptLength) {
    optimizedPrompt = optimizedPrompt.substring(0, config.maxPromptLength) + '...';
  }
  
  return optimizedPrompt;
}

// Response caching utilities
export interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  
  generateKey(imageHash: string, language: string, question?: string): string {
    const questionType = question ? 'qa' : 'describe';
    return `${imageHash}-${language}-${questionType}`;
  }
  
  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.response;
  }
  
  set(key: string, response: string, ttl?: number): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const globalResponseCache = new ResponseCache();

// Performance monitoring utilities
export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
}

export class PerformanceMonitor {
  private metrics: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private errors = 0;
  private readonly maxSamples = 1000;
  
  recordRequest(responseTimeMs: number, wasCacheHit: boolean, wasError: boolean): void {
    // Record response time
    this.metrics.push(responseTimeMs);
    if (this.metrics.length > this.maxSamples) {
      this.metrics.shift(); // Remove oldest
    }
    
    // Record cache performance
    if (wasCacheHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    // Record errors
    if (wasError) {
      this.errors++;
    }
  }
  
  getMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        lastUpdated: Date.now()
      };
    }
    
    const sorted = [...this.metrics].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const totalRequests = this.metrics.length;
    
    return {
      totalRequests,
      averageResponseTime: this.metrics.reduce((a, b) => a + b, 0) / this.metrics.length,
      p95ResponseTime: sorted[p95Index] || 0,
      cacheHitRate: totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0,
      errorRate: totalRequests > 0 ? this.errors / totalRequests : 0,
      lastUpdated: Date.now()
    };
  }
  
  reset(): void {
    this.metrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
  }
}

// Global performance monitor
export const globalPerformanceMonitor = new PerformanceMonitor();

// Simple hash function for cache keys
export function simpleHash(data: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 1000); i++) { // Sample first 1000 bytes
    hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
  }
  return hash.toString(36);
}
