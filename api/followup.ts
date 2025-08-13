import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Legacy followup endpoint for backward compatibility
interface FollowupRequest {
  imageBase64: string;
  mimeType?: string;
  question: string;
  language?: 'darija' | 'ar' | 'en';
  sessionId?: string;
}

interface FollowupResponse {
  speak: string;
  timestamp: string;
  sessionId: string;
  processingTime: number;
  followup: boolean;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createSystemPrompt(language: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), answering a follow-up question about an image.

🚨 CRITICAL: Respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script - ALWAYS use Arabic script
- This is a follow-up question, so be specific and direct
- Focus on answering the exact question asked
- Keep it brief and helpful`;
  }
  
  return `You are Nadar, answering a follow-up question about an image. Be specific and direct.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'legacy-followup');
  
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
      sessionId = `followup-${Date.now()}`
    }: FollowupRequest = req.body;

    if (!imageBase64 || !question) {
      return res.status(400).json({ error: 'imageBase64 and question are required' });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: createSystemPrompt(language)
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      },
      {
        text: question
      }
    ]);

    const response = await result.response;
    const text = response.text();

    const processingTime = Date.now() - startTime;

    const followupResponse: FollowupResponse = {
      speak: text,
      timestamp: new Date().toISOString(),
      sessionId,
      processingTime,
      followup: true
    };

    return res.status(200).json(followupResponse);

  } catch (error: any) {
    console.error('❌ Followup error:', error);
    
    return res.status(500).json({
      error: 'Followup failed',
      message: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      followup: true
    });
  }
}
