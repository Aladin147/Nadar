/**
 * Vercel KV Session Store
 * 
 * Uses @vercel/kv (Upstash) for persistent session storage with TTL.
 */

import { SessionStore, SessionShard } from './types';

// Conditional import for Vercel KV
let kv: any = null;
try {
  // Only import if running in Vercel environment
  if (process.env.VERCEL || process.env.VERCEL_KV_URL) {
    kv = require('@vercel/kv').kv;
  }
} catch (error) {
  console.warn('⚠️ Vercel KV not available, falling back to memory store');
}

const key = (id: string) => `sess:${id}`;

export const VercelKVStore: SessionStore = {
  async get(id: string): Promise<SessionShard | null> {
    if (!kv) {
      console.warn('⚠️ KV not available for get operation');
      return null;
    }
    
    try {
      const result = await kv.get<SessionShard>(key(id));
      console.log(`📖 Session get: ${id} -> ${result ? 'found' : 'not found'}`);
      return result ?? null;
    } catch (error) {
      console.error('❌ KV get error:', error);
      return null; // Graceful degradation
    }
  },

  async upsert(id: string, patch: Partial<SessionShard>, ttlSec: number): Promise<void> {
    if (!kv) {
      console.warn('⚠️ KV not available for upsert operation');
      return;
    }

    try {
      // Get current data
      const current = await kv.get<SessionShard>(key(id)) || {};
      
      // Merge with patch
      const next: SessionShard = { ...current, ...patch };
      
      // Set with TTL refresh
      await kv.set(key(id), next, { ex: ttlSec });
      
      console.log(`💾 Session upsert: ${id} (TTL: ${ttlSec}s)`);
    } catch (error) {
      console.error('❌ KV upsert error:', error);
      // Don't throw - graceful degradation
    }
  },

  async clear(id: string): Promise<void> {
    if (!kv) {
      console.warn('⚠️ KV not available for clear operation');
      return;
    }

    try {
      await kv.del(key(id));
      console.log(`🗑️ Session cleared: ${id}`);
    } catch (error) {
      console.error('❌ KV clear error:', error);
      // Don't throw - graceful degradation
    }
  },
};

/**
 * Check if Vercel KV is available
 */
export const isKVAvailable = (): boolean => {
  return kv !== null;
};
