// Proof-of-concept: Shared core architecture pattern for Vercel
// This demonstrates the thin adapter approach with embedded core logic

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Core types (would be imported from shared package)
interface ImageSignals {
  has_text: boolean;
  hazards: string[];
  people_count: number;
  lighting_ok: boolean;
  confidence: number;
}

interface AssistRequest {
  sessionId: string;
  image?: Uint8Array;
  imageRef?: string;
  question?: string;
  language?: 'darija' | 'ar' | 'en';
  verbosity?: 'brief' | 'normal' | 'detailed';
}

interface AssistResponse {
  speak: string;
  details?: string[];
  signals: ImageSignals;
  followup_suggest?: string[];
  followupToken?: string;
  timing: {
    inspection_ms: number;
    processing_ms: number;
    total_ms: number;
  };
}

// Global image cache (simple implementation)
const imageCache = new Map<string, { buffer: Uint8Array; expires: number }>();

// Core business logic (would be in shared/core/assistCore.ts)
async function handleAssistCore(request: AssistRequest): Promise<AssistResponse> {
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  // Resolve image
  let image: Uint8Array;
  if (request.image) {
    image = request.image;
  } else if (request.imageRef) {
    const cached = imageCache.get(request.imageRef);
    if (!cached || cached.expires < Date.now()) {
      throw new Error(`No cached image found for imageRef: ${request.imageRef}`);
    }
    image = cached.buffer;
  } else {
    throw new Error('No valid image provided');
  }

  // Step 1: Fast image inspection
  const inspectionStart = Date.now();
  const signals = await inspectImage(image, genAI);
  const inspectionTime = Date.now() - inspectionStart;

  // Step 2: Generate response
  const processingStart = Date.now();
  const language = request.language || 'darija';
  const responseText = await generateResponse(image, language, signals, request.question, genAI);
  const processingTime = Date.now() - processingStart;

  // Parse response
  const { paragraph, details } = parseResponse(responseText);

  // Save image for reuse
  const followupToken = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  imageCache.set(followupToken, { buffer: image, expires: Date.now() + 5 * 60 * 1000 });

  const totalTime = Date.now() - startTime;

  // Log telemetry (shared pattern)
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    mode: request.question ? 'qa' : 'describe',
    engine: 'gemini',
    route_path: '/api/assist-shared',
    image_bytes: image.length,
    total_ms: totalTime,
    model_ms: processingTime,
    signals: signals,
    ok: true,
    request_id: request.sessionId
  }));

  return {
    speak: paragraph,
    details,
    signals,
    followup_suggest: language === 'darija' ? [
      'نقرا النص كامل؟',
      'فين الممر الخالي؟',
      'شنو كاين حداي؟'
    ] : [
      'Read all text?',
      'Where is the clear path?',
      'What is next to me?'
    ],
    followupToken,
    timing: {
      inspection_ms: inspectionTime,
      processing_ms: processingTime,
      total_ms: totalTime
    }
  };
}

// Helper functions (would be in shared modules)
async function inspectImage(image: Uint8Array, genAI: GoogleGenerativeAI): Promise<ImageSignals> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const imageBase64 = Buffer.from(image).toString('base64');

    const result = await model.generateContent([
      `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean,
  "hazards": string[],
  "people_count": number,
  "lighting_ok": boolean,
  "confidence": number
}`,
      { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } }
    ]);

    const responseText = result.response.text().trim();
    const signals = JSON.parse(responseText);

    return {
      has_text: Boolean(signals.has_text),
      hazards: Array.isArray(signals.hazards) ? signals.hazards.slice(0, 3) : [],
      people_count: Math.max(0, Math.min(10, Number(signals.people_count) || 0)),
      lighting_ok: Boolean(signals.lighting_ok),
      confidence: Math.max(0, Math.min(1, Number(signals.confidence) || 0))
    };
  } catch (error) {
    return { has_text: false, hazards: [], people_count: 0, lighting_ok: true, confidence: 0.5 };
  }
}

async function generateResponse(
  image: Uint8Array,
  language: string,
  signals: ImageSignals,
  question?: string,
  genAI?: GoogleGenerativeAI
): Promise<string> {
  const model = genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const imageBase64 = Buffer.from(image).toString('base64');

  const systemPrompt = `You are نظر (Nadar), helping blind users navigate safely.
Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short ${language === 'darija' ? 'Darija' : language} paragraph (≤2 sentences) with safety/next-step first",
  "details": ["Additional detail 1", "Additional detail 2", "Additional detail 3"]
}`;

  const userPrompt = question || (language === 'darija'
    ? 'ساعدني نفهم شنو كاين فهاد الصورة'
    : 'Help me understand what is in this image');

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
    { text: `${systemPrompt}\n\nUser: ${userPrompt}` }
  ]);

  return result.response.text();
}

function parseResponse(responseText: string): { paragraph: string; details: string[] } {
  try {
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanedResponse);
    if (parsed.paragraph && Array.isArray(parsed.details)) {
      return { paragraph: parsed.paragraph, details: parsed.details };
    }
  } catch (error) {
    // Fallback
  }
  return { paragraph: responseText, details: [] };
}

// Thin Vercel adapter (5 lines of mapping logic)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'shared-core-pattern');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', err_code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Map Vercel request to core request (adapter logic)
    const coreRequest: AssistRequest = {
      sessionId: req.body.sessionId || `session-${Date.now()}`,
      image: req.body.imageBase64 ? new Uint8Array(Buffer.from(req.body.imageBase64, 'base64')) : undefined,
      imageRef: req.body.imageRef,
      question: req.body.question,
      language: req.body.options?.language || req.body.language || 'darija',
      verbosity: req.body.options?.verbosity || 'normal'
    };

    // Call shared core logic
    const result = await handleAssistCore(coreRequest);

    // Return core response (no mapping needed)
    res.status(200).json(result);

  } catch (error: any) {
    const statusCode = error.message?.includes('No valid image') ? 400 : 500;
    res.status(statusCode).json({
      error: error.message || 'Internal server error',
      err_code: error.message?.includes('No valid image') ? 'INVALID_IMAGE' : 'UNKNOWN'
    });
  }
}
