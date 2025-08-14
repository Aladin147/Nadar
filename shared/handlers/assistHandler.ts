import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  AssistRequest, 
  AssistResponse, 
  ImageSignals, 
  RequestContext,
  GenOptions 
} from '../types/api';
import { 
  assistBodySchema, 
  validateRequest 
} from '../utils/validation';
import { 
  extractTelemetryContext, 
  logTelemetry, 
  calculateImageBytes 
} from '../utils/telemetry';

// Fast image inspector for signal detection
async function inspectImage(
  imageBase64: string, 
  mimeType: string, 
  genAI: GoogleGenerativeAI
): Promise<ImageSignals> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    const prompt = `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean (true if any readable text is visible),
  "hazards": string[] (list of safety hazards like "moving vehicle", "stairs", "obstacle", max 3),
  "people_count": number (count of people visible, 0-10+),
  "lighting_ok": boolean (true if lighting is adequate for clear vision),
  "confidence": number (0.0-1.0, overall confidence in analysis)
}

Be concise and accurate. Return only valid JSON.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType
        }
      }
    ]);

    const responseText = result.response.text().trim();
    
    try {
      const signals = JSON.parse(responseText);
      return {
        has_text: Boolean(signals.has_text),
        hazards: Array.isArray(signals.hazards) ? signals.hazards.slice(0, 3).map(String) : [],
        people_count: Math.max(0, Math.min(10, Number(signals.people_count) || 0)),
        lighting_ok: Boolean(signals.lighting_ok),
        confidence: Math.max(0, Math.min(1, Number(signals.confidence) || 0))
      };
    } catch (parseError) {
      console.warn('Failed to parse image inspector JSON:', responseText);
      return {
        has_text: responseText.toLowerCase().includes('text'),
        hazards: [],
        people_count: 0,
        lighting_ok: true,
        confidence: 0.5
      };
    }
  } catch (error) {
    console.error('Image inspection failed:', error);
    return {
      has_text: false,
      hazards: [],
      people_count: 0,
      lighting_ok: true,
      confidence: 0.0
    };
  }
}

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

// Shared assist handler that works in both Express and Vercel environments
export async function handleAssistRequest(
  body: unknown,
  context: RequestContext,
  imageResolver?: (body: any) => Buffer | null
): Promise<AssistResponse> {
  const startTime = Date.now();
  
  try {
    // Validate request body
    const validatedBody = validateRequest(assistBodySchema, body);
    
    // Resolve image (different logic for Express vs Vercel)
    let imageBase64: string;
    if (validatedBody.imageBase64) {
      imageBase64 = validatedBody.imageBase64;
    } else if (validatedBody.imageRef === 'last' && imageResolver) {
      const imageBuffer = imageResolver(validatedBody);
      if (!imageBuffer) {
        throw new Error('No cached image found for imageRef: last');
      }
      imageBase64 = imageBuffer.toString('base64');
    } else {
      throw new Error('No valid image provided');
    }
    
    const mimeType = validatedBody.mimeType || 'image/jpeg';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Step 1: Fast image inspection
    const inspectionStart = Date.now();
    const signals = await inspectImage(imageBase64, mimeType, genAI);
    const inspectionTime = Date.now() - inspectionStart;
    
    console.log(`🔍 Image inspection signals:`, signals);
    
    // Step 2: Generate response based on signals and question
    const processingStart = Date.now();
    const language = validatedBody.options?.language || 'darija';
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: createSystemPrompt(language, signals, validatedBody.question)
    });

    const content: any[] = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ];

    if (validatedBody.question) {
      content.push({ text: validatedBody.question });
    } else {
      const defaultPrompt = language === 'darija' 
        ? 'ساعدني نفهم شنو كاين فهاد الصورة'
        : 'Help me understand what is in this image';
      content.push({ text: defaultPrompt });
    }

    const result = await model.generateContent(content);
    const response = await result.response;
    const responseText = response.text();
    const processingTime = Date.now() - processingStart;
    
    // Parse single-paragraph response
    let paragraph = responseText;
    let details: string[] = [];
    
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
        paragraph = parsed.paragraph;
        details = parsed.details;
      }
    } catch (parseError) {
      console.warn('Failed to parse single-paragraph JSON response, using fallback:', responseText);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Log successful telemetry
    logTelemetry({
      ts: new Date().toISOString(),
      mode: validatedBody.question ? 'qa' : 'describe',
      engine: 'gemini',
      route_path: context.route_path,
      image_bytes: calculateImageBytes(imageBase64),
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: processingTime,
      tts_ms: 0,
      chars_out: paragraph.length + details.join('').length,
      signals: signals,
      ok: true,
      remote_addr: context.remote_addr,
      user_agent: context.user_agent,
      request_id: context.request_id
    });
    
    return {
      result: paragraph,
      signals,
      model: 'gemini',
      timing: {
        inspection_ms: inspectionTime,
        processing_ms: processingTime,
        total_ms: totalTime
      },
      structured: {
        paragraph,
        details,
        has_text_content: signals.has_text
      },
      paragraph,
      details,
      show_read_all_text: signals.has_text
    };
    
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
    
    throw error;
  }
}
