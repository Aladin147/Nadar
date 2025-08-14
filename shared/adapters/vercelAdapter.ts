import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractTelemetryContext } from '../utils/telemetry';
import { RequestContext, ErrorResponse } from '../types/api';

// Adapter to convert Vercel functions to use shared handlers

export function createVercelHandler<TRequest, TResponse>(
  handlerFn: (body: unknown, context: RequestContext, imageResolver?: any) => Promise<TResponse>,
  options: {
    allowedMethods?: string[];
    requiresImageResolver?: boolean;
  } = {}
) {
  const { allowedMethods = ['POST'], requiresImageResolver = false } = options;
  
  return async function vercelHandler(req: VercelRequest, res: VercelResponse) {
    // Set common headers
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-handler', 'shared-handler');
    
    // Check method
    if (!allowedMethods.includes(req.method || '')) {
      return res.status(405).json({ 
        error: 'Method not allowed',
        err_code: 'METHOD_NOT_ALLOWED' 
      } as ErrorResponse);
    }
    
    try {
      // Extract context for telemetry
      const context = extractTelemetryContext(req);
      
      // Simple image resolver for Vercel (no caching in serverless)
      const imageResolver = requiresImageResolver ? (body: any) => {
        // In serverless, we don't have persistent cache
        // This would need to be implemented with external storage if needed
        return null;
      } : undefined;
      
      // Call the shared handler
      const result = await handlerFn(req.body, context, imageResolver);
      
      return res.status(200).json(result);
      
    } catch (error: any) {
      console.error('Handler error:', error);
      
      // Determine status code based on error type
      let statusCode = 500;
      let errCode = 'INTERNAL_ERROR';
      
      if (error.message?.includes('Validation error')) {
        statusCode = 400;
        errCode = 'VALIDATION_ERROR';
      } else if (error.message?.includes('No valid image')) {
        statusCode = 400;
        errCode = 'INVALID_IMAGE';
      } else if (error.err_code) {
        errCode = error.err_code;
        statusCode = error.err_code === 'VALIDATION_ERROR' ? 400 : 500;
      }
      
      return res.status(statusCode).json({
        error: error.message || 'Internal server error',
        err_code: errCode,
        details: error.details || undefined
      } as ErrorResponse);
    }
  };
}

// Helper for GET endpoints that just return help text
export function createVercelHelpHandler(helpText: string) {
  return async function helpHandler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', 'text/plain');
    
    if (req.method === 'GET') {
      return res.status(200).send(helpText);
    }
    
    return res.status(405).json({ 
      error: 'Method not allowed',
      err_code: 'METHOD_NOT_ALLOWED' 
    });
  };
}
