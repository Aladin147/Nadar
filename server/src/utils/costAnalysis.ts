import type { TelemetryData } from './telemetry';

// Current pricing as of 2024 (rates may change)
export const PRICING = {
  // Gemini 2.5 Flash pricing (per 1M tokens)
  GEMINI_FLASH: {
    INPUT_PER_1M_TOKENS: 0.075,  // $0.075 per 1M input tokens
    OUTPUT_PER_1M_TOKENS: 0.30,  // $0.30 per 1M output tokens
    IMAGE_PER_1M_TOKENS: 0.075   // $0.075 per 1M image tokens (same as input)
  },
  
  // Gemini Live pricing (per 1M tokens) - higher cost for real-time
  GEMINI_LIVE: {
    INPUT_PER_1M_TOKENS: 0.15,   // $0.15 per 1M input tokens
    OUTPUT_PER_1M_TOKENS: 0.60,  // $0.60 per 1M output tokens
    IMAGE_PER_1M_TOKENS: 0.15    // $0.15 per 1M image tokens
  },
  
  // ElevenLabs pricing (per character)
  ELEVENLABS: {
    CHARACTERS_PER_DOLLAR: 25000, // ~25k characters per $1 (varies by plan)
    COST_PER_CHARACTER: 1 / 25000 // $0.00004 per character
  }
} as const;

export interface CostBreakdown {
  geminiInputCost: number;
  geminiOutputCost: number;
  geminiImageCost: number;
  geminiTotalCost: number;
  elevenLabsCost: number;
  totalCost: number;
  estimatedTokens: {
    input: number;
    output: number;
    image: number;
  };
  elevenLabsChars: number;
}

export interface AggregateStats {
  totalRequests: number;
  successfulRequests: number;
  errorRate: number;
  totalCost: number;
  averageCostPerRequest: number;
  latencyStats: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  engineBreakdown: Record<string, {
    requests: number;
    cost: number;
    averageLatency: number;
  }>;
  costBreakdown: CostBreakdown;
  timeRange: {
    start: string;
    end: string;
    durationHours: number;
  };
}

/**
 * Estimate token count from character count
 * Rough approximation: 1 token ≈ 4 characters for English/Latin text
 * For Arabic/Darija, tokens might be slightly different, but we use same ratio
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
  // This is a very rough estimate - actual token count depends on resolution
  const kb = imageBytes / 1024;
  return Math.ceil(kb * 10);
}

/**
 * Calculate cost for a single request
 */
export function calculateRequestCost(entry: TelemetryData): CostBreakdown {
  const isLiveEngine = entry.engine === 'live' || entry.provider_name?.includes('live');
  const pricing = isLiveEngine ? PRICING.GEMINI_LIVE : PRICING.GEMINI_FLASH;
  
  // Estimate tokens
  const inputTokens = estimateTokens(entry.image_bytes || 0); // System prompt + user input
  const outputTokens = estimateTokens(entry.chars_out || 0);
  const imageTokens = estimateImageTokens(entry.image_bytes || 0);
  
  // Calculate Gemini costs
  const geminiInputCost = (inputTokens / 1_000_000) * pricing.INPUT_PER_1M_TOKENS;
  const geminiOutputCost = (outputTokens / 1_000_000) * pricing.OUTPUT_PER_1M_TOKENS;
  const geminiImageCost = (imageTokens / 1_000_000) * pricing.IMAGE_PER_1M_TOKENS;
  const geminiTotalCost = geminiInputCost + geminiOutputCost + geminiImageCost;
  
  // Calculate ElevenLabs cost (if TTS was used)
  const elevenLabsChars = entry.tts_ms > 0 ? (entry.chars_out || 0) : 0;
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
      image: imageTokens
    },
    elevenLabsChars
  };
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * Analyze telemetry data and calculate aggregate statistics
 */
export function analyzeTelemetryData(entries: TelemetryData[]): AggregateStats {
  if (entries.length === 0) {
    throw new Error('No valid telemetry entries found');
  }
  
  // Calculate costs for each request
  const requestCosts = entries.map(entry => ({
    entry,
    cost: calculateRequestCost(entry)
  }));
  
  // Aggregate statistics
  const totalRequests = entries.length;
  const successfulRequests = entries.filter(e => e.ok).length;
  const errorRate = (totalRequests - successfulRequests) / totalRequests;
  
  const totalCost = requestCosts.reduce((sum, { cost }) => sum + cost.totalCost, 0);
  const averageCostPerRequest = totalCost / totalRequests;
  
  // Latency statistics
  const latencies = entries.map(e => e.total_ms).sort((a, b) => a - b);
  const latencyStats = {
    p50: calculatePercentile(latencies, 50),
    p95: calculatePercentile(latencies, 95),
    p99: calculatePercentile(latencies, 99),
    average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
  };
  
  // Engine breakdown
  const engineBreakdown: Record<string, { requests: number; cost: number; averageLatency: number }> = {};
  for (const { entry, cost } of requestCosts) {
    const engine = entry.engine || entry.provider_name || 'unknown';
    if (!engineBreakdown[engine]) {
      engineBreakdown[engine] = { requests: 0, cost: 0, averageLatency: 0 };
    }
    engineBreakdown[engine].requests++;
    engineBreakdown[engine].cost += cost.totalCost;
  }
  
  // Calculate average latency per engine
  for (const engine in engineBreakdown) {
    const engineEntries = entries.filter(e => 
      (e.engine || e.provider_name || 'unknown') === engine
    );
    const totalLatency = engineEntries.reduce((sum, e) => sum + e.total_ms, 0);
    engineBreakdown[engine].averageLatency = totalLatency / engineEntries.length;
  }
  
  // Aggregate cost breakdown
  const costBreakdown: CostBreakdown = {
    geminiInputCost: requestCosts.reduce((sum, { cost }) => sum + cost.geminiInputCost, 0),
    geminiOutputCost: requestCosts.reduce((sum, { cost }) => sum + cost.geminiOutputCost, 0),
    geminiImageCost: requestCosts.reduce((sum, { cost }) => sum + cost.geminiImageCost, 0),
    geminiTotalCost: requestCosts.reduce((sum, { cost }) => sum + cost.geminiTotalCost, 0),
    elevenLabsCost: requestCosts.reduce((sum, { cost }) => sum + cost.elevenLabsCost, 0),
    totalCost,
    estimatedTokens: {
      input: requestCosts.reduce((sum, { cost }) => sum + cost.estimatedTokens.input, 0),
      output: requestCosts.reduce((sum, { cost }) => sum + cost.estimatedTokens.output, 0),
      image: requestCosts.reduce((sum, { cost }) => sum + cost.estimatedTokens.image, 0)
    },
    elevenLabsChars: requestCosts.reduce((sum, { cost }) => sum + cost.elevenLabsChars, 0)
  };
  
  // Time range
  const timestamps = entries.map(e => new Date(e.ts).getTime()).sort();
  const timeRange = {
    start: new Date(timestamps[0]).toISOString(),
    end: new Date(timestamps[timestamps.length - 1]).toISOString(),
    durationHours: (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60)
  };
  
  return {
    totalRequests,
    successfulRequests,
    errorRate,
    totalCost,
    averageCostPerRequest,
    latencyStats,
    engineBreakdown,
    costBreakdown,
    timeRange
  };
}