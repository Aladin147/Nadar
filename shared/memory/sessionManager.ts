/**
 * Session Manager
 * 
 * High-level interface for managing session memory with business logic.
 */

import { SessionShard, QA, Signals, SESSION_CONFIG } from './types';
import { getSessionStore } from './store.factory';
import { packContextWithTokenLimit, formatContextForPrompt } from './contextPacker';

export class SessionManager {
  private store = getSessionStore();

  /**
   * Get session context formatted for AI prompt
   */
  async getContext(sessionId: string): Promise<string> {
    try {
      const shard = await this.store.get(sessionId);
      if (!shard) return '';

      const context = packContextWithTokenLimit(shard);
      return formatContextForPrompt(context);
    } catch (error) {
      console.error('❌ Error getting session context:', error);
      return ''; // Graceful degradation
    }
  }

  /**
   * Update session after a new interaction
   */
  async updateSession(
    sessionId: string,
    update: {
      question?: string;
      answer?: string;
      signals?: Signals;
      followupToken?: string;
      userIntent?: string;
      facts?: string[];
      prefs?: SessionShard['prefs'];
    }
  ): Promise<void> {
    try {
      const patch: Partial<SessionShard> = {};

      // Update timestamp
      patch.capturedAt = new Date().toISOString();

      // Update Q&A if provided
      if (update.question && update.answer) {
        const current = await this.store.get(sessionId);
        const currentQA = current?.recentQA || [];
        
        const newQA: QA = {
          q: update.question,
          a: update.answer,
          t: new Date().toISOString(),
        };

        // Keep only last N Q&A pairs
        const updatedQA = [...currentQA, newQA].slice(-SESSION_CONFIG.MAX_QA_PAIRS);
        patch.recentQA = updatedQA;
      }

      // Update signals
      if (update.signals) {
        patch.signals = update.signals;
      }

      // Update followup token
      if (update.followupToken) {
        patch.followupToken = update.followupToken;
      }

      // Update user intent
      if (update.userIntent) {
        patch.user_intent = update.userIntent;
      }

      // Update facts (merge with existing, keep unique)
      if (update.facts && update.facts.length > 0) {
        const current = await this.store.get(sessionId);
        const currentFacts = current?.facts || [];
        const allFacts = [...currentFacts, ...update.facts];
        
        // Remove duplicates and keep only last N facts
        const uniqueFacts = [...new Set(allFacts)].slice(-SESSION_CONFIG.MAX_FACTS);
        patch.facts = uniqueFacts;
      }

      // Update preferences
      if (update.prefs) {
        const current = await this.store.get(sessionId);
        patch.prefs = { ...current?.prefs, ...update.prefs };
      }

      // Save to store with TTL refresh
      await this.store.upsert(sessionId, patch, SESSION_CONFIG.TTL_SECONDS);

      console.log(`✅ Session updated: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error updating session:', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Clear session memory
   */
  async clearSession(sessionId: string): Promise<void> {
    try {
      await this.store.clear(sessionId);
      console.log(`🗑️ Session cleared: ${sessionId}`);
    } catch (error) {
      console.error('❌ Error clearing session:', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Get session info for debugging
   */
  async getSessionInfo(sessionId: string): Promise<SessionShard | null> {
    try {
      return await this.store.get(sessionId);
    } catch (error) {
      console.error('❌ Error getting session info:', error);
      return null;
    }
  }

  /**
   * Extract facts from OCR text (simple keyword extraction)
   */
  extractFacts(ocrText: string, confidence: number): string[] {
    if (confidence < 0.6) return []; // Only extract if confident

    const facts: string[] = [];
    const text = ocrText.toLowerCase();

    // Common navigation keywords
    const keywords = [
      'exit', 'خروج', 'مخرج',
      'entrance', 'دخول', 'مدخل', 
      'stairs', 'درج', 'سلالم',
      'elevator', 'مصعد', 'أسانسير',
      'toilet', 'حمام', 'مرحاض',
      'restaurant', 'مطعم', 'ريستو',
      'pharmacy', 'صيدلية', 'فارماسي',
      'hospital', 'مستشفى', 'سبيطار',
      'police', 'شرطة', 'بوليس',
      'parking', 'موقف', 'باركينغ',
    ];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        facts.push(keyword.toUpperCase());
      }
    }

    // Extract numbers (room numbers, floor numbers, etc.)
    const numbers = ocrText.match(/\b\d{1,4}\b/g);
    if (numbers && numbers.length > 0) {
      facts.push(`Room/Floor: ${numbers.slice(0, 2).join(', ')}`);
    }

    return facts.slice(0, SESSION_CONFIG.MAX_FACTS);
  }

  /**
   * Guess user intent from recent Q&A and signals
   */
  guessUserIntent(recentQA: QA[], signals?: Signals): string {
    if (!recentQA || recentQA.length === 0) return '';

    const lastQuestion = recentQA[recentQA.length - 1]?.q.toLowerCase() || '';
    
    // Simple intent classification
    if (lastQuestion.includes('exit') || lastQuestion.includes('خروج') || lastQuestion.includes('مخرج')) {
      return 'finding exit';
    }
    if (lastQuestion.includes('toilet') || lastQuestion.includes('حمام') || lastQuestion.includes('مرحاض')) {
      return 'finding restroom';
    }
    if (lastQuestion.includes('food') || lastQuestion.includes('eat') || lastQuestion.includes('مطعم') || lastQuestion.includes('أكل')) {
      return 'finding food';
    }
    if (lastQuestion.includes('read') || lastQuestion.includes('text') || lastQuestion.includes('قرا') || lastQuestion.includes('نص')) {
      return 'reading text';
    }
    if (signals?.people_count && signals.people_count > 0) {
      return 'navigating crowded area';
    }
    if (signals?.has_text) {
      return 'reading signage';
    }

    return 'general assistance';
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
