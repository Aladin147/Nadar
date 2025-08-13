#!/usr/bin/env ts-node

/**
 * Cost Estimator Utility for Nadar Demo App
 * 
 * Analyzes telemetry data to estimate costs for Gemini and ElevenLabs usage.
 * Provides per-call and aggregate cost breakdowns with P95 latency tracking.
 * 
 * Usage:
 *   npm run cost-estimate
 *   ts-node scripts/cost.ts [--input telemetry.log] [--days 7]
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TelemetryData } from '../src/utils/telemetry';

// Current pricing as of 2024 (rates may change)
const PRICING = {
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

interface CostBreakdown {
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

interface AggregateStats {
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
function calculateRequestCost(entry: TelemetryData): CostBreakdown {
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
 * Parse telemetry log file and calculate aggregate statistics
 */
function analyzeTelemetryData(logData: string, daysBack?: number): AggregateStats {
  const lines = logData.trim().split('\n').filter(line => line.trim());
  const entries: TelemetryData[] = [];
  
  // Parse JSON lines
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as TelemetryData;
      entries.push(entry);
    } catch (error) {
      console.warn(`Skipping invalid JSON line: ${line.substring(0, 100)}...`);
    }
  }
  
  if (entries.length === 0) {
    throw new Error('No valid telemetry entries found');
  }
  
  // Filter by date if specified
  let filteredEntries = entries;
  if (daysBack) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    filteredEntries = entries.filter(entry => new Date(entry.ts) >= cutoffDate);
  }
  
  if (filteredEntries.length === 0) {
    throw new Error(`No telemetry entries found in the last ${daysBack} days`);
  }
  
  // Calculate costs for each request
  const requestCosts = filteredEntries.map(entry => ({
    entry,
    cost: calculateRequestCost(entry)
  }));
  
  // Aggregate statistics
  const totalRequests = filteredEntries.length;
  const successfulRequests = filteredEntries.filter(e => e.ok).length;
  const errorRate = (totalRequests - successfulRequests) / totalRequests;
  
  const totalCost = requestCosts.reduce((sum, { cost }) => sum + cost.totalCost, 0);
  const averageCostPerRequest = totalCost / totalRequests;
  
  // Latency statistics
  const latencies = filteredEntries.map(e => e.total_ms).sort((a, b) => a - b);
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
    const engineEntries = filteredEntries.filter(e => 
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
  const timestamps = filteredEntries.map(e => new Date(e.ts).getTime()).sort();
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

/**
 * Format currency values
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

/**
 * Format large numbers with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Print detailed cost analysis report
 */
function printCostReport(stats: AggregateStats): void {
  console.log('\n🔍 NADAR COST ANALYSIS REPORT');
  console.log('═'.repeat(50));
  
  // Time range
  console.log(`📅 Analysis Period: ${stats.timeRange.start.split('T')[0]} to ${stats.timeRange.end.split('T')[0]}`);
  console.log(`⏱️  Duration: ${stats.timeRange.durationHours.toFixed(1)} hours\n`);
  
  // Request statistics
  console.log('📊 REQUEST STATISTICS');
  console.log('─'.repeat(30));
  console.log(`Total Requests: ${formatNumber(stats.totalRequests)}`);
  console.log(`Successful: ${formatNumber(stats.successfulRequests)} (${((1 - stats.errorRate) * 100).toFixed(1)}%)`);
  console.log(`Error Rate: ${(stats.errorRate * 100).toFixed(1)}%\n`);
  
  // Latency statistics
  console.log('⚡ LATENCY STATISTICS');
  console.log('─'.repeat(30));
  console.log(`Average: ${stats.latencyStats.average.toFixed(0)}ms`);
  console.log(`P50 (Median): ${stats.latencyStats.p50.toFixed(0)}ms`);
  console.log(`P95: ${stats.latencyStats.p95.toFixed(0)}ms`);
  console.log(`P99: ${stats.latencyStats.p99.toFixed(0)}ms\n`);
  
  // Cost breakdown
  console.log('💰 COST BREAKDOWN');
  console.log('─'.repeat(30));
  console.log(`Total Cost: ${formatCurrency(stats.totalCost)}`);
  console.log(`Average per Request: ${formatCurrency(stats.averageCostPerRequest)}\n`);
  
  console.log('🤖 Gemini AI Costs:');
  console.log(`  Input Tokens: ${formatNumber(stats.costBreakdown.estimatedTokens.input)} → ${formatCurrency(stats.costBreakdown.geminiInputCost)}`);
  console.log(`  Output Tokens: ${formatNumber(stats.costBreakdown.estimatedTokens.output)} → ${formatCurrency(stats.costBreakdown.geminiOutputCost)}`);
  console.log(`  Image Tokens: ${formatNumber(stats.costBreakdown.estimatedTokens.image)} → ${formatCurrency(stats.costBreakdown.geminiImageCost)}`);
  console.log(`  Gemini Total: ${formatCurrency(stats.costBreakdown.geminiTotalCost)}\n`);
  
  console.log('🎙️  ElevenLabs TTS Costs:');
  console.log(`  Characters: ${formatNumber(stats.costBreakdown.elevenLabsChars)} → ${formatCurrency(stats.costBreakdown.elevenLabsCost)}\n`);
  
  // Engine breakdown
  console.log('🔧 ENGINE BREAKDOWN');
  console.log('─'.repeat(30));
  for (const [engine, data] of Object.entries(stats.engineBreakdown)) {
    const percentage = (data.requests / stats.totalRequests * 100).toFixed(1);
    console.log(`${engine}:`);
    console.log(`  Requests: ${formatNumber(data.requests)} (${percentage}%)`);
    console.log(`  Cost: ${formatCurrency(data.cost)}`);
    console.log(`  Avg Latency: ${data.averageLatency.toFixed(0)}ms`);
    console.log(`  Cost per Request: ${formatCurrency(data.cost / data.requests)}\n`);
  }
  
  // Projections
  console.log('📈 COST PROJECTIONS');
  console.log('─'.repeat(30));
  const hourlyRate = stats.totalCost / stats.timeRange.durationHours;
  const dailyProjection = hourlyRate * 24;
  const monthlyProjection = dailyProjection * 30;
  
  console.log(`Hourly Rate: ${formatCurrency(hourlyRate)}`);
  console.log(`Daily Projection: ${formatCurrency(dailyProjection)}`);
  console.log(`Monthly Projection: ${formatCurrency(monthlyProjection)}\n`);
  
  // Warnings and recommendations
  if (stats.errorRate > 0.05) {
    console.log('⚠️  WARNING: High error rate detected. Consider investigating failed requests.');
  }
  
  if (stats.latencyStats.p95 > 5000) {
    console.log('⚠️  WARNING: High P95 latency. Consider optimizing response times.');
  }
  
  if (monthlyProjection > 100) {
    console.log('💡 RECOMMENDATION: Monthly costs projected above $100. Consider implementing cost controls.');
  }
  
  console.log('\n✅ Analysis complete. Use this data to optimize costs and performance.\n');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let inputFile = 'telemetry.log';
  let daysBack: number | undefined;
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputFile = args[i + 1];
      i++;
    } else if (args[i] === '--days' && i + 1 < args.length) {
      daysBack = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: ts-node scripts/cost.ts [options]

Options:
  --input <file>    Path to telemetry log file (default: telemetry.log)
  --days <number>   Analyze only the last N days of data
  --help           Show this help message

Examples:
  ts-node scripts/cost.ts
  ts-node scripts/cost.ts --input logs/telemetry.log --days 7
  npm run cost-estimate
      `);
      return;
    }
  }
  
  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Error: Telemetry file '${inputFile}' not found.`);
      console.log(`
To generate telemetry data:
1. Run the server with telemetry logging enabled
2. Make some API requests to generate data
3. Check server logs or redirect output to a file

Example:
  npm run dev 2>&1 | tee telemetry.log
      `);
      process.exit(1);
    }
    
    // Read and analyze telemetry data
    console.log(`📖 Reading telemetry data from: ${inputFile}`);
    const logData = fs.readFileSync(inputFile, 'utf-8');
    
    console.log('🔄 Analyzing telemetry data...');
    const stats = analyzeTelemetryData(logData, daysBack);
    
    // Print the report
    printCostReport(stats);
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { analyzeTelemetryData, calculateRequestCost, PRICING };