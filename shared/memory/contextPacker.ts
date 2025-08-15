/**
 * Context Packer
 * 
 * Formats session memory into context strings for AI prompts.
 * Enforces token budget and prioritizes recent information.
 */

import { SessionShard, SESSION_CONFIG } from './types';

/**
 * Pack session context into a formatted string for AI prompts
 */
export function packContext(
  shard: SessionShard, 
  maxChars: number = SESSION_CONFIG.MAX_CONTEXT_CHARS
): string {
  if (!shard) return '';

  const parts: string[] = [];

  // 1. User intent (highest priority)
  if (shard.user_intent) {
    parts.push(`Intent: ${shard.user_intent}`);
  }

  // 2. Facts (high priority)
  if (shard.facts && shard.facts.length > 0) {
    const factsStr = shard.facts.join(' • ');
    parts.push(`Facts: ${factsStr}`);
  }

  // 3. Recent Q&A (medium priority)
  if (shard.recentQA && shard.recentQA.length > 0) {
    const qaLines = shard.recentQA
      .slice(-SESSION_CONFIG.MAX_QA_PAIRS) // Keep last 3
      .map(qa => `Q: ${qa.q} → A: ${qa.a}`)
      .join('\n');
    parts.push(`Recent:\n${qaLines}`);
  }

  // 4. Signals summary (low priority)
  if (shard.signals) {
    const signals = shard.signals;
    const signalParts: string[] = [];
    
    if (signals.has_text) signalParts.push('text detected');
    if (signals.hazards.length > 0) signalParts.push(`hazards: ${signals.hazards.join(', ')}`);
    if (signals.people_count > 0) signalParts.push(`${signals.people_count} people`);
    if (!signals.lighting_ok) signalParts.push('poor lighting');
    
    if (signalParts.length > 0) {
      parts.push(`Signals: ${signalParts.join(', ')}`);
    }
  }

  // Join all parts
  let context = parts.join('\n');

  // Enforce character limit with priority-based trimming
  if (context.length > maxChars) {
    context = trimContextByPriority(shard, maxChars);
  }

  return context;
}

/**
 * Trim context by priority when over limit
 */
function trimContextByPriority(shard: SessionShard, maxChars: number): string {
  const parts: string[] = [];
  let currentLength = 0;

  // Priority 1: Intent (always include if present)
  if (shard.user_intent) {
    const intentStr = `Intent: ${shard.user_intent}`;
    parts.push(intentStr);
    currentLength += intentStr.length + 1; // +1 for newline
  }

  // Priority 2: Facts (include as many as fit)
  if (shard.facts && shard.facts.length > 0) {
    const factsStr = `Facts: ${shard.facts.join(' • ')}`;
    if (currentLength + factsStr.length + 1 <= maxChars) {
      parts.push(factsStr);
      currentLength += factsStr.length + 1;
    }
  }

  // Priority 3: Recent Q&A (include as many as fit, starting from most recent)
  if (shard.recentQA && shard.recentQA.length > 0) {
    const recentQA = [...shard.recentQA].reverse(); // Most recent first
    const qaLines: string[] = [];
    
    for (const qa of recentQA) {
      const qaLine = `Q: ${qa.q} → A: ${qa.a}`;
      const recentHeader = qaLines.length === 0 ? 'Recent:\n' : '';
      const testStr = recentHeader + [...qaLines, qaLine].join('\n');
      
      if (currentLength + testStr.length + 1 <= maxChars) {
        qaLines.push(qaLine);
      } else {
        break; // Stop adding Q&A if we exceed limit
      }
    }
    
    if (qaLines.length > 0) {
      parts.push(`Recent:\n${qaLines.reverse().join('\n')}`); // Restore chronological order
    }
  }

  return parts.join('\n');
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if context fits within token budget
 */
export function isWithinTokenBudget(context: string): boolean {
  return estimateTokens(context) <= SESSION_CONFIG.MAX_CONTEXT_TOKENS;
}

/**
 * Create context with token budget enforcement
 */
export function packContextWithTokenLimit(shard: SessionShard): string {
  let context = packContext(shard);
  
  // If over token budget, try with smaller character limit
  if (!isWithinTokenBudget(context)) {
    const targetChars = SESSION_CONFIG.MAX_CONTEXT_TOKENS * 3; // More aggressive limit
    context = packContext(shard, targetChars);
  }
  
  return context;
}

/**
 * Format context for AI prompt injection
 */
export function formatContextForPrompt(context: string): string {
  if (!context.trim()) return '';
  
  return `\n\n--- Session Context (use only if relevant) ---\n${context}\n--- End Context ---\n`;
}
