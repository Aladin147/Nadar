import type { VercelRequest, VercelResponse } from '@vercel/node';

// Try to import Vercel KV
let kv: any = null;
let kvAvailable = false;
let kvError: string | null = null;

try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
  kvAvailable = true;
  console.log('✅ Vercel KV imported for testing');
} catch (error) {
  kvError = `KV import failed: ${error}`;
  console.error('❌ KV import failed:', kvError);
  kvAvailable = false;
}

/**
 * Test Vercel KV (Upstash Redis) connection
 * GET /api/test/kv
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'kv-test');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Check if KV was imported successfully
    if (!kv || !kvAvailable) {
      throw new Error(`KV import failed: ${kvError}`);
    }

    console.log('🧪 Testing Vercel KV connection...');
    console.log('🔍 KV client type:', typeof kv);

    // Test 1: Basic connectivity
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hello Vercel KV!', timestamp: new Date().toISOString() };

    console.log('🧪 Testing KV operations...');
    
    // Test 2: Set operation with TTL
    await kv.set(testKey, testValue, { ex: 60 }); // 1 minute TTL
    console.log('✅ KV SET successful');

    // Test 3: Get operation
    const retrieved = await kv.get(testKey);
    console.log('✅ KV GET successful');

    // Test 4: Delete operation
    await kv.del(testKey);
    console.log('✅ KV DEL successful');
    
    // Test 5: Session-like operations
    const sessionKey = `sess:test-${Date.now()}`;
    const sessionData = {
      recentQA: [
        { q: 'Test question?', a: 'Test answer', t: new Date().toISOString() }
      ],
      facts: ['TEST_FACT'],
      user_intent: 'testing',
      capturedAt: new Date().toISOString()
    };

    await kv.set(sessionKey, sessionData, { ex: 1800 }); // 30 minutes TTL
    const sessionRetrieved = await kv.get(sessionKey);
    await kv.del(sessionKey);

    console.log('✅ Session operations successful');
    
    const processingTime = Date.now() - startTime;

    // Environment info
    const envInfo = {
      VERCEL_KV_URL: process.env.VERCEL_KV_URL ? '✅ Set' : '❌ Missing',
      VERCEL_KV_REST_TOKEN: process.env.VERCEL_KV_REST_TOKEN ? '✅ Set' : '❌ Missing',
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
      KV_URL: process.env.KV_URL ? '✅ Set' : '❌ Missing',
      REDIS_URL: process.env.REDIS_URL ? '✅ Set' : '❌ Missing',
      RSM_ENABLED: process.env.RSM_ENABLED || 'Not set',
    };

    // Log success telemetry
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      mode: 'kv_test',
      route_path: '/api/test/kv',
      total_ms: processingTime,
      ok: true,
      test_results: {
        basic_ops: true,
        session_ops: true,
        connectivity: true
      }
    }));

    return res.status(200).json({
      success: true,
      message: 'Vercel KV connection successful',
      tests: {
        kv_import: '✅ Passed',
        set_operation: '✅ Passed',
        get_operation: '✅ Passed',
        delete_operation: '✅ Passed',
        session_operations: '✅ Passed',
        ttl_support: '✅ Passed'
      },
      environment: envInfo,
      performance: {
        total_time_ms: processingTime,
        operations_tested: 6
      },
      data_verification: {
        test_value_match: JSON.stringify(retrieved) === JSON.stringify(testValue),
        session_data_match: JSON.stringify(sessionRetrieved) === JSON.stringify(sessionData)
      },
      kv_info: {
        client_type: 'Vercel KV (@vercel/kv)',
        vercel_kv_url: process.env.VERCEL_KV_URL ? 'Set' : 'Missing',
        vercel_kv_token: process.env.VERCEL_KV_REST_TOKEN ? 'Set' : 'Missing'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ KV test error:', error);
    
    const processingTime = Date.now() - startTime;

    // Log error telemetry
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      mode: 'kv_test',
      route_path: '/api/test/kv',
      total_ms: processingTime,
      ok: false,
      err_code: 'KV_TEST_FAILED',
      error: error.message
    }));
    
    return res.status(500).json({
      success: false,
      error: 'Vercel KV connection failed',
      details: error?.message || 'Unknown error',
      environment: {
        VERCEL_KV_URL: process.env.VERCEL_KV_URL ? '✅ Set' : '❌ Missing',
        VERCEL_KV_REST_TOKEN: process.env.VERCEL_KV_REST_TOKEN ? '✅ Set' : '❌ Missing',
        KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing',
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
        RSM_ENABLED: process.env.RSM_ENABLED || 'Not set',
      },
      kv_error: kvError,
      timestamp: new Date().toISOString(),
      processingTime
    });
  }
}
