import type { VercelRequest, VercelResponse } from '@vercel/node';

// Try to import Vercel KV with fallback
let kv: any = null;
let kvAvailable = false;

try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv || kvModule.default || kvModule;
  kvAvailable = true;
  console.log('✅ Vercel KV imported successfully for session clear');
} catch (error) {
  console.warn('⚠️ Vercel KV not available for session clear:', error);
  kvAvailable = false;
}

// Session Manager with Vercel KV (Upstash Redis)
const sessionManager = {
  async clearSession(sessionId: string): Promise<void> {
    if (!kvAvailable) {
      console.warn('⚠️ KV not available, cannot clear session');
      return; // Graceful degradation
    }

    try {
      await kv.del(`sess:${sessionId}`);
      console.log(`🗑️ Session cleared from KV: ${sessionId}`);
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
