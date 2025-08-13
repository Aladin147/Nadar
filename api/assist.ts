import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Standard assist endpoint for backward compatibility
interface AssistRequest {
  imageBase64: string;
  mimeType?: string;
  question?: string;
  language?: 'darija' | 'ar' | 'en';
  verbosity?: 'brief' | 'normal';
  sessionId?: string;
}

interface AssistResponse {
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createSystemPrompt(language: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco.

🚨 CRITICAL: Respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script - ALWAYS use Arabic script
- Use authentic Moroccan expressions
- Prioritize safety, then answer questions, then describe environment
- If there's text, say "كاين نص هنا، بغيتي نقراه ليك؟"
- If there's danger, start with "انتبه!" or "حذاري!"
- Keep it brief and conversational`;
  }
  
  return `You are Nadar, an AI assistant for blind users. Provide helpful guidance about what you see.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'standard-assist');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      question,
      language = 'darija',
      verbosity = 'brief',
      sessionId = `assist-${Date.now()}`
    }: AssistRequest = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    console.log(`🤖 Standard assist request: ${sessionId}, hasQuestion: ${!!question}, language: ${language}`);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: createSystemPrompt(language)
    });

    const content: any[] = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ];

    if (question) {
      content.push({ text: question });
    } else {
      const defaultPrompt = language === 'darija' 
        ? 'ساعدني نفهم شنو كاين فهاد الصورة'
        : 'Help me understand what is in this image';
      content.push({ text: defaultPrompt });
    }

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    const processingTime = Date.now() - startTime;

    // Create mock signals for compatibility
    const signals = {
      has_text: text.includes('نص') || text.includes('text') || text.includes('كتابة'),
      hazards: text.includes('انتبه') || text.includes('حذاري') ? ['potential_hazard'] : [],
      people_count: 0,
      lighting_ok: true,
      confidence: 0.85
    };

    const followup_suggest = language === 'darija' ? [
      'نقرا النص كامل؟',
      'فين الممر الخالي؟',
      'شنو كاين حداي؟'
    ] : [
      'Read all text?',
      'Where is the clear path?',
      'What is next to me?'
    ];

    const assistResponse: AssistResponse = {
      speak: text,
      signals,
      followup_suggest,
      timestamp: new Date().toISOString(),
      sessionId,
      processingTime,
      fallback: false
    };

    console.log(`✅ Standard assist completed in ${processingTime}ms`);

    return res.status(200).json(assistResponse);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Standard assist error:', error);
    
    return res.status(500).json({
      error: 'Assist failed',
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      processingTime,
      fallback: true
    });
  }
}
