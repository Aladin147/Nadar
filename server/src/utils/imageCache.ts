// Simple image cache to avoid re-processing the same images
const recentImages = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum number of cached images

export interface CachedImageResult {
  data: string;
  cached: boolean;
}

export async function cacheOrResolveImage(imageBase64: string): Promise<CachedImageResult> {
  // Clean up expired entries
  const now = Date.now();
  for (const [key, value] of recentImages.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      recentImages.delete(key);
    }
  }
  
  // Check if image is in cache
  const cached = recentImages.get(imageBase64);
  if (cached) {
    return { data: cached.data, cached: true };
  }
  
  // If cache is full, remove oldest entry
  if (recentImages.size >= MAX_CACHE_SIZE) {
    const oldestKey = recentImages.keys().next().value;
    if (oldestKey) {
      recentImages.delete(oldestKey);
    }
  }
  
  // Add to cache
  recentImages.set(imageBase64, { data: imageBase64, timestamp: now });
  
  return { data: imageBase64, cached: false };
}
