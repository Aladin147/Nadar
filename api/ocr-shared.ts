// OCR endpoint for text extraction from images
// Direct implementation for Vercel deployment

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { imageCache } from './assist-shared';

// Cleanup expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (value.expires < now) {
      imageCache.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set headers
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-type', 'application/json');
  res.setHeader('x-handler', 'ocr-direct');

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      err_code: 'METHOD_NOT_ALLOWED'
    });
  }

  const startTime = Date.now();

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    if (!genAI) {
      return res.status(500).json({
        error: 'Gemini API not configured',
        err_code: 'GEMINI_CONFIG_ERROR'
      });
    }

    // Parse request
    const { sessionId, imageRef, full = true, language = 'darija' } = req.body;

    if (!imageRef) {
      return res.status(400).json({
        error: 'imageRef is required',
        err_code: 'MISSING_IMAGE_REF'
      });
    }

    // Get cached image
    const cachedImage = imageCache.get(imageRef);
    if (!cachedImage) {
      return res.status(404).json({
        error: 'Image not found or expired',
        err_code: 'IMAGE_NOT_FOUND'
      });
    }

    // Extract text using Gemini
    const processingStart = Date.now();
    const text = await extractText(cachedImage.buffer, language, genAI);
    const processingTime = Date.now() - processingStart;

    const totalTime = Date.now() - startTime;

    const response = {
      text,
      timing: {
        processing_ms: processingTime,
        total_ms: totalTime
      }
    };

    console.log(`📄 OCR completed in ${totalTime}ms, text length: ${text.length}`);
    res.status(200).json(response);

  } catch (error: any) {
    console.error('OCR endpoint error:', error);
    res.status(500).json({
      error: 'OCR processing failed',
      err_code: 'OCR_ERROR',
      details: error.message
    });
  }
}

// Extract text from image using Gemini
async function extractText(
  image: Uint8Array,
  language: string,
  genAI: GoogleGenerativeAI
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 4096,
      temperature: 0.1, // Low temperature for accurate text extraction
      // Proper thinking budget configuration for maximum speed
      // Using type assertion until SDK is updated
      ...(process.env.NODE_ENV === 'production' && {
        thinkingConfig: {
          thinkingBudget: 0  // Disable thinking for maximum speed
        }
      } as any)
    }
  });

  const imageBase64 = Buffer.from(image).toString('base64');

  const prompt = language === 'darija' ?
    `استخرج كل النص الموجود في هذه الصورة. اكتب النص كما هو بدون تغيير أو ترجمة. إذا كان النص بالعربية، اكتبه بالعربية. إذا كان بالإنجليزية، اكتبه بالإنجليزية. إذا كان بالفرنسية، اكتبه بالفرنسية. احتفظ بالتنسيق والترتيب الأصلي للنص.` :
    language === 'ar' ?
    `استخرج جميع النصوص الموجودة في هذه الصورة. اكتب النص كما هو بدون تغيير أو ترجمة. احتفظ بالتنسيق والترتيب الأصلي.` :
    `Extract all text from this image. Write the text exactly as it appears without any changes or translation. Preserve the original formatting and order.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
  ]);

  const response = await result.response;
  const text = response.text().trim();

  if (!text || text.length === 0) {
    return 'لم يتم العثور على نص في هذه الصورة.';
  }

  return text;
}

// Cache is imported from assist-shared to ensure consistency
