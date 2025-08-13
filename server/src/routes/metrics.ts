import { Router } from 'express';
import { analyzeTelemetryData, calculateRequestCost } from '../utils/costAnalysis';
import type { TelemetryData } from '../utils/telemetry';

const router = Router();

// In-memory storage for recent telemetry data
// In production, this would be replaced with a proper database or log aggregation system
const recentTelemetryData: TelemetryData[] = [];
const MAX_STORED_ENTRIES = 1000; // Keep last 1000 entries in memory

/**
 * Add telemetry entry to in-memory storage
 * This would be called from the telemetry logging system
 */
export function addTelemetryEntry(entry: TelemetryData): void {
  recentTelemetryData.push(entry);
  
  // Keep only the most recent entries
  if (recentTelemetryData.length > MAX_STORED_ENTRIES) {
    recentTelemetryData.shift();
  }
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
 * Get error breakdown from telemetry data
 */
function getErrorBreakdown(entries: TelemetryData[]): Record<string, number> {
  const errorCounts: Record<string, number> = {};
  
  for (const entry of entries) {
    if (!entry.ok && entry.err_code) {
      errorCounts[entry.err_code] = (errorCounts[entry.err_code] || 0) + 1;
    }
  }
  
  return errorCounts;
}

/**
 * Get recent calls with basic info
 */
function getRecentCalls(entries: TelemetryData[], limit: number = 50): Array<{
  timestamp: string;
  mode: string;
  engine?: string;
  latency: number;
  success: boolean;
  error?: string;
  cost_estimate: number;
}> {
  return entries
    .slice(-limit)
    .map(entry => {
      const costBreakdown = calculateRequestCost(entry);
      
      return {
        timestamp: entry.ts,
        mode: entry.mode,
        engine: entry.engine || entry.provider_name,
        latency: entry.total_ms,
        success: entry.ok,
        error: entry.err_code || undefined,
        cost_estimate: costBreakdown.totalCost
      };
    });
}

/**
 * GET /metrics - Development-only JSON dashboard
 * Returns comprehensive metrics for monitoring and debugging
 */
router.get('/', (req, res) => {
  try {
    // Check if this is a development environment
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) {
      return res.status(403).json({
        error: 'Metrics endpoint is only available in development mode',
        err_code: 'METRICS_DEV_ONLY'
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const hours = parseInt(req.query.hours as string) || 24;
    
    // Filter entries by time window
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    const filteredEntries = recentTelemetryData.filter(entry => 
      new Date(entry.ts) >= cutoffTime
    );
    
    if (filteredEntries.length === 0) {
      return res.json({
        message: 'No telemetry data available',
        total_entries: 0,
        time_window_hours: hours,
        recent_calls: [],
        latency_stats: {},
        error_breakdown: {},
        cost_summary: {
          total_estimated_cost: 0,
          average_cost_per_request: 0
        },
        engine_breakdown: {}
      });
    }
    
    // Calculate latency statistics
    const latencies = filteredEntries.map(e => e.total_ms).sort((a, b) => a - b);
    const latencyStats = {
      count: latencies.length,
      min: latencies[0] || 0,
      max: latencies[latencies.length - 1] || 0,
      average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      p50: calculatePercentile(latencies, 50),
      p95: calculatePercentile(latencies, 95),
      p99: calculatePercentile(latencies, 99)
    };
    
    // Get error breakdown
    const errorBreakdown = getErrorBreakdown(filteredEntries);
    const totalRequests = filteredEntries.length;
    const successfulRequests = filteredEntries.filter(e => e.ok).length;
    const errorRate = (totalRequests - successfulRequests) / totalRequests;
    
    // Get recent calls
    const recentCalls = getRecentCalls(filteredEntries, limit);
    
    // Calculate cost summary
    const totalEstimatedCost = recentCalls.reduce((sum, call) => sum + call.cost_estimate, 0);
    const averageCostPerRequest = totalEstimatedCost / recentCalls.length;
    
    // Engine breakdown
    const engineBreakdown: Record<string, {
      requests: number;
      success_rate: number;
      average_latency: number;
      estimated_cost: number;
    }> = {};
    
    for (const entry of filteredEntries) {
      const engine = entry.engine || entry.provider_name || 'unknown';
      if (!engineBreakdown[engine]) {
        engineBreakdown[engine] = {
          requests: 0,
          success_rate: 0,
          average_latency: 0,
          estimated_cost: 0
        };
      }
      engineBreakdown[engine].requests++;
    }
    
    // Calculate engine statistics
    for (const engine in engineBreakdown) {
      const engineEntries = filteredEntries.filter(e => 
        (e.engine || e.provider_name || 'unknown') === engine
      );
      const engineCalls = recentCalls.filter(c => 
        (c.engine || 'unknown') === engine
      );
      
      const successfulEngineRequests = engineEntries.filter(e => e.ok).length;
      const totalEngineLatency = engineEntries.reduce((sum, e) => sum + e.total_ms, 0);
      const totalEngineCost = engineCalls.reduce((sum, c) => sum + c.cost_estimate, 0);
      
      engineBreakdown[engine].success_rate = successfulEngineRequests / engineEntries.length;
      engineBreakdown[engine].average_latency = totalEngineLatency / engineEntries.length;
      engineBreakdown[engine].estimated_cost = totalEngineCost;
    }
    
    // Try to use the full cost analysis if we have enough data
    let detailedCostAnalysis = null;
    try {
      if (filteredEntries.length >= 5) {
        detailedCostAnalysis = analyzeTelemetryData(filteredEntries);
      }
    } catch (error) {
      // Fallback to simple cost estimation if detailed analysis fails
      console.warn('Detailed cost analysis failed, using simple estimation:', error);
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      time_window_hours: hours,
      total_entries: filteredEntries.length,
      
      // Request statistics
      request_stats: {
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        error_rate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimal places
      },
      
      // Latency statistics
      latency_stats: {
        ...latencyStats,
        average: Math.round(latencyStats.average),
        p50: Math.round(latencyStats.p50),
        p95: Math.round(latencyStats.p95),
        p99: Math.round(latencyStats.p99)
      },
      
      // Error breakdown
      error_breakdown: errorBreakdown,
      
      // Cost summary
      cost_summary: {
        total_estimated_cost: Math.round(totalEstimatedCost * 10000) / 10000, // 4 decimal places
        average_cost_per_request: Math.round(averageCostPerRequest * 10000) / 10000,
        detailed_analysis: detailedCostAnalysis ? {
          gemini_cost: Math.round(detailedCostAnalysis.costBreakdown.geminiTotalCost * 10000) / 10000,
          elevenlabs_cost: Math.round(detailedCostAnalysis.costBreakdown.elevenLabsCost * 10000) / 10000,
          total_tokens: detailedCostAnalysis.costBreakdown.estimatedTokens.input + 
                       detailedCostAnalysis.costBreakdown.estimatedTokens.output + 
                       detailedCostAnalysis.costBreakdown.estimatedTokens.image,
          elevenlabs_chars: detailedCostAnalysis.costBreakdown.elevenLabsChars
        } : null
      },
      
      // Engine breakdown
      engine_breakdown: Object.fromEntries(
        Object.entries(engineBreakdown).map(([engine, stats]) => [
          engine,
          {
            ...stats,
            success_rate: Math.round(stats.success_rate * 10000) / 100, // Percentage
            average_latency: Math.round(stats.average_latency),
            estimated_cost: Math.round(stats.estimated_cost * 10000) / 10000
          }
        ])
      ),
      
      // Recent calls (limited)
      recent_calls: recentCalls.slice(-limit).map(call => ({
        ...call,
        cost_estimate: Math.round(call.cost_estimate * 10000) / 10000
      }))
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({
      error: 'Failed to generate metrics',
      err_code: 'METRICS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as metricsRouter };