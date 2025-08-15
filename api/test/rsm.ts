import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  try {
    // Check RSM configuration
    const RSM_ENABLED = process.env.RSM_ENABLED === '1';
    const RSM_RAW = process.env.RSM_ENABLED;
    
    // Check all environment variables
    const envInfo = {
      RSM_ENABLED_RAW: RSM_RAW || 'Not set',
      RSM_ENABLED_BOOLEAN: RSM_ENABLED,
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'Not set',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
    };

    // Test session ID generation
    const testSessionId = `session-${Date.now()}`;
    
    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'RSM Configuration Check',
      rsm_status: RSM_ENABLED ? 'ENABLED' : 'DISABLED',
      environment: envInfo,
      test_session_id: testSessionId,
      timestamp: new Date().toISOString(),
      processingTime
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    return res.status(500).json({
      success: false,
      error: 'RSM check failed',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      processingTime
    });
  }
}
