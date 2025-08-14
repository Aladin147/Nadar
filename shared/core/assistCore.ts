// Core business logic for assist endpoint - runtime agnostic

import { 
  AssistRequest, 
  AssistResponse, 
  AssistDeps, 
  Result, 
  ImageSignals,
  ProviderError 
} from '../types/api';

function createSystemPrompt(
  language: string, 
  signals?: ImageSignals, 
  question?: string
): string {
  const langDir = language === 'ar' ? 'اكتب بالعربية الفصحى' : 
                  language === 'darija' ? 'اكتب بالدارجة المغربية' : 
                  'Write in English';

  return `${langDir} You are نظر (Nadar), helping blind users navigate safely.

Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short ${language === 'darija' ? 'Darija' : language} paragraph (≤2 sentences) with safety/next-step first",
  "details": ["Additional detail 1", "Additional detail 2", "Additional detail 3"],
  "has_text_content": ${signals?.has_text ? 'true' : 'false'}
}

For the paragraph:
- Start with safety information or immediate next steps
- Keep to maximum 2 sentences in ${language === 'darija' ? 'Darija' : language}
- Be actionable and concise
${question ? '- Answer the specific question first, then provide context' : ''}
${signals?.has_text ? 
  '- IMPORTANT: Since text was detected, mention the visible text content prominently in your response' : 
  '- Focus on scene description and navigation guidance'}

For details array:
- Provide 2-4 additional bullet points for "More" expansion
- Include objects, navigation guidance, environmental context
${signals?.has_text ? '- Include text-related details since text was detected' : ''}
- Keep each detail concise but informative

Don't identify people; avoid reading private screens; express uncertainty when unsure. Never use phrases like "as you can see" or "if you look".`;
}

function parseResponse(responseText: string): { paragraph: string; details: string[] } {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanedResponse);
    if (parsed.paragraph && Array.isArray(parsed.details)) {
      return {
        paragraph: parsed.paragraph,
        details: parsed.details
      };
    }
  } catch (parseError) {
    console.warn('Failed to parse single-paragraph JSON response, using fallback:', responseText);
  }
  
  return {
    paragraph: responseText,
    details: []
  };
}

function createFollowupSuggestions(language: string): string[] {
  return language === 'darija' ? [
    'نقرا النص كامل؟',
    'فين الممر الخالي؟',
    'شنو كاين حداي؟'
  ] : [
    'Read all text?',
    'Where is the clear path?',
    'What is next to me?'
  ];
}

// Core assist handler - pure business logic
export async function handleAssist(
  request: AssistRequest,
  deps: AssistDeps
): Promise<Result<AssistResponse>> {
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
          mode: 'assist',
          engine: 'gemini',
          route_path: '/assist',
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
        mode: 'assist',
        engine: 'gemini',
        route_path: '/assist',
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
    
    // Step 1: Fast image inspection
    const inspectionStart = deps.now();
    const signalsResult = await deps.providers.inspectImage(image, 'image/jpeg');
    if (!signalsResult.ok) {
      return signalsResult;
    }
    const signals = signalsResult.data;
    const inspectionTime = deps.now() - inspectionStart;
    
    // Step 2: Generate response
    const processingStart = deps.now();
    const language = request.language || 'darija';
    const systemPrompt = createSystemPrompt(language, signals, request.question);
    
    const defaultPrompt = request.question || (language === 'darija' 
      ? 'ساعدني نفهم شنو كاين فهاد الصورة'
      : 'Help me understand what is in this image');
    
    const responseResult = await deps.providers.generateResponse(
      image,
      'image/jpeg',
      `${systemPrompt}\n\nUser: ${defaultPrompt}`
    );

    if (!responseResult.ok) {
      return responseResult;
    }
    
    const processingTime = deps.now() - processingStart;
    
    // Parse response
    const { paragraph, details } = parseResponse(responseResult.data);
    
    // Generate followup suggestions
    const followup_suggest = createFollowupSuggestions(language);
    
    // Save image for potential reuse and generate followup token
    const followupToken = await deps.imageStore.save(image, 5); // 5 minute TTL
    
    const totalTime = deps.now() - startTime;
    
    // Log telemetry
    deps.telemetry.log({
      ts: new Date().toISOString(),
      mode: request.question ? 'qa' : 'describe',
      engine: 'gemini',
      route_path: '/assist',
      image_bytes: image.length,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: processingTime,
      tts_ms: 0,
      chars_out: paragraph.length + details.join('').length,
      signals: signals,
      ok: true,
      request_id: request.sessionId
    });
    
    return {
      ok: true,
      data: {
        speak: paragraph,
        details,
        signals,
        followup_suggest,
        followupToken,
        timing: {
          inspection_ms: inspectionTime,
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
      mode: 'assist',
      engine: 'gemini',
      route_path: '/assist',
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
