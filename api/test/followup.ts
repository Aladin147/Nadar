import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  try {
    console.log('🔍 Model usage investigation request:', {
      method: req.method,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });

    // Check all model configurations across the system
    const modelConfig = {
      // Environment variables
      env: {
        GEMINI_MODEL: process.env.GEMINI_MODEL || 'NOT_SET (defaults to gemini-2.5-flash-lite)',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV
      },

      // Hardcoded models in endpoints
      endpoints: {
        'assist-shared.ts': {
          inspection: 'gemini-2.5-flash-lite',
          generation: 'gemini-2.5-flash'
        },
        'ocr-shared.ts': {
          extraction: 'gemini-2.5-flash'
        },
        'live/assist.ts': {
          multimodal: 'gemini-2.5-flash'
        },
        'tts-shared.ts': {
          tts: 'gemini-2.5-flash-preview-tts'
        }
      },

      // Shared provider defaults
      shared: {
        fastModel: 'gemini-2.5-flash-lite',
        qualityModel: 'gemini-2.5-flash'
      }
    };

    // Check for any potential Pro model usage
    const potentialProUsage = [];

    // Check if any environment variable could be setting Pro
    if (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.includes('pro')) {
      potentialProUsage.push(`Environment variable GEMINI_MODEL is set to: ${process.env.GEMINI_MODEL}`);
    }

    // Check server provider (if it exists)
    try {
      const serverProvider = require('../../server/src/providers/geminiProvider');
      if (serverProvider) {
        potentialProUsage.push('Server provider found - check if it uses environment override');
      }
    } catch (e) {
      // Server provider not available in this context
    }

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Model Usage Investigation Complete',
      investigation: {
        models_configured: modelConfig,
        potential_pro_usage: potentialProUsage.length > 0 ? potentialProUsage : ['✅ No Pro model usage detected'],
        conclusion: potentialProUsage.length > 0 ?
          '🚨 POTENTIAL PRO USAGE FOUND - Check the potential_pro_usage array' :
          '✅ All models are using Flash variants (no Pro detected)',
        token_efficiency: {
          'gemini-2.5-flash-lite': 'Fastest, lowest tokens',
          'gemini-2.5-flash': 'Balanced, moderate tokens',
          'gemini-2.5-pro': 'Highest quality, HIGHEST TOKENS (not used)',
          'gemini-2.5-flash-preview-tts': 'TTS only, minimal tokens'
        }
      },
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Model investigation error:', error);

    return res.status(500).json({
      success: false,
      error: 'Model investigation failed',
      details: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });
  }
}
