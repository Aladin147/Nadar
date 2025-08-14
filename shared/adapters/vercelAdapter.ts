// Vercel adapter - maps VercelRequest to core types

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AssistRequest, AssistDeps, RequestContext } from '../types/api';
import { handleAssist } from '../core/assistCore';
import { handleOCR, OCRRequest } from '../core/ocrCore';
import { handleTTS, TTSRequest, TTSDeps } from '../core/ttsCore';

// Convert Vercel request to core AssistRequest
function mapVercelRequest(req: VercelRequest): AssistRequest {
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

// Extract context from Vercel request
function extractContext(req: VercelRequest): RequestContext {
  return {
    route_path: req.url || 'unknown',
    remote_addr: req.headers['x-forwarded-for'] as string || 'unknown',
    user_agent: req.headers['user-agent'] || 'unknown',
    request_id: req.headers['x-request-id'] as string || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
}

// Convert Vercel request to core OCRRequest
function mapVercelOCRRequest(req: VercelRequest): OCRRequest {
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
    full: body.full || false,
    language: body.options?.language || body.language || 'darija'
  };
}

// Convert Vercel request to core TTSRequest
function mapVercelTTSRequest(req: VercelRequest): TTSRequest {
  const body = req.body;

  return {
    sessionId: body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: body.text,
    voice: body.voice,
    provider: body.provider || 'gemini',
    rate: body.rate
  };
}

// Vercel adapter for assist endpoint
export function createVercelAssistHandler(deps: AssistDeps) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Set headers
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-handler', 'shared-core');

    // Check method
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        err_code: 'METHOD_NOT_ALLOWED'
      });
    }

    try {
      const coreRequest = mapVercelRequest(req);
      const result = await handleAssist(coreRequest, deps);

      if (result.ok) {
        res.status(200).json(result.data);
      } else {
        const error = result.error;
        const statusCode = error.err_code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json({
          error: error.message,
          err_code: error.err_code,
          details: error.details
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

// Vercel adapter for OCR endpoint
export function createVercelOCRHandler(deps: AssistDeps) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Set headers
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-handler', 'shared-core');

    // Check method
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        err_code: 'METHOD_NOT_ALLOWED'
      });
    }

    try {
      const coreRequest = mapVercelOCRRequest(req);
      const result = await handleOCR(coreRequest, deps);

      if (result.ok) {
        res.status(200).json(result.data);
      } else {
        const error = result.error;
        const statusCode = error.err_code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json({
          error: error.message,
          err_code: error.err_code,
          details: error.details
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

// Vercel adapter for TTS endpoint
export function createVercelTTSHandler(deps: TTSDeps) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Set headers
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-handler', 'shared-core');

    // Check method
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        err_code: 'METHOD_NOT_ALLOWED'
      });
    }

    try {
      const coreRequest = mapVercelTTSRequest(req);
      const result = await handleTTS(coreRequest, deps);

      if (result.ok) {
        res.status(200).json(result.data);
      } else {
        const error = result.error;
        const statusCode = error.err_code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json({
          error: error.message,
          err_code: error.err_code,
          details: error.details
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
