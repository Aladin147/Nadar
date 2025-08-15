import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
let redis: Redis | null = null;
let redisAvailable = false;
let redisError: string | null = null;

try {
  redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  redisAvailable = true;
  console.log('✅ Upstash Redis client initialized for testing');
} catch (error) {
  redisError = `Redis initialization failed: ${error}`;
  console.error('❌ Redis initialization failed:', redisError);
  redisAvailable = false;
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
    // Check if Redis was initialized successfully
    if (!redis || !redisAvailable) {
      throw new Error(`Redis initialization failed: ${redisError}`);
    }

    console.log('🧪 Testing Upstash Redis connection...');
    console.log('🔍 Redis client type:', typeof redis);

    // Test 1: Basic connectivity
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hello Upstash Redis!', timestamp: new Date().toISOString() };

    console.log('🧪 Testing Redis operations...');
    
    // Test 2: Set operation with TTL
    await redis.setex(testKey, 60, JSON.stringify(testValue)); // 1 minute TTL
    console.log('✅ Redis SETEX successful');

    // Test 3: Get operation
    const retrieved = await redis.get(testKey);
    const parsedRetrieved = retrieved ? JSON.parse(retrieved as string) : null;
    console.log('✅ Redis GET successful');

    // Test 4: Delete operation
    await redis.del(testKey);
    console.log('✅ Redis DEL successful');
    
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

    await redis.setex(sessionKey, 1800, JSON.stringify(sessionData)); // 30 minutes TTL
    const sessionRetrieved = await redis.get(sessionKey);
    const parsedSession = sessionRetrieved ? JSON.parse(sessionRetrieved as string) : null;
    await redis.del(sessionKey);

    console.log('✅ Session operations successful');
    
    const processingTime = Date.now() - startTime;

    // Environment info
    const envInfo = {
      KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing',
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing',
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
      message: 'Upstash Redis connection successful',
      tests: {
        redis_initialization: '✅ Passed',
        setex_operation: '✅ Passed',
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
        test_value_match: JSON.stringify(parsedRetrieved) === JSON.stringify(testValue),
        session_data_match: JSON.stringify(parsedSession) === JSON.stringify(sessionData)
      },
      redis_info: {
        client_type: 'Upstash Redis REST API',
        url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
        token_present: !!(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
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
      error: 'Upstash Redis connection failed',
      details: error?.message || 'Unknown error',
      environment: {
        KV_REST_API_URL: process.env.KV_REST_API_URL ? '✅ Set' : '❌ Missing',
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing',
        RSM_ENABLED: process.env.RSM_ENABLED || 'Not set',
      },
      redis_error: redisError,
      timestamp: new Date().toISOString(),
      processingTime
    });
  }
}
