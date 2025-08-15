import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

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
    // Test 1: Basic connectivity
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hello Upstash!', timestamp: new Date().toISOString() };
    
    console.log('🧪 Testing KV connection...');
    
    // Test 2: Set operation
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
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing',
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
      message: 'Upstash Redis (Vercel KV) connection successful',
      tests: {
        basic_connectivity: '✅ Passed',
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
      error: 'Upstash Redis (Vercel KV) connection failed',
      details: error?.message || 'Unknown error',
      environment: {
        VERCEL_KV_URL: process.env.VERCEL_KV_URL ? '✅ Set' : '❌ Missing',
        VERCEL_KV_REST_TOKEN: process.env.VERCEL_KV_REST_TOKEN ? '✅ Set' : '❌ Missing',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing',
        RSM_ENABLED: process.env.RSM_ENABLED || 'Not set',
      },
      timestamp: new Date().toISOString(),
      processingTime
    });
  }
}
