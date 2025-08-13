import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Legacy assist endpoint for backward compatibility
// This maps the old /assist format to the new multimodal logic

interface LegacyAssistRequest {
  sessionId?: string;
  imageBase64: string;
  mimeType?: string;
  question?: string;
  language?: 'darija' | 'ar' | 'en';
  verbosity?: 'brief' | 'normal';
}

interface LegacyAssistResponse {
  speak: string;
  details?: string[];
  signals: {
    has_text: boolean;
    hazards: string[];
    people_count: number;
    lighting_ok: boolean;
    confidence: number;
  };
  followup_suggest?: string[];
  timestamp: string;
  sessionId: string;
  processingTime: number;
  fallback?: boolean;
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createSystemPrompt(language: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco. Analyze the image and provide helpful guidance.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
- You MUST respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script (kayn, gadi, bzaf) - ALWAYS use Arabic script (كاين، غادي، بزاف)

Important rules:
1. ALWAYS write in Arabic script - this is non-negotiable for TTS
2. Use authentic Moroccan Darija expressions
3. Information priority: Safety first, then answer questions, then describe environment
4. If there's important text, say "كاين نص هنا، بغيتي نقراه ليك؟"
5. If there's danger, start with "انتبه!" or "حذاري!"
6. Write as one natural paragraph, no bullet points
7. Speak like a friend describing the scene
8. Don't use "كنشوف" or "كما تشوف"
9. If uncertain, say "يمكن" or "كيبان ليا"

Keep it brief - 2-3 sentences maximum.`;
  }
  
  return `You are Nadar, an AI assistant for blind users. Analyze the image and provide helpful guidance in a single paragraph.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'legacy-assist-compatibility');
  
  console.log('🔄 Legacy assist endpoint called');

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }

  const startTime = Date.now();

  try {
    const {
      sessionId = `legacy-${Date.now()}`,
      imageBase64,
      mimeType = 'image/jpeg',
      question,
      language = 'darija',
      verbosity = 'brief'
    }: LegacyAssistRequest = req.body;

    console.log('📝 Legacy assist request:', {
      sessionId,
      hasImage: !!imageBase64,
      hasQuestion: !!question,
      language,
      verbosity,
      imageLength: imageBase64?.length || 0
    });

    if (!imageBase64) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'imageBase64 is required'
      });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: createSystemPrompt(language)
    });

    // Build content for Gemini
    const content: any[] = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ];

    // Add question if provided
    if (question) {
      content.push({
        text: question
      });
    } else {
      const defaultPrompt = language === 'darija' 
        ? 'وصف لي شنو كاين فهاد الصورة'
        : 'Describe what you see in this image';
      content.push({
        text: defaultPrompt
      });
    }

    console.log('🧠 Sending request to Gemini 2.5 Flash');

    // Generate response
    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    const processingTime = Date.now() - startTime;

    console.log(`✅ Legacy assist response generated in ${processingTime}ms`);

    // Create mock signals for compatibility
    const signals = {
      has_text: text.includes('نص') || text.includes('text') || text.includes('كتابة'),
      hazards: text.includes('انتبه') || text.includes('حذاري') ? ['potential_hazard'] : [],
      people_count: 0, // Could be enhanced with actual detection
      lighting_ok: true, // Could be enhanced with actual analysis
      confidence: 0.85
    };

    // Generate follow-up suggestions
    const followup_suggest = language === 'darija' ? [
      'نقرا النص كامل؟',
      'فين الممر الخالي؟',
      'شنو كاين حداي؟'
    ] : [
      'Read all text?',
      'Where is the clear path?',
      'What is next to me?'
    ];

    const legacyResponse: LegacyAssistResponse = {
      speak: text,
      signals,
      followup_suggest,
      timestamp: new Date().toISOString(),
      sessionId,
      processingTime,
      fallback: false
    };

    return res.status(200).json(legacyResponse);

  } catch (error: any) {
    console.error('❌ Legacy assist error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return res.status(500).json({
      error: 'Legacy assist failed',
      message: error?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      processingTime,
      fallback: true
    });
  }
}
