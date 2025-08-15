// Proof-of-concept: Shared core architecture pattern for Vercel
// This demonstrates the thin adapter approach with embedded core logic

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Try to import Vercel KV
let kv: any = null;
let kvAvailable = false;

try {
  // Import @vercel/kv
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
  kvAvailable = true;
  console.log('✅ Vercel KV imported successfully');
} catch (error) {
  console.warn('⚠️ Vercel KV not available:', error);
  kvAvailable = false;
}

// Rolling Session Memory Configuration
const RSM_ENABLED = process.env.RSM_ENABLED === '1';
const SESSION_TTL = 1800; // 30 minutes

// Session Memory Types
interface QA {
  q: string;
  a: string;
  t: string;
}

interface SessionShard {
  followupToken?: string;
  capturedAt?: string;
  signals?: any;
  user_intent?: string;
  recentQA?: QA[];
  facts?: string[];
  prefs?: {
    lang?: "darija" | "ar" | "en";
    ttsRate?: number;
    voice?: string;
  };
}

// Session Manager with Vercel KV (Upstash Redis)
const sessionManager = {
  async getContext(sessionId: string): Promise<string> {
    if (!RSM_ENABLED || !kvAvailable || !kv) return '';

    try {
      const session = await kv.get(`sess:${sessionId}`) as SessionShard;
      if (!session) return '';

      // Format context with priority-based packing
      const parts: string[] = [];

      // 1. User intent (highest priority)
      if (session.user_intent) {
        parts.push(`Intent: ${session.user_intent}`);
      }

      // 2. Facts (high priority)
      if (session.facts && session.facts.length > 0) {
        parts.push(`Facts: ${session.facts.join(' • ')}`);
      }

      // 3. Recent Q&A (medium priority)
      if (session.recentQA && session.recentQA.length > 0) {
        const qa = session.recentQA
          .slice(-3) // Keep last 3
          .map(q => `Q: ${q.q} → A: ${q.a}`)
          .join('\n');
        parts.push(`Recent:\n${qa}`);
      }

      const context = parts.join('\n');

      // Enforce character limit (≤1200 chars ≈ 300 tokens)
      const trimmedContext = context.length > 1200 ? context.slice(0, 1200) + '...' : context;

      return trimmedContext ? `\n\n--- Session Context (use only if relevant) ---\n${trimmedContext}\n--- End Context ---\n` : '';
    } catch (error) {
      console.error('❌ Session context error:', error);
      return ''; // Graceful degradation
    }
  },

  async updateSession(sessionId: string, update: any): Promise<void> {
    if (!RSM_ENABLED || !kvAvailable || !kv) return;

    try {
      // Get current session
      const current = (await kv.get(`sess:${sessionId}`) as SessionShard) || {};

      // Update timestamp
      current.capturedAt = new Date().toISOString();

      // Update Q&A if provided
      if (update.question && update.answer) {
        const newQA: QA = {
          q: update.question,
          a: update.answer,
          t: new Date().toISOString(),
        };

        const recentQA = [...(current.recentQA || []), newQA].slice(-3); // Keep last 3
        current.recentQA = recentQA;
      }

      // Update other fields
      if (update.signals) current.signals = update.signals;
      if (update.followupToken) current.followupToken = update.followupToken;
      if (update.userIntent) current.user_intent = update.userIntent;

      // Update facts (merge with existing, keep unique)
      if (update.facts && update.facts.length > 0) {
        const allFacts = [...(current.facts || []), ...update.facts];
        current.facts = [...new Set(allFacts)].slice(-3); // Keep last 3 unique facts
      }

      // Update preferences
      if (update.prefs) {
        current.prefs = { ...current.prefs, ...update.prefs };
      }

      // Save to KV with TTL
      await kv.set(`sess:${sessionId}`, current, { ex: SESSION_TTL });

      console.log(`✅ Session updated in KV: ${sessionId}`);
    } catch (error) {
      console.error('❌ Session update error:', error);
      // Don't throw - graceful degradation
    }
  },

  extractFacts(text: string, confidence: number): string[] {
    if (confidence < 0.6) return [];

    const facts: string[] = [];
    const lowerText = text.toLowerCase();

    // Navigation keywords
    const keywords = [
      'exit', 'خروج', 'مخرج',
      'entrance', 'دخول', 'مدخل',
      'stairs', 'درج', 'سلالم',
      'elevator', 'مصعد', 'أسانسير',
      'toilet', 'حمام', 'مرحاض',
      'restaurant', 'مطعم', 'ريستو',
      'pharmacy', 'صيدلية', 'فارماسي',
      'hospital', 'مستشفى', 'سبيطار',
      'police', 'شرطة', 'بوليس',
      'parking', 'موقف', 'باركينغ',
    ];

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        facts.push(keyword.toUpperCase());
      }
    }

    // Extract numbers (room numbers, floor numbers, etc.)
    const numbers = text.match(/\b\d{1,4}\b/g);
    if (numbers && numbers.length > 0) {
      facts.push(`Room/Floor: ${numbers.slice(0, 2).join(', ')}`);
    }

    return facts.slice(0, 3);
  },

  async getSessionInfo(sessionId: string): Promise<SessionShard | null> {
    if (!RSM_ENABLED || !kvAvailable || !kv) return null;

    try {
      return await kv.get(`sess:${sessionId}`) as SessionShard;
    } catch (error) {
      console.error('❌ Session info error:', error);
      return null;
    }
  },

  guessUserIntent(recentQA: QA[], signals?: any): string {
    if (!recentQA || recentQA.length === 0) return '';

    const lastQuestion = recentQA[recentQA.length - 1]?.q.toLowerCase() || '';

    // Simple intent classification
    if (lastQuestion.includes('exit') || lastQuestion.includes('خروج') || lastQuestion.includes('مخرج')) {
      return 'finding exit';
    }
    if (lastQuestion.includes('toilet') || lastQuestion.includes('حمام') || lastQuestion.includes('مرحاض')) {
      return 'finding restroom';
    }
    if (lastQuestion.includes('food') || lastQuestion.includes('eat') || lastQuestion.includes('مطعم') || lastQuestion.includes('أكل')) {
      return 'finding food';
    }
    if (lastQuestion.includes('read') || lastQuestion.includes('text') || lastQuestion.includes('قرا') || lastQuestion.includes('نص')) {
      return 'reading text';
    }
    if (signals?.people_count && signals.people_count > 0) {
      return 'navigating crowded area';
    }
    if (signals?.has_text) {
      return 'reading signage';
    }

    return 'general assistance';
  },

  async clearSession(sessionId: string): Promise<void> {
    if (!RSM_ENABLED || !kvAvailable || !kv) return;

    try {
      await kv.del(`sess:${sessionId}`);
      console.log(`🗑️ Session cleared from KV: ${sessionId}`);
    } catch (error) {
      console.error('❌ Session clear error:', error);
      // Don't throw - graceful degradation
    }
  }
};

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
  sessionId?: string;
  timing: {
    inspection_ms: number;
    processing_ms: number;
    total_ms: number;
  };
}

// Global image cache (shared with OCR endpoint)
const imageCache = new Map<string, { buffer: Uint8Array; expires: number }>();

// Export cache for use by other endpoints
export { imageCache };

// Core business logic (would be in shared/core/assistCore.ts)
async function handleAssistCore(request: AssistRequest): Promise<AssistResponse> {
  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  // Get session context for memory
  const sessionContext = await sessionManager.getContext(request.sessionId);
  console.log(`📝 Session context for ${request.sessionId}: ${sessionContext ? 'found' : 'none'}`);

  // Resolve image
  let image: Uint8Array;
  if (request.image) {
    image = request.image;
  } else if (request.imageRef) {
    let cached;

    if (request.imageRef === 'last') {
      // Find the most recent image in cache
      let mostRecentImage = null;
      let mostRecentTime = 0;

      for (const [key, value] of imageCache.entries()) {
        if (value.expires > Date.now()) { // Only consider non-expired images
          const timestamp = parseInt(key.split('-')[1]); // Extract timestamp from key
          if (timestamp > mostRecentTime) {
            mostRecentTime = timestamp;
            mostRecentImage = value;
          }
        }
      }

      if (!mostRecentImage) {
        throw new Error('No recent cached image found for imageRef: last');
      }
      cached = mostRecentImage;
      console.log(`📸 Using most recent cached image (timestamp: ${mostRecentTime})`);
    } else {
      // Use exact imageRef lookup
      cached = imageCache.get(request.imageRef);
      if (!cached || cached.expires < Date.now()) {
        throw new Error(`No cached image found for imageRef: ${request.imageRef}`);
      }
    }

    image = cached.buffer;
  } else {
    throw new Error('No valid image provided');
  }

  // Step 1: Fast image inspection
  const inspectionStart = Date.now();
  const signals = await inspectImage(image, genAI);
  const inspectionTime = Date.now() - inspectionStart;

  // Step 2: Generate response with session context
  const processingStart = Date.now();
  const language = request.language || 'darija';
  const responseResult = await generateResponse(image, language, signals, request.question, genAI, sessionContext);
  const processingTime = Date.now() - processingStart;

  // Parse response
  const { paragraph, details } = parseResponse(responseResult.text);
  const tokenUsage = responseResult.tokenUsage;

  // Save image for reuse
  const followupToken = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  imageCache.set(followupToken, { buffer: image, expires: Date.now() + 5 * 60 * 1000 });

  const totalTime = Date.now() - startTime;

  // Update session memory after successful response
  const sessionUpdateStart = Date.now();
  try {
    // Extract facts from OCR if available
    const facts = signals.has_text && paragraph ?
      sessionManager.extractFacts(paragraph, signals.confidence) : [];

    // Guess user intent from the interaction
    const currentSession = await sessionManager.getSessionInfo(request.sessionId);
    const userIntent = sessionManager.guessUserIntent(
      currentSession?.recentQA || [],
      signals
    );

    await sessionManager.updateSession(request.sessionId, {
      question: request.question,
      answer: paragraph,
      signals,
      followupToken,
      userIntent: userIntent || undefined,
      facts: facts.length > 0 ? facts : undefined,
    });
  } catch (error) {
    console.error('❌ Session update error:', error);
    // Don't fail the request if session update fails
  }
  const sessionUpdateTime = Date.now() - sessionUpdateStart;

  // Log telemetry (shared pattern) with session context info
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    mode: request.question ? 'qa' : 'describe',
    engine: 'gemini',
    route_path: '/api/assist-shared',
    image_bytes: image.length,
    total_ms: totalTime,
    model_ms: processingTime,
    signals: signals,
    has_ctx: !!sessionContext,
    ctx_tokens_est: sessionContext ? Math.ceil(sessionContext.length / 4) : 0,
    ctx_write_ms: sessionUpdateTime,
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
    sessionId: request.sessionId, // Return sessionId for client tracking
    timing: {
      inspection_ms: inspectionTime,
      processing_ms: processingTime,
      total_ms: totalTime
    },
    // Add token usage for cost tracking
    tokenUsage: tokenUsage || undefined
  };
}

// Helper functions (would be in shared modules)
async function inspectImage(image: Uint8Array, genAI: GoogleGenerativeAI): Promise<ImageSignals> {
  try {
    // Use fast model for inspection only (MVP architecture)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 200, // Short response for inspection
        temperature: 0.1      // Low temperature for consistent JSON
      }
    });
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
  genAI?: GoogleGenerativeAI,
  sessionContext?: string
): Promise<{ text: string; tokenUsage?: { input: number; output: number; total: number } }> {
  // Use quality model for main response generation (sophisticated MVP architecture)
  const model = genAI!.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 2048,
      temperature: 0.7,
      // Proper thinking budget configuration for maximum speed (3-4s target)
      // Using type assertion until SDK is updated
      ...(process.env.NODE_ENV === 'production' && {
        thinkingConfig: {
          thinkingBudget: 0  // Disable thinking for maximum speed
        }
      } as any)
    }
  });
  const imageBase64 = Buffer.from(image).toString('base64');

  const systemPrompt = language === 'darija' ?
    `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
- You MUST respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script (kayn, gadi, bzaf) - ALWAYS use Arabic script (كاين، غادي، بزاف)
- This is essential for text-to-speech functionality

MANDATORY Arabic Script Words:
- Use "كاين" NOT "kayn"
- Use "غادي" NOT "gadi"
- Use "بزاف" NOT "bzaf"
- Use "شوية" NOT "chwiya"
- Use "راه" NOT "rah"
- Use "ديال" NOT "dyal"

Important rules:
1. ALWAYS write in Arabic script - this is non-negotiable for TTS
2. Use authentic Moroccan Darija expressions
3. Information priority: Safety first, then answer question, then important text, then environment
4. If there's important text, say "كاين نص هنا، بغيتي نقراه ليك؟"
5. If there's danger, start with "انتبه!" or "حذاري!"
6. Don't use "كنشوف" or "كما تشوف"
7. Don't identify people by name
8. If uncertain, say "يمكن" or "كيبان ليا"

Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short Darija paragraph (≤2 sentences) with safety/next-step first, ONLY Arabic script",
  "details": ["Additional detail 1 in Darija", "Additional detail 2 in Darija", "Additional detail 3 in Darija"]
}

CORRECT Example (Arabic script only):
{"paragraph": "انتبه! كاين درج قدامك، خاصك تطلع بحذر. كاين نص على لوحة على اليمين.", "details": ["المكان فيه إضاءة مزيانة", "الطريق واضح", "ما كاينش عوائق أخرى"]}` :
    `You are نظر (Nadar), helping blind users navigate safely.
Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short ${language} paragraph (≤2 sentences) with safety/next-step first",
  "details": ["Additional detail 1", "Additional detail 2", "Additional detail 3"]
}`;

  const userPrompt = question || (language === 'darija'
    ? 'ساعدني نفهم شنو كاين فهاد الصورة'
    : 'Help me understand what is in this image');

  // Build the full prompt with session context
  let fullPrompt = `${systemPrompt}`;

  // Add session context if available (with guard instruction)
  if (sessionContext && sessionContext.trim()) {
    fullPrompt += sessionContext;
    fullPrompt += '\n\nIMPORTANT: Use the session context above ONLY if it is relevant to the current question or image. If not relevant, ignore it completely.';
  }

  fullPrompt += `\n\nUser: ${userPrompt}`;

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
    { text: fullPrompt }
  ]);

  const response = result.response;
  const responseText = response.text();

  // Extract real token usage if available (for cost tracking)
  const usageMetadata = response.usageMetadata;
  let tokenUsage;
  if (usageMetadata) {
    tokenUsage = {
      input: usageMetadata.promptTokenCount || 0,
      output: usageMetadata.candidatesTokenCount || 0,
      total: usageMetadata.totalTokenCount || 0
    };
    console.log('📊 Token usage:', tokenUsage);
  }

  return { text: responseText, tokenUsage };
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
    console.error('❌ Assist-shared error:', error);
    console.error('❌ Error stack:', error.stack);

    const statusCode = error.message?.includes('No valid image') ? 400 : 500;
    res.status(statusCode).json({
      error: error.message || 'Internal server error',
      err_code: error.message?.includes('No valid image') ? 'INVALID_IMAGE' : 'UNKNOWN',
      details: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString()
    });
  }
}
