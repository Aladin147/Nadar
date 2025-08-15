// Self-contained health check endpoint for Vercel deployment

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set headers
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-type', 'application/json');
  res.setHeader('x-handler', 'robust-health-check');

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      err_code: 'METHOD_NOT_ALLOWED'
    });
  }

  const startTime = Date.now();
  const checks: any[] = [];
  let overallStatus = 'healthy';

  try {
    console.log('🏥 Starting health check...');

    // Check environment variables
    const envCheck = checkEnvironment();
    checks.push(envCheck);
    if (envCheck.status !== 'healthy') {
      overallStatus = 'unhealthy';
    }

    // Check Gemini service
    if (process.env.GEMINI_API_KEY) {
      const geminiCheck = await checkGeminiHealth();
      checks.push(geminiCheck);

      if (geminiCheck.status !== 'healthy') {
        overallStatus = 'unhealthy';
      }
    }

    // Check ElevenLabs service (if configured)
    if (process.env.ELEVENLABS_API_KEY) {
      const elevenLabsCheck = await checkElevenLabsHealth();
      checks.push(elevenLabsCheck);

      if (elevenLabsCheck.status !== 'healthy') {
        overallStatus = 'unhealthy';
      }
    }

    // Check system resources
    const systemCheck = checkSystemHealth();
    checks.push(systemCheck);
    if (systemCheck.status !== 'healthy') {
      overallStatus = systemCheck.status === 'degraded' ? 'degraded' : 'unhealthy';
    }

    const totalTime = Date.now() - startTime;

    const response = {
      ok: overallStatus === 'healthy', // Add ok field for client compatibility
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      version: '2.0.0-production-hardened',
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary: {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        unhealthy: checks.filter(c => c.status === 'unhealthy').length
      }
    };

    // Return appropriate HTTP status
    const statusCode = overallStatus === 'healthy' ? 200 :
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);

  } catch (error: any) {
    console.error('Health check endpoint error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      err_code: 'HEALTH_CHECK_ERROR',
      details: error.message
    });
  }
}

// Self-contained Gemini health check
async function checkGeminiHealth() {
  const startTime = Date.now();

  try {
    // Simple test call to Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY || ''
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        service: 'Gemini',
        status: 'healthy' as const,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: 'API responding normally'
      };
    } else {
      return {
        service: 'Gemini',
        status: 'unhealthy' as const,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: `API returned ${response.status}: ${response.statusText}`
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return {
      service: 'Gemini',
      status: 'unhealthy' as const,
      responseTime,
      lastCheck: new Date().toISOString(),
      details: error.message || 'Health check failed'
    };
  }
}

function checkEnvironment() {
  const requiredVars = ['GEMINI_API_KEY'];
  const optionalVars = ['ELEVENLABS_API_KEY'];
  const missing = requiredVars.filter(key => !process.env[key]);
  const present = requiredVars.filter(key => process.env[key]);
  const optional = optionalVars.filter(key => process.env[key]);

  let status = 'healthy';
  let details = `Required: ${present.length}/${requiredVars.length}, Optional: ${optional.length}/${optionalVars.length}`;

  if (missing.length > 0) {
    status = 'unhealthy';
    details = `Missing required environment variables: ${missing.join(', ')}`;
  }

  return {
    service: 'Environment',
    status,
    lastCheck: new Date().toISOString(),
    details,
    configuration: {
      required: present,
      optional,
      missing
    }
  };
}

async function checkElevenLabsHealth() {
  const startTime = Date.now();

  try {
    // Simple API call to check if ElevenLabs is responding
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        service: 'ElevenLabs',
        status: 'healthy' as const,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: 'API responding normally'
      };
    } else {
      return {
        service: 'ElevenLabs',
        status: 'unhealthy' as const,
        responseTime,
        lastCheck: new Date().toISOString(),
        details: `API returned ${response.status}: ${response.statusText}`
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return {
      service: 'ElevenLabs',
      status: 'unhealthy' as const,
      responseTime,
      lastCheck: new Date().toISOString(),
      details: error.message || 'Health check failed'
    };
  }
}

function checkSystemHealth() {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Convert bytes to MB
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Simple health thresholds
    let status = 'healthy';
    let details = `Uptime: ${Math.round(uptime)}s, Memory: ${memUsageMB.heapUsed}MB`;

    // Flag if memory usage is high (>500MB heap)
    if (memUsageMB.heapUsed > 500) {
      status = 'degraded';
      details += ' (High memory usage)';
    }

    // Flag if memory usage is very high (>1GB heap)
    if (memUsageMB.heapUsed > 1000) {
      status = 'unhealthy';
      details += ' (Critical memory usage)';
    }

    return {
      service: 'System',
      status,
      lastCheck: new Date().toISOString(),
      details,
      metrics: {
        uptime: Math.round(uptime),
        memory: memUsageMB,
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  } catch (error: any) {
    return {
      service: 'System',
      status: 'unhealthy' as const,
      lastCheck: new Date().toISOString(),
      details: `System check failed: ${error.message}`
    };
  }
}
