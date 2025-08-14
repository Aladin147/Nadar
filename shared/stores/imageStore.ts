// ImageStore implementations for different environments

import { ImageStore } from '../types/api';

// In-memory implementation for Express server
export class MemoryImageStore implements ImageStore {
  private cache = new Map<string, { buffer: Uint8Array; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [token, entry] of this.cache.entries()) {
        if (entry.expires < now) {
          this.cache.delete(token);
        }
      }
    }, 60000);
  }

  async save(buffer: Uint8Array, ttlMinutes: number = 5): Promise<string> {
    const token = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + (ttlMinutes * 60 * 1000);
    
    this.cache.set(token, { buffer, expires });
    return token;
  }

  async get(token: string): Promise<Uint8Array | null> {
    const entry = this.cache.get(token);
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.cache.delete(token);
      return null;
    }
    
    return entry.buffer;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Global cache implementation for Vercel (best-effort)
export class GlobalImageStore implements ImageStore {
  private static cache = new Map<string, { buffer: Uint8Array; expires: number }>();

  async save(buffer: Uint8Array, ttlMinutes: number = 5): Promise<string> {
    const token = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + (ttlMinutes * 60 * 1000);
    
    // Best-effort global cache (may not persist across cold starts)
    GlobalImageStore.cache.set(token, { buffer, expires });
    return token;
  }

  async get(token: string): Promise<Uint8Array | null> {
    const entry = GlobalImageStore.cache.get(token);
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      GlobalImageStore.cache.delete(token);
      return null;
    }
    
    return entry.buffer;
  }
}

// Vercel Blob implementation (for production)
export class VercelBlobImageStore implements ImageStore {
  constructor(private blobToken: string) {}

  async save(buffer: Uint8Array, ttlMinutes: number = 5): Promise<string> {
    // TODO: Implement Vercel Blob storage
    // For now, fall back to global cache
    const fallback = new GlobalImageStore();
    return fallback.save(buffer, ttlMinutes);
  }

  async get(token: string): Promise<Uint8Array | null> {
    // TODO: Implement Vercel Blob retrieval
    // For now, fall back to global cache
    const fallback = new GlobalImageStore();
    return fallback.get(token);
  }
}
