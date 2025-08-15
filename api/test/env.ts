import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Test environment variables for Vercel KV
 * GET /api/test/env
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'env-test');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check all possible KV environment variables
    const envVars = {
      // Vercel KV (standard)
      VERCEL_KV_URL: process.env.VERCEL_KV_URL ? '✅ Set' : '❌ Missing',
      VERCEL_KV_REST_TOKEN: process.env.VERCEL_KV_REST_TOKEN ? '✅ Set' : '❌ Missing',
      
      // Upstash Redis (direct)
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing',
      
      // KV-specific variables
      KV_URL: process.env.KV_URL ? '✅ Set' : '❌ Missing',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
      KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN ? '✅ Set' : '❌ Missing',
      
      // Other relevant vars
      RSM_ENABLED: process.env.RSM_ENABLED || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      VERCEL: process.env.VERCEL ? '✅ Set' : '❌ Missing',
      VERCEL_ENV: process.env.VERCEL_ENV || 'Not set',
    };

    // Show actual values for debugging (first few chars only for security)
    const envValues = {
      VERCEL_KV_URL: process.env.VERCEL_KV_URL ? process.env.VERCEL_KV_URL.substring(0, 30) + '...' : 'Not set',
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? process.env.UPSTASH_REDIS_REST_URL.substring(0, 30) + '...' : 'Not set',
      KV_URL: process.env.KV_URL ? process.env.KV_URL.substring(0, 30) + '...' : 'Not set',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? process.env.KV_REST_API_URL.substring(0, 30) + '...' : 'Not set',
    };

    return res.status(200).json({
      success: true,
      message: 'Environment variables check',
      environment_status: envVars,
      environment_values: envValues,
      vercel_info: {
        is_vercel: !!process.env.VERCEL,
        vercel_env: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Environment check error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Environment check failed',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
