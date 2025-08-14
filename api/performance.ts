// Performance monitoring endpoint

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { globalPerformanceMonitor, globalResponseCache } from '../shared/utils/performance';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set headers
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-type', 'application/json');
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      err_code: 'METHOD_NOT_ALLOWED' 
    });
  }
  
  try {
    const metrics = globalPerformanceMonitor.getMetrics();
    
    // Add cache statistics
    const cacheStats = {
      // We can't easily get cache size from Map, but we can estimate
      estimated_entries: 'unknown', // Would need to modify ResponseCache to track this
      cleanup_last_run: 'automatic'
    };
    
    const response = {
      performance: {
        ...metrics,
        target_response_time_ms: 3500, // 3.5s target from user preferences
        current_vs_target: metrics.averageResponseTime > 3500 ? 'ABOVE_TARGET' : 'ON_TARGET'
      },
      cache: cacheStats,
      optimizations: {
        fast_model: 'gemini-2.5-flash-lite',
        quality_model: 'gemini-2.5-flash',
        image_optimization: 'enabled',
        response_caching: 'enabled',
        compact_prompts: 'enabled'
      },
      recommendations: generateRecommendations(metrics),
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(response);
    
  } catch (error: any) {
    console.error('Performance endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      err_code: 'METRICS_ERROR'
    });
  }
}

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.averageResponseTime > 4000) {
    recommendations.push('Consider enabling more aggressive caching');
    recommendations.push('Review image compression settings');
  }
  
  if (metrics.averageResponseTime > 6000) {
    recommendations.push('Switch to faster Gemini model for main responses');
    recommendations.push('Implement request queuing to prevent overload');
  }
  
  if (metrics.cacheHitRate < 0.1) {
    recommendations.push('Cache hit rate is low - review cache key generation');
  }
  
  if (metrics.errorRate > 0.05) {
    recommendations.push('Error rate is high - implement retry logic');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Performance is within acceptable ranges');
  }
  
  return recommendations;
}
