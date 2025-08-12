import { Request, Response } from 'express';
import { z } from 'zod';
import { hybridProvider } from '../providers/hybridProvider';
import { cacheOrResolveImage } from '../utils/imageCache';
import { convertToBuffer } from '../utils/imageUtils';
import { logTelemetry } from '../utils/telemetry';

export async function handleVisionRoute(
  req: Request,
  res: Response,
  schema: z.ZodSchema,
  operation: 'describe' | 'ocr' | 'qa',
  helpText: string
) {
  try {
    // Parse and validate request body
    const body = schema.parse(req.body);
    
    // Cache or resolve the image
    const imageData = await cacheOrResolveImage(body.imageBase64);
    
    // Convert to buffer for provider
    const buffer = convertToBuffer(imageData);
    
    // Call the appropriate provider method
    let result: string;
    const startTime = Date.now();
    
    switch (operation) {
      case 'describe':
        result = await hybridProvider.describe(buffer, body.options);
        break;
      case 'ocr':
        result = await hybridProvider.ocr(buffer, body.options);
        break;
      case 'qa':
        result = await hybridProvider.qa(buffer, body.question, body.options);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    const duration = Date.now() - startTime;
    
    // Log telemetry
    logTelemetry({
      operation,
      success: true,
      duration,
      model: hybridProvider.getCurrentModel(),
      route: req.path,
      remoteAddr: req.ip || 'unknown'
    });
    
    // Return successful response
    res.json({
      result,
      model: hybridProvider.getCurrentModel(),
      cached: imageData.cached,
      timing: { duration }
    });
    
  } catch (error: any) {
    const duration = Date.now() - (req as any).startTime || 0;
    
    // Log error telemetry
    logTelemetry({
      operation,
      success: false,
      duration,
      error: error.message || 'Unknown error',
      err_code: error.err_code || 'UNKNOWN',
      route: req.path,
      remoteAddr: req.ip || 'unknown'
    });
    
    // Return error response
    const statusCode = error.err_code === 'INVALID_IMAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: error.message || 'Internal server error',
      err_code: error.err_code || 'UNKNOWN'
    });
  }
}
