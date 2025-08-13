import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('x-handler', 'metrics');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      err_code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Check if this is a development environment
    // For Vercel, we'll allow metrics in production but with limited data
    const isDev = process.env.NODE_ENV !== 'production';
    
    // For now, return a placeholder response since we don't have persistent storage
    // In a real implementation, this would connect to a database or logging service
    const response = {
      timestamp: new Date().toISOString(),
      message: 'Metrics endpoint (Vercel serverless)',
      environment: process.env.NODE_ENV || 'development',
      handler: 'vercel-serverless-metrics',
      note: 'Serverless functions are stateless - metrics would require external storage',
      
      // Placeholder metrics structure
      time_window_hours: parseInt(req.query.hours as string) || 24,
      total_entries: 0,
      
      request_stats: {
        total_requests: 0,
        successful_requests: 0,
        error_rate: 0
      },
      
      latency_stats: {
        count: 0,
        min: 0,
        max: 0,
        average: 0,
        p50: 0,
        p95: 0,
        p99: 0
      },
      
      error_breakdown: {},
      
      cost_summary: {
        total_estimated_cost: 0,
        average_cost_per_request: 0,
        detailed_analysis: null
      },
      
      engine_breakdown: {},
      
      recent_calls: [],
      
      deployment_info: {
        sha: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        url: process.env.VERCEL_URL || 'unknown',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error generating metrics:', error);
    return res.status(500).json({
      error: 'Failed to generate metrics',
      err_code: 'METRICS_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      handler: 'vercel-serverless-metrics'
    });
  }
}