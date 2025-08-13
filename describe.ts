import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Legacy describe endpoint for backward compatibility
interface DescribeRequest {
  imageBase64: string;
  mimeType?: string;
  options?: {
    language?: 'darija' | 'ar' | 'en';
    verbosity?: 'brief' | 'normal' | 'detailed';
  };
  sessionId?: string;
}

interface DescribeResponse {
  text: string;
  timings?: { modelMs: number };
  tokens?: { input: number; output: number };
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createSystemPrompt(language: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), an AI assistant for blind users in Morocco. Describe what you see in the image.

🚨 CRITICAL: Respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script - ALWAYS use Arabic script
- Use authentic Moroccan expressions
- Keep it natural and conversational
- Focus on what's most important for navigation and understanding`;
  }
  
  return `You are Nadar, an AI assistant for blind users. Describe what you see in the image clearly and helpfully.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'legacy-describe');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      options = {},
      sessionId
    }: DescribeRequest = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const language = options.language || 'darija';
    
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
        text: language === 'darija' ? 'وصف لي شنو كاين فهاد الصورة' : 'Describe what you see in this image'
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const modelMs = Date.now() - startTime;

    const describeResponse: DescribeResponse = {
      text,
      timings: { modelMs }
    };

    if (response.usageMetadata) {
      describeResponse.tokens = {
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0
      };
    }

    return res.status(200).json(describeResponse);

  } catch (error: any) {
    console.error('❌ Describe error:', error);
    
    return res.status(500).json({
      error: 'Description failed',
      message: error?.message || 'Unknown error'
    });
  }
}
