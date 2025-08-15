/**
 * Rolling Session Memory Types
 * 
 * Defines contracts for session memory storage and context management.
 * Budget: context ≤ 300 tokens total (enforced by packer).
 */

export type Signals = {
  has_text: boolean;
  hazards: string[];
  people_count: number;
  lighting_ok: boolean;
  confidence: number;
};

export type QA = {
  q: string;  // question
  a: string;  // answer
  t: string;  // timestamp ISO
};

export type SessionShard = {
  followupToken?: string;          // client image id or server token
  capturedAt?: string;             // ISO timestamp
  signals?: Signals;               // latest image analysis signals
  user_intent?: string;            // 1 line guess, optional
  recentQA?: QA[];                 // keep last 3 Q&A pairs
  facts?: string[];                // 1–3 salient nuggets (e.g., "EXIT", "stairs right")
  prefs?: {                        // user preferences
    lang?: "darija" | "ar" | "en";
    ttsRate?: number;
    voice?: string;
  };
};

export interface SessionStore {
  /**
   * Get session data by ID
   */
  get(id: string): Promise<SessionShard | null>;
  
  /**
   * Update session data with partial patch and refresh TTL
   */
  upsert(id: string, patch: Partial<SessionShard>, ttlSec: number): Promise<void>;
  
  /**
   * Clear session data
   */
  clear(id: string): Promise<void>;
}

/**
 * Session memory configuration
 */
export const SESSION_CONFIG = {
  TTL_SECONDS: 1800,        // 30 minutes
  MAX_QA_PAIRS: 3,          // keep last 3 Q&A pairs
  MAX_FACTS: 3,             // keep max 3 facts
  MAX_CONTEXT_CHARS: 1200,  // ~300 tokens
  MAX_CONTEXT_TOKENS: 300,  // hard token limit
} as const;

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  RSM_ENABLED: process.env.RSM_ENABLED === '1',
} as const;
