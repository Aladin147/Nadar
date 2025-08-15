// Core business logic for OCR endpoint - runtime agnostic

import { 
  Result, 
  ProviderError,
  AssistDeps,
  TelemetryData
} from '../types/api';

export interface OCRRequest {
  sessionId: string;
  image?: Uint8Array;
  imageRef?: string;
  full?: boolean;
  language?: 'darija' | 'ar' | 'en';
}

export interface OCRResponse {
  text: string;
  timing: {
    processing_ms: number;
    total_ms: number;
  };
}

function createOCRPrompt(language: string, full: boolean): string {
  const langDir = language === 'ar' ? 'اكتب بالعربية الفصحى' : 
                  language === 'darija' ? 'اكتب بالدارجة المغربية' : 
                  'Write in English';

  if (full) {
    return `${langDir} Extract ALL text from this image. Include:
- All readable text, signs, labels, captions
- Text in any language or script
- Numbers, dates, times
- Menu items, prices, addresses
- Any other textual content

Return only the extracted text, preserving the original structure and formatting where possible.`;
  } else {
    return `${langDir} Extract the main text content from this image. Focus on:
- Primary text, headlines, main content
- Important signs or labels
- Key information that would be most relevant

Return only the extracted text in a clear, readable format.`;
  }
}

// Core OCR handler - pure business logic
export async function handleOCR(
  request: OCRRequest,
  deps: AssistDeps
): Promise<Result<OCRResponse>> {
  const startTime = deps.now();
  
  try {
    // Resolve image
    let image: Uint8Array;
    if (request.image) {
      image = request.image;
    } else if (request.imageRef) {
      const cachedImage = await deps.imageStore.get(request.imageRef);
      if (!cachedImage) {
        const error = {
          message: `No cached image found for imageRef: ${request.imageRef}`,
          err_code: 'IMAGE_NOT_FOUND'
        };
        
        // Log error telemetry
        deps.telemetry.log({
          ts: new Date().toISOString(),
          mode: 'ocr',
          engine: 'gemini',
          route_path: '/ocr',
          image_bytes: 0,
          audio_bytes_in: 0,
          total_ms: deps.now() - startTime,
          model_ms: 0,
          tts_ms: 0,
          chars_out: 0,
          ok: false,
          err_code: error.err_code,
          request_id: request.sessionId
        });
        
        return { ok: false, error };
      }
      image = cachedImage;
    } else {
      const error = {
        message: 'No valid image provided',
        err_code: 'INVALID_IMAGE'
      };
      
      // Log error telemetry
      deps.telemetry.log({
        ts: new Date().toISOString(),
        mode: 'ocr',
        engine: 'gemini',
        route_path: '/ocr',
        image_bytes: 0,
        audio_bytes_in: 0,
        total_ms: deps.now() - startTime,
        model_ms: 0,
        tts_ms: 0,
        chars_out: 0,
        ok: false,
        err_code: error.err_code,
        request_id: request.sessionId
      });
      
      return { ok: false, error };
    }
    
    // Generate OCR response
    const processingStart = deps.now();
    const language = request.language || 'darija';
    const prompt = createOCRPrompt(language, request.full || false);
    
    const responseResult = await deps.providers.generateResponse(
      image,
      'image/jpeg',
      prompt
    );

    if (!responseResult.ok) {
      const errorResult = responseResult as { ok: false; error: ProviderError };
      return { ok: false, error: errorResult.error };
    }
    
    const processingTime = deps.now() - processingStart;
    const totalTime = deps.now() - startTime;
    const extractedText = responseResult.data.trim();
    
    // Log successful telemetry
    deps.telemetry.log({
      ts: new Date().toISOString(),
      mode: 'ocr',
      engine: 'gemini',
      route_path: '/ocr',
      image_bytes: image.length,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: processingTime,
      tts_ms: 0,
      chars_out: extractedText.length,
      ok: true,
      request_id: request.sessionId
    });
    
    return {
      ok: true,
      data: {
        text: extractedText,
        timing: {
          processing_ms: processingTime,
          total_ms: totalTime
        }
      }
    };
    
  } catch (error: any) {
    const totalTime = deps.now() - startTime;
    
    // Log error telemetry
    deps.telemetry.log({
      ts: new Date().toISOString(),
      mode: 'ocr',
      engine: 'gemini',
      route_path: '/ocr',
      image_bytes: 0,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: 0,
      tts_ms: 0,
      chars_out: 0,
      ok: false,
      err_code: error.err_code || 'UNKNOWN',
      request_id: request.sessionId
    });
    
    return {
      ok: false,
      error: {
        message: error.message || 'Internal server error',
        err_code: error.err_code || 'UNKNOWN',
        details: error.details
      }
    };
  }
}
