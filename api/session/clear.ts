import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
let redis: Redis | null = null;
let redisAvailable = false;

try {
  redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  redisAvailable = true;
  console.log('✅ Upstash Redis client initialized for session clear');
} catch (error) {
  console.warn('⚠️ Upstash Redis not available for session clear:', error);
  redisAvailable = false;
}

// Session Manager with Upstash Redis
const sessionManager = {
  async clearSession(sessionId: string): Promise<void> {
    if (!redisAvailable || !redis) {
      console.warn('⚠️ Redis not available, cannot clear session');
      return; // Graceful degradation
    }

    try {
      await redis.del(`sess:${sessionId}`);
      console.log(`🗑️ Session cleared from Redis: ${sessionId}`);
    } catch (error) {
      console.error('❌ Session clear error:', error);
      throw error; // Re-throw for proper error handling
    }
  }
};

/**
 * Clear session memory endpoint
 * DELETE /api/session/clear
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'session-clear');
  
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ 
        error: 'sessionId is required',
        err_code: 'MISSING_SESSION_ID'
      });
    }

    // Clear the session
    await sessionManager.clearSession(sessionId);

    const processingTime = Date.now() - startTime;

    // Log telemetry
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      mode: 'session_clear',
      route_path: '/api/session/clear',
      total_ms: processingTime,
      ok: true,
      request_id: sessionId
    }));

    return res.status(200).json({
      success: true,
      message: 'Session memory cleared',
      sessionId,
      timestamp: new Date().toISOString(),
      processingTime
    });

  } catch (error: any) {
    console.error('❌ Session clear error:', error);
    
    const processingTime = Date.now() - startTime;

    // Log error telemetry
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      mode: 'session_clear',
      route_path: '/api/session/clear',
      total_ms: processingTime,
      ok: false,
      err_code: 'SESSION_CLEAR_FAILED',
      error: error.message
    }));
    
    return res.status(500).json({
      error: 'Failed to clear session memory',
      err_code: 'SESSION_CLEAR_FAILED',
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      processingTime
    });
  }
}
