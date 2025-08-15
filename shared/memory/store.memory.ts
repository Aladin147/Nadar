/**
 * In-Memory Session Store
 * 
 * Simple Map-based storage for local development and testing.
 * Data is lost on server restart.
 */

import { SessionStore, SessionShard } from './types';

interface MemoryEntry {
  data: SessionShard;
  expiresAt: number;
}

class MemorySessionStore implements SessionStore {
  private store = new Map<string, MemoryEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(id: string): Promise<SessionShard | null> {
    const entry = this.store.get(id);
    
    if (!entry) {
      console.log(`📖 Memory session get: ${id} -> not found`);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(id);
      console.log(`📖 Memory session get: ${id} -> expired, removed`);
      return null;
    }

    console.log(`📖 Memory session get: ${id} -> found`);
    return entry.data;
  }

  async upsert(id: string, patch: Partial<SessionShard>, ttlSec: number): Promise<void> {
    // Get current data
    const current = this.store.get(id)?.data || {};
    
    // Merge with patch
    const next: SessionShard = { ...current, ...patch };
    
    // Calculate expiration
    const expiresAt = Date.now() + (ttlSec * 1000);
    
    // Store with new TTL
    this.store.set(id, { data: next, expiresAt });
    
    console.log(`💾 Memory session upsert: ${id} (TTL: ${ttlSec}s, expires: ${new Date(expiresAt).toISOString()})`);
  }

  async clear(id: string): Promise<void> {
    const existed = this.store.delete(id);
    console.log(`🗑️ Memory session clear: ${id} -> ${existed ? 'removed' : 'not found'}`);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Memory store cleanup: removed ${cleaned} expired sessions`);
    }
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      totalSessions: this.store.size,
      memoryUsage: JSON.stringify([...this.store.entries()]).length,
    };
  }

  /**
   * Destroy the store and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const MemoryStore = new MemorySessionStore();
