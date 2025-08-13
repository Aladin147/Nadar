import { Router } from 'express';
import { z } from 'zod';
import { imageInspector, ImageSignals } from '../services/imageInspector';
import { hybridProvider } from '../providers/hybridProvider';
import { resolveImage, cacheImage } from '../index';
import { logTelemetry, extractTelemetryContext } from '../utils/telemetry';
import { ProviderError } from '../providers/ProviderError';

export const assistRouter = Router();

// Schema for assist request
const AssistBody = z.union([
  z.object({
    imageBase64: z.string().min(1, 'imageBase64 required'),
    mimeType: z.string().optional(),
    sessionId: z.string().optional(),
    question: z.string().optional(),
    options: z.object({
      verbosity: z.enum(['brief','normal','detailed']).optional(),
      language: z.enum(['darija','ar','en']).optional(),
    }).optional()
  }),
  z.object({
    imageRef: z.enum(['last']),
    sessionId: z.string().min(1, 'sessionId required for imageRef'),
    mimeType: z.string().optional(),
    question: z.string().optional(),
    options: z.object({
      verbosity: z.enum(['brief','normal','detailed']).optional(),
      language: z.enum(['darija','ar','en']).optional(),
    }).optional()
  })
]);

export const helpAssist = 'POST /assist expects JSON: { imageBase64, question?, options? } or { imageRef: "last", sessionId, question?, options? }';

assistRouter.get('/', (_req, res) => res.type('text/plain').send(helpAssist));

assistRouter.post('/', async (req, res) => {
  const startTime = Date.now();
  const context = extractTelemetryContext(req);
  
  try {
    // Parse and validate request body
    const body = AssistBody.parse(req.body);
    
    // Resolve image from request
    const imageBuffer = resolveImage(body);
    if (!imageBuffer) {
      throw new ProviderError('INVALID_IMAGE', 'No valid image provided');
    }
    
    // Cache image if sessionId provided
    cacheImage(body);
    
    // Convert buffer to base64 for inspection
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = body.mimeType || 'image/jpeg';
    
    // Step 1: Fast image inspection
    const inspectionStart = Date.now();
    const signals = await imageInspector.inspect(imageBase64, mimeType);
    const inspectionTime = Date.now() - inspectionStart;
    
    console.log(`🔍 Image inspection signals:`, signals);
    
    // Step 2: Generate response based on signals and question
    const processingStart = Date.now();
    let result: any;
    
    if (body.question) {
      // Q&A mode - answer the specific question first, then context
      result = await hybridProvider.qa({ 
        imageBase64, 
        question: body.question, 
        mimeType, 
        options: body.options,
        signals 
      });
    } else {
      // Scene description mode with signal-based routing
      result = await hybridProvider.describe({ 
        imageBase64, 
        mimeType, 
        options: body.options,
        signals 
      });
    }
    
    const processingTime = Date.now() - processingStart;
    const totalTime = Date.now() - startTime;
    
    // Log successful telemetry with signals
    logTelemetry({
      ts: new Date().toISOString(),
      mode: body.question ? 'qa' : 'describe',
      engine: 'gemini',
      route_path: context.route_path,
      image_bytes: imageBuffer.length,
      audio_bytes_in: 0, // No audio input in current implementation
      total_ms: totalTime,
      model_ms: processingTime,
      tts_ms: 0,
      chars_out: result.text?.length || 0,
      signals: signals,
      ok: true,
      remote_addr: context.remote_addr,
      user_agent: context.user_agent,
      request_id: context.request_id
    });
    
    // Return response with signals for client routing
    res.json({
      result: result.text,
      signals,
      model: 'gemini',
      timing: {
        inspection_ms: inspectionTime,
        processing_ms: processingTime,
        total_ms: totalTime
      },
      structured: result.structured,
      // Include paragraph and details for single-paragraph format
      paragraph: result.structured?.paragraph || result.text,
      details: result.structured?.details || [],
      // Expose "Read all text" when text is detected
      show_read_all_text: signals.has_text && (result.structured?.has_text_content !== false)
    });
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    
    // Log error telemetry
    logTelemetry({
      ts: new Date().toISOString(),
      mode: 'assist',
      engine: 'gemini',
      route_path: context.route_path,
      image_bytes: 0,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: 0,
      tts_ms: 0,
      chars_out: 0,
      ok: false,
      err_code: error.err_code || 'UNKNOWN',
      remote_addr: context.remote_addr,
      user_agent: context.user_agent,
      request_id: context.request_id
    });
    
    // Return error response
    const statusCode = error.err_code === 'INVALID_IMAGE' ? 400 : 500;
    res.status(statusCode).json({
      error: error.message || 'Internal server error',
      err_code: error.err_code || 'UNKNOWN'
    });
  }
});