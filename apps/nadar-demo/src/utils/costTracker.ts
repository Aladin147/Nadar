/**
 * Lightweight Cost Tracking Utility for Demo App
 * Provides real-time cost estimation without impacting performance
 */

// Pricing data (as of 2024) - matches server/src/utils/costAnalysis.ts
const PRICING = {
  GEMINI_FLASH: {
    INPUT_PER_1M_TOKENS: 0.075,   // $0.075 per 1M input tokens
    OUTPUT_PER_1M_TOKENS: 0.30,  // $0.30 per 1M output tokens
    IMAGE_PER_1M_TOKENS: 0.075,  // $0.075 per 1M image tokens
  },
  GEMINI_LIVE: {
    INPUT_PER_1M_TOKENS: 0.15,   // $0.15 per 1M input tokens
    OUTPUT_PER_1M_TOKENS: 0.60,  // $0.60 per 1M output tokens
    IMAGE_PER_1M_TOKENS: 0.15,   // $0.15 per 1M image tokens
  },
  ELEVENLABS: {
    COST_PER_CHARACTER: 0.000015, // Flash v2.5: 0.5 credits/char = $0.015 per 1000 characters (50% cheaper)
  }
};

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  image?: number;
}

export interface CostBreakdown {
  geminiInputCost: number;
  geminiOutputCost: number;
  geminiImageCost: number;
  geminiTotalCost: number;
  elevenLabsCost: number;
  totalCost: number;
  estimatedTokens: TokenUsage;
  elevenLabsChars: number;
}

export interface RequestCostData {
  endpoint: string;
  tokenUsage?: TokenUsage;
  imageBytes?: number;
  outputChars?: number;
  ttsUsed?: boolean;
  isLiveEngine?: boolean;
  timestamp: number;
}

/**
 * Estimate token count from character count
 * Rough approximation: 1 token ≈ 4 characters for English/Latin text
 */
function estimateTokens(text: string | number): number {
  const chars = typeof text === 'string' ? text.length : text;
  return Math.ceil(chars / 4);
}

/**
 * Estimate image tokens based on image size
 * Gemini charges based on image resolution, but we approximate from bytes
 */
function estimateImageTokens(imageBytes: number): number {
  // Rough approximation: 1KB of image ≈ 10 tokens
  const kb = imageBytes / 1024;
  return Math.ceil(kb * 10);
}

/**
 * Calculate cost for a single request
 */
export function calculateRequestCost(data: RequestCostData): CostBreakdown {
  const pricing = data.isLiveEngine ? PRICING.GEMINI_LIVE : PRICING.GEMINI_FLASH;
  
  // Use real token counts if available, otherwise estimate
  let inputTokens: number;
  let outputTokens: number;
  let imageTokens: number;
  
  if (data.tokenUsage) {
    // Use real token counts from Gemini API
    inputTokens = data.tokenUsage.input;
    outputTokens = data.tokenUsage.output;
    imageTokens = data.tokenUsage.image || estimateImageTokens(data.imageBytes || 0);
  } else {
    // Fall back to estimates
    inputTokens = estimateTokens(500); // Rough system prompt estimate
    outputTokens = estimateTokens(data.outputChars || 0);
    imageTokens = estimateImageTokens(data.imageBytes || 0);
  }
  
  // Calculate Gemini costs
  const geminiInputCost = (inputTokens / 1_000_000) * pricing.INPUT_PER_1M_TOKENS;
  const geminiOutputCost = (outputTokens / 1_000_000) * pricing.OUTPUT_PER_1M_TOKENS;
  const geminiImageCost = (imageTokens / 1_000_000) * pricing.IMAGE_PER_1M_TOKENS;
  const geminiTotalCost = geminiInputCost + geminiOutputCost + geminiImageCost;
  
  // Calculate ElevenLabs cost (if TTS was used)
  const elevenLabsChars = data.ttsUsed ? (data.outputChars || 0) : 0;
  const elevenLabsCost = elevenLabsChars * PRICING.ELEVENLABS.COST_PER_CHARACTER;
  
  const totalCost = geminiTotalCost + elevenLabsCost;
  
  return {
    geminiInputCost,
    geminiOutputCost,
    geminiImageCost,
    geminiTotalCost,
    elevenLabsCost,
    totalCost,
    estimatedTokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
      image: imageTokens
    },
    elevenLabsChars
  };
}

/**
 * Session-based cost tracker
 */
class SessionCostTracker {
  private requests: RequestCostData[] = [];
  private sessionStartTime = Date.now();

  addRequest(data: RequestCostData) {
    this.requests.push(data);
  }

  getSessionSummary(): {
    totalRequests: number;
    totalCost: number;
    totalTokens: number;
    breakdown: CostBreakdown;
    sessionDurationMs: number;
  } {
    const costs = this.requests.map(req => calculateRequestCost(req));
    
    const totalCost = costs.reduce((sum, cost) => sum + cost.totalCost, 0);
    const totalTokens = costs.reduce((sum, cost) => sum + cost.estimatedTokens.total, 0);
    
    // Aggregate breakdown
    const breakdown: CostBreakdown = {
      geminiInputCost: costs.reduce((sum, cost) => sum + cost.geminiInputCost, 0),
      geminiOutputCost: costs.reduce((sum, cost) => sum + cost.geminiOutputCost, 0),
      geminiImageCost: costs.reduce((sum, cost) => sum + cost.geminiImageCost, 0),
      geminiTotalCost: costs.reduce((sum, cost) => sum + cost.geminiTotalCost, 0),
      elevenLabsCost: costs.reduce((sum, cost) => sum + cost.elevenLabsCost, 0),
      totalCost,
      estimatedTokens: {
        input: costs.reduce((sum, cost) => sum + cost.estimatedTokens.input, 0),
        output: costs.reduce((sum, cost) => sum + cost.estimatedTokens.output, 0),
        total: totalTokens,
        image: costs.reduce((sum, cost) => sum + (cost.estimatedTokens.image || 0), 0)
      },
      elevenLabsChars: costs.reduce((sum, cost) => sum + cost.elevenLabsChars, 0)
    };

    return {
      totalRequests: this.requests.length,
      totalCost,
      totalTokens,
      breakdown,
      sessionDurationMs: Date.now() - this.sessionStartTime
    };
  }

  reset() {
    this.requests = [];
    this.sessionStartTime = Date.now();
  }

  getLastRequestCost(): CostBreakdown | null {
    if (this.requests.length === 0) return null;
    return calculateRequestCost(this.requests[this.requests.length - 1]);
  }
}

// Global session tracker
export const sessionCostTracker = new SessionCostTracker();

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) {
    return `$${(cost * 1000).toFixed(3)}k`; // Show in thousandths
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens > 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
