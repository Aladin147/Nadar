import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Performance configuration for optimal speed vs quality balance
export const PERFORMANCE_CONFIG = {
  // Image optimization settings
  maxImageSize: 512, // Reduced from 1024 for faster processing
  compressionQuality: 0.6, // Reduced from 0.8 for smaller payloads
  maxImageBytes: 200 * 1024, // 200KB max to ensure fast uploads
  
  // Network settings
  requestTimeout: 15000, // 15s timeout instead of 30s
  retryAttempts: 1, // Reduce retries for faster failure detection
  
  // Processing settings
  enableParallelProcessing: true,
  enableImageCaching: true,
  enablePrecompression: true,
};

// Performance telemetry for monitoring
interface PerformanceTelemetry {
  imageProcessingMs: number;
  networkMs: number;
  serverProcessingMs: number;
  totalMs: number;
  imageSizeBytes: number;
  compressionRatio: number;
}

let performanceData: PerformanceTelemetry[] = [];

export function logPerformance(data: PerformanceTelemetry) {
  performanceData.push(data);
  
  // Keep only last 10 entries
  if (performanceData.length > 10) {
    performanceData = performanceData.slice(-10);
  }
  
  console.log('📊 Performance:', {
    total: `${data.totalMs}ms`,
    breakdown: `img:${data.imageProcessingMs}ms + net:${data.networkMs}ms + srv:${data.serverProcessingMs}ms`,
    size: `${Math.round(data.imageSizeBytes / 1024)}KB`,
    compression: `${Math.round(data.compressionRatio * 100)}%`
  });
}

export function getPerformanceStats() {
  if (performanceData.length === 0) return null;
  
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  return {
    averageTotal: Math.round(avg(performanceData.map(d => d.totalMs))),
    averageImageProcessing: Math.round(avg(performanceData.map(d => d.imageProcessingMs))),
    averageNetwork: Math.round(avg(performanceData.map(d => d.networkMs))),
    averageServerProcessing: Math.round(avg(performanceData.map(d => d.serverProcessingMs))),
    averageImageSize: Math.round(avg(performanceData.map(d => d.imageSizeBytes)) / 1024),
    sampleCount: performanceData.length
  };
}

// Optimized image processing with aggressive compression
export async function optimizeImageForAI(
  uri: string,
  maxSize: number = PERFORMANCE_CONFIG.maxImageSize,
  quality: number = PERFORMANCE_CONFIG.compressionQuality
): Promise<{ uri: string; base64: string; mimeType: string; originalSize: number; optimizedSize: number }> {
  const startTime = Date.now();
  
  try {
    // Step 1: Get original image info
    const originalInfo = await getImageInfo(uri);
    
    // Step 2: Calculate optimal dimensions
    const { width, height } = calculateOptimalDimensions(
      originalInfo.width,
      originalInfo.height,
      maxSize
    );
    
    // Step 3: Aggressive compression with multiple passes if needed
    let result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width, height } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    
    if (!result.base64) {
      throw new Error('Failed to generate base64');
    }
    
    // Step 4: Check if we need additional compression
    const base64Size = result.base64.length;
    const estimatedBytes = (base64Size * 3) / 4; // Convert base64 length to bytes
    
    if (estimatedBytes > PERFORMANCE_CONFIG.maxImageBytes && quality > 0.3) {
      // Apply additional compression
      const newQuality = Math.max(0.3, quality * 0.7);
      console.log(`🔄 Image too large (${Math.round(estimatedBytes/1024)}KB), recompressing with quality ${newQuality}`);
      
      result = await ImageManipulator.manipulateAsync(
        result.uri,
        [],
        {
          compress: newQuality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      if (!result.base64) {
        throw new Error('Failed to generate base64 after recompression');
      }
    }
    
    const processingTime = Date.now() - startTime;
    const finalSize = (result.base64.length * 3) / 4;
    const compressionRatio = finalSize / originalInfo.size;
    
    console.log(`⚡ Image optimized in ${processingTime}ms: ${Math.round(originalInfo.size/1024)}KB → ${Math.round(finalSize/1024)}KB (${Math.round(compressionRatio*100)}%)`);
    
    return {
      uri: result.uri,
      base64: result.base64,
      mimeType: 'image/jpeg',
      originalSize: originalInfo.size,
      optimizedSize: finalSize
    };
    
  } catch (error) {
    console.error('❌ Image optimization failed:', error);
    throw new Error('Failed to optimize image for AI processing');
  }
}

// Get image dimensions and file size
async function getImageInfo(uri: string): Promise<{ width: number; height: number; size: number }> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        // Estimate size for web (rough approximation)
        const estimatedSize = img.width * img.height * 3; // RGB bytes
        resolve({ width: img.width, height: img.height, size: estimatedSize });
      };
      img.onerror = reject;
      img.src = uri;
    });
  } else {
    // For React Native, we need to use a different approach
    const { Image } = require('react-native');
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width: number, height: number) => {
          // Estimate file size based on dimensions
          const estimatedSize = width * height * 2; // Rough estimate
          resolve({ width, height, size: estimatedSize });
        },
        reject
      );
    });
  }
}

// Calculate optimal dimensions while maintaining aspect ratio
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }
  
  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize
    };
  }
}

// Preload and cache common operations
export class PerformanceCache {
  private static imageCache = new Map<string, string>();
  private static maxCacheSize = 5; // Keep last 5 images
  
  static cacheImage(uri: string, base64: string) {
    if (this.imageCache.size >= this.maxCacheSize) {
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    this.imageCache.set(uri, base64);
  }
  
  static getCachedImage(uri: string): string | null {
    return this.imageCache.get(uri) || null;
  }
  
  static clearCache() {
    this.imageCache.clear();
  }
}

// Network optimization utilities
export function createOptimizedFetch(timeoutMs: number = PERFORMANCE_CONFIG.requestTimeout) {
  return async function optimizedFetch(url: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // Add compression headers
        headers: {
          ...options.headers,
          'Accept-Encoding': 'gzip, deflate, br',
          'Content-Encoding': 'gzip'
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
}
