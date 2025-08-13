import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// OCR endpoint for text extraction from images
interface OCRRequest {
  imageBase64?: string;
  imageRef?: string;
  mimeType?: string;
  options?: {
    language?: 'darija' | 'ar' | 'en';
  };
  sessionId?: string;
}

interface OCRResponse {
  text: string;
  timings?: { modelMs: number };
  tokens?: { input: number; output: number };
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'ocr-endpoint');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const {
      imageBase64,
      imageRef,
      mimeType = 'image/jpeg',
      options = {},
      sessionId
    }: OCRRequest = req.body;

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

    const language = options.language || 'en';
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });

    const prompt = language === 'darija' 
      ? 'استخرج كل النص الموجود في هذه الصورة. إذا لم يكن هناك نص، قل "ما كاين حتى نص".'
      : language === 'ar'
      ? 'استخرج كل النص الموجود في هذه الصورة. إذا لم يكن هناك نص، قل "لا يوجد نص".'
      : 'Extract all text from this image. If there is no text, say "No text found".';

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      },
      {
        text: prompt
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const modelMs = Date.now() - startTime;

    const ocrResponse: OCRResponse = {
      text,
      timings: { modelMs }
    };

    if (response.usageMetadata) {
      ocrResponse.tokens = {
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0
      };
    }

    return res.status(200).json(ocrResponse);

  } catch (error: any) {
    console.error('❌ OCR error:', error);
    
    return res.status(500).json({
      error: 'OCR failed',
      message: error?.message || 'Unknown error'
    });
  }
}
