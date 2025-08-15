import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple session memory for clearing (temporary inline implementation)
const sessionMemory = new Map<string, any>();

const sessionManager = {
  async clearSession(sessionId: string): Promise<void> {
    sessionMemory.delete(sessionId);
    console.log(`🗑️ Session cleared: ${sessionId}`);
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
