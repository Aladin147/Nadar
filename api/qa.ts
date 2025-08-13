import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Q&A endpoint for answering questions about images
interface QARequest {
  imageBase64?: string;
  imageRef?: string;
  question: string;
  mimeType?: string;
  options?: {
    language?: 'darija' | 'ar' | 'en';
    verbosity?: 'brief' | 'normal' | 'detailed';
  };
  sessionId?: string;
}

interface QAResponse {
  text: string;
  timings?: { modelMs: number };
  tokens?: { input: number; output: number };
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createSystemPrompt(language: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), an AI assistant for blind users in Morocco. Answer questions about images.

🚨 CRITICAL: Respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script - ALWAYS use Arabic script
- Use authentic Moroccan expressions
- Answer the question directly and helpfully
- If you can't see something clearly, say "ما بانش ليا واضح" or "يمكن"`;
  }
  
  return `You are Nadar, an AI assistant for blind users. Answer questions about images clearly and helpfully.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'qa-endpoint');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      imageBase64,
      imageRef,
      question,
      mimeType = 'image/jpeg',
      options = {},
      sessionId
    }: QARequest = req.body;

    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    if (!imageBase64 && !imageRef) {
      return res.status(400).json({ error: 'imageBase64 or imageRef is required' });
    }

    if (imageRef && !sessionId) {
      return res.status(400).json({ error: 'sessionId is required when using imageRef' });
    }

    // For now, we'll only support imageBase64. imageRef would require session storage.
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageRef not supported yet, please use imageBase64' });
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
        text: question
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const modelMs = Date.now() - startTime;

    const qaResponse: QAResponse = {
      text,
      timings: { modelMs }
    };

    if (response.usageMetadata) {
      qaResponse.tokens = {
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0
      };
    }

    return res.status(200).json(qaResponse);

  } catch (error: any) {
    console.error('❌ Q&A error:', error);
    
    return res.status(500).json({
      error: 'Q&A failed',
      message: error?.message || 'Unknown error'
    });
  }
}
