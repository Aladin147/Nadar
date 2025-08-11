import { Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { HybridProvider } from '../providers/hybridProvider';
import { resolveImage, cacheImage } from '../index';
import { mapGeminiError } from '../providers/geminiProvider';
import { createTelemetryLogger, calculateRequestSize, extractTelemetryContext } from '../utils/telemetry';
import { GenOptions, GenResult } from '../providers/IAIProvider';

export type VisionMode = 'describe' | 'ocr' | 'qa';

export interface VisionRouteConfig {
  mode: VisionMode;
  schema: ZodSchema;
  providerCall: (provider: HybridProvider, args: {
    imageBase64: string;
    mimeType: string;
    options?: GenOptions;
    [key: string]: any;
  }) => Promise<GenResult>;
}

/**
 * Shared handler for vision routes (/describe, /ocr, /qa)
 * Extracts common logic: zod parse, cache/resolve image, convert buffer, 
 * call provider, telemetry, response handling
 */
export async function handleVisionRoute(
  req: Request,
  res: Response,
  config: VisionRouteConfig
): Promise<void> {
  const { mode, schema, providerCall } = config;
  const telemetryContext = extractTelemetryContext(req);
  const telemetry = createTelemetryLogger(mode, telemetryContext);
  const parse = schema.safeParse(req.body);

  if (!parse.success) {
    telemetry.log(false, 0, 0, 0, 'INVALID_INPUT');
    res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
    return;
  }

  const bytesIn = calculateRequestSize(req.body);

  // Cache new image if provided
  cacheImage(req.body);

  // Resolve image from cache or body
  const imageBuffer = resolveImage(req.body);
  if (!imageBuffer) {
    telemetry.log(false, 0, 0, bytesIn, 'NO_IMAGE');
    res.status(400).json({ error: 'No image provided or cached image not found' });
    return;
  }

  const imageBase64 = imageBuffer.toString('base64');
  const mimeType = req.body.mimeType || 'image/jpeg';

  try {
    const provider = new HybridProvider();
    const result = await providerCall(provider, {
      imageBase64,
      mimeType,
      ...(parse.data as any)
    });
    
    const modelMs = result.timings?.model || 0;
    telemetry.log(true, modelMs, 0, bytesIn, null, 'gemini-1.5-flash', 'gemini');
    res.json(result);
  } catch (e: any) {
    // Preserve ProviderError codes; fallback to mapping for unknown errors
    const { message, err_code } = e?.err_code ? { message: e.message, err_code: e.err_code } : mapGeminiError(e);
    telemetry.log(false, 0, 0, bytesIn, err_code, 'gemini-1.5-flash', 'gemini');
    res.status(500).json({ message, err_code });
  }
}
