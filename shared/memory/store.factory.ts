/**
 * Session Store Factory
 * 
 * Chooses the appropriate store implementation based on environment.
 */

import { SessionStore, FEATURE_FLAGS } from './types';
import { VercelKVStore, isKVAvailable } from './store.vercel';
import { MemoryStore } from './store.memory';

/**
 * Get the appropriate session store for the current environment
 */
export function getSessionStore(): SessionStore {
  // Check if RSM is enabled
  if (!FEATURE_FLAGS.RSM_ENABLED) {
    console.log('📝 RSM disabled, using no-op store');
    return createNoOpStore();
  }

  // Try Vercel KV first
  if (isKVAvailable()) {
    console.log('📝 Using Vercel KV store for sessions');
    return VercelKVStore;
  }

  // Fallback to memory store
  console.log('📝 Using memory store for sessions (dev mode)');
  return MemoryStore;
}

/**
 * Create a no-op store that does nothing (when RSM is disabled)
 */
function createNoOpStore(): SessionStore {
  return {
    async get(id: string) {
      return null;
    },
    async upsert(id: string, patch: any, ttlSec: number) {
      // Do nothing
    },
    async clear(id: string) {
      // Do nothing
    },
  };
}

/**
 * Test store connectivity
 */
export async function testStoreConnectivity(): Promise<{
  available: boolean;
  type: 'kv' | 'memory' | 'noop';
  error?: string;
}> {
  if (!FEATURE_FLAGS.RSM_ENABLED) {
    return { available: true, type: 'noop' };
  }

  const store = getSessionStore();
  
  try {
    // Test with a dummy session
    const testId = `test-${Date.now()}`;
    await store.upsert(testId, { capturedAt: new Date().toISOString() }, 60);
    const result = await store.get(testId);
    await store.clear(testId);
    
    const type = isKVAvailable() ? 'kv' : 'memory';
    return { available: result !== null, type };
  } catch (error: any) {
    return { 
      available: false, 
      type: isKVAvailable() ? 'kv' : 'memory',
      error: error.message 
    };
  }
}
