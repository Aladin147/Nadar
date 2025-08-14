// Express adapter - maps Express req/res to core types

import type { Request, Response } from 'express';
import { AssistRequest, AssistDeps, RequestContext } from '../types/api';
import { handleAssist } from '../core/assistCore';

// Convert Express request to core AssistRequest
function mapExpressRequest(req: Request): AssistRequest {
  const body = req.body;
  
  // Convert base64 image to Uint8Array if present
  let image: Uint8Array | undefined;
  if (body.imageBase64) {
    image = new Uint8Array(Buffer.from(body.imageBase64, 'base64'));
  }
  
  return {
    sessionId: body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    image,
    imageRef: body.imageRef,
    question: body.question,
    language: body.options?.language || body.language || 'darija',
    verbosity: body.options?.verbosity || body.verbosity || 'normal'
  };
}

// Extract context from Express request
function extractContext(req: Request): RequestContext {
  return {
    route_path: req.path,
    remote_addr: req.ip || req.connection?.remoteAddress || 'unknown',
    user_agent: req.headers['user-agent'] || 'unknown',
    request_id: req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

// Express adapter for assist endpoint
export function createExpressAssistHandler(deps: AssistDeps) {
  return async (req: Request, res: Response) => {
    try {
      const coreRequest = mapExpressRequest(req);
      const result = await handleAssist(coreRequest, deps);
      
      if (result.ok) {
        res.json(result.data);
      } else {
        const statusCode = result.error.err_code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json({
          error: result.error.message,
          err_code: result.error.err_code,
          details: result.error.details
        });
      }
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Internal server error',
        err_code: 'UNKNOWN'
      });
    }
  };
}
