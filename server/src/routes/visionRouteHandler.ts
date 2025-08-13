import { Request, Response } from 'express';
import { z } from 'zod';
import { hybridProvider } from '../providers/hybridProvider';
import { cacheOrResolveImage } from '../utils/imageCache';
import { convertToBuffer } from '../utils/imageUtils';
import { logTelemetry } from '../utils/telemetry';

interface VisionRouteConfig {
  mode: 'describe' | 'ocr' | 'qa';
  schema: z.ZodSchema;
  providerCall: (provider: any, body: any) => Promise<any>;
}

export async function handleVisionRoute(
  req: Request,
  res: Response,
  config: VisionRouteConfig
) {
  try {
    // Parse and validate request body
    const body = config.schema.parse(req.body) as any;
    
    // Cache or resolve the image
    const imageData = await cacheOrResolveImage(body.imageBase64 || body.imageRef);
    
    // Convert to buffer for provider
    const buffer = convertToBuffer(imageData.data);
    
    // Call the provider method
    const startTime = Date.now();
    const result = await config.providerCall(hybridProvider, body);
    const duration = Date.now() - startTime;
    
    // Log telemetry
    logTelemetry({
      ts: new Date().toISOString(),
      mode: config.mode,
      route_path: req.path,
      image_bytes: buffer.length,
      audio_bytes_in: 0,
      total_ms: duration,
      model_ms: duration,
      tts_ms: 0,
      chars_out: result.text?.length || 0,
      ok: true,
      err_code: null,
      remote_addr: req.ip || 'unknown'
    });
    
    // Return successful response
    res.json({
      result: result.text,
      model: 'gemini',
      cached: imageData.cached,
      timing: { duration },
      structured: result.structured
    });
    
  } catch (error: any) {
    const duration = Date.now() - (req as any).startTime || 0;
    
    // Log error telemetry
    logTelemetry({
      ts: new Date().toISOString(),
      mode: config.mode,
      route_path: req.path,
      image_bytes: 0,
      audio_bytes_in: 0,
      total_ms: duration,
      model_ms: 0,
      tts_ms: 0,
      chars_out: 0,
      ok: false,
      err_code: error.err_code || 'UNKNOWN',
      remote_addr: req.ip || 'unknown'
    });
    
    // Return error response
    const statusCode = error.err_code === 'INVALID_IMAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: error.message || 'Internal server error',
      err_code: error.err_code || 'UNKNOWN'
    });
  }
}
