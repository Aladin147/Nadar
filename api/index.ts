import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Schemas for request validation
const imageBase64 = z.string().min(1, 'imageBase64 required');
const mimeType = z.string().optional();
const sessionId = z.string().optional();
const options = z.object({
  verbosity: z.enum(['brief','normal','detailed']).optional(),
  language: z.enum(['darija','ar','en']).optional(),
}).optional();

const DescribeBody = z.object({
  imageBase64,
  mimeType,
  sessionId,
  options
});

const TTSBody = z.object({
  text: z.string().min(1, 'text required'),
  voice: z.string().optional(),
  rate: z.number().min(0.25).max(4.0).optional()
});

const AssistBody = z.object({
  sessionId: z.string().optional(),
  imageBase64: z.string().min(1, 'imageBase64 required'),
  mimeType: z.string().optional(),
  question: z.string().optional(),
  language: z.enum(['darija','ar','en']).optional(),
  verbosity: z.enum(['brief','normal']).optional()
});

const FollowUpBody = z.object({
  sessionId: z.string().min(1, 'sessionId required for follow-up'),
  question: z.string().min(1, 'question required'),
  language: z.enum(['darija','ar','en']).optional(),
  verbosity: z.enum(['brief','normal']).optional()
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// Simple in-memory cache for last images (for follow-up questions)
const imageCache = new Map<string, { imageBase64: string; mimeType: string; timestamp: number }>();

// Clean up old cache entries (older than 1 hour)
function cleanupCache() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [sessionId, data] of imageCache.entries()) {
    if (data.timestamp < oneHourAgo) {
      imageCache.delete(sessionId);
    }
  }
}

// Build system prompt for vision processing
function buildSystemPrompt(options?: any) {
  const verbosity = options?.verbosity ?? 'brief';
  const language = options?.language ?? 'darija';
  const langDir = language === 'darija' ? 'Respond in Darija (Moroccan Arabic).' :
                  language === 'ar' ? 'Respond in Modern Standard Arabic.' :
                  'Respond in English.';

  return `${langDir} You are نظر (Nadar), an AI assistant for blind users in Morocco. You are their eyes, guiding them through daily navigation.

When analyzing images, prioritize by proximity and importance:
1. IMMEDIATE dangers or critical safety information (red lights, obstacles, hazards)
2. Navigation guidance (what's ahead, direction, movement options)
3. Environmental context (location, objects, people nearby)

Format strictly as:
Only respond using Darija in Arabic Script.
IMMEDIATE: [1 short sentence - safety/critical info first]
OBJECTS: [up to 2 bullets - key items by proximity]
NAVIGATION: [1 short sentence - movement guidance]

Keep responses very concise and actionable. Assume users are on the move and need quick, essential information. Don't identify people; avoid reading private screens; express uncertainty when unsure. Never use phrases like "as you can see" or "if you look".${verbosity === 'brief' ? ' Keep response to max 3 short bullet points.' : verbosity === 'detailed' ? ' Provide more detail but remain structured and concise.' : ''}`;
}

// Build smart assist prompt - comprehensive and intelligent
function buildAssistPrompt(options?: any, question?: string, signals?: any) {
  const language = options?.language ?? 'darija';
  const verbosity = options?.verbosity ?? 'brief';

  const questionContext = question ? `
USER QUESTION: "${question}"
IMPORTANT: Answer the user's specific question FIRST, then provide additional context.` : '';

  const signalContext = signals ? `
DETECTED SIGNALS:
- Text present: ${signals.has_text ? 'YES' : 'NO'}
- Hazards: ${signals.hazards?.length > 0 ? signals.hazards.join(', ') : 'None detected'}
- People count: ${signals.people_count || 0}
- Lighting: ${signals.lighting_ok ? 'Good' : 'Poor'}
- Confidence: ${signals.confidence || 0.5}` : '';

  // Language-specific instructions
  if (language === 'darija') {
    return `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco. Your task is to describe the environment in a helpful and practical way using Moroccan Darija in Arabic script.

${questionContext}${signalContext}

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
- You MUST respond ONLY in Moroccan Darija using Arabic script (الحروف العربية)
- NEVER use Latin script (kayn, gadi, bzaf) - ALWAYS use Arabic script (كاين، غادي، بزاف)
- Do NOT use French, English, or Modern Standard Arabic
- This is essential for text-to-speech functionality

MANDATORY Arabic Script Words:
- Use "كاين" NOT "kayn"
- Use "غادي" NOT "gadi"
- Use "بزاف" NOT "bzaf"
- Use "شوية" NOT "chwiya"
- Use "راه" NOT "rah"
- Use "ديال" NOT "dyal"
- Use "هنا" NOT "hna"
- Use "هناك" NOT "hnak"

Important rules:
1. ALWAYS write in Arabic script - this is non-negotiable for TTS
2. Use authentic Moroccan Darija expressions
3. Information priority:
   - Safety first: any immediate dangers or obstacles
   - Answer user's question if provided
   - Important text if present
   - Most relevant environmental information
   - Navigation guidance

4. If there's important text, say "كاين نص هنا، بغيتي نقراه ليك؟"
5. If there's danger, start with "انتبه!" or "حذاري!"
6. Write as one natural paragraph, no bullet points or headers
7. Speak like a friend describing the scene
8. Don't use "كنشوف" or "كما تشوف"
9. Don't identify people by name
10. If uncertain, say "يمكن" or "كيبان ليا"

${verbosity === 'brief' ? 'Keep it brief - 2-3 sentences maximum.' : 'Give helpful details but focus on what matters most.'}

CORRECT Example (Arabic script only):
"انتبه! كاين درج قدامك، خاصك تطلع بحذر. كاين نص على لوحة على اليمين، بغيتي نقراه ليك؟ المكان فيه إضاءة مزيانة والطريق واضح."

WRONG Example (Latin script - DO NOT DO THIS):
"Attention! kayn droj 9odamek, khasek ttle3 b7ader."`;
  } else if (language === 'ar') {
    return `You are نظر (Nadar), an intelligent AI assistant for blind users. Respond in Modern Standard Arabic.

${questionContext}${signalContext}

Describe the environment helpfully and practically in Modern Standard Arabic. Focus on safety, navigation, and answering any user questions.

${verbosity === 'brief' ? 'Keep responses brief and focused.' : 'Provide helpful detail while staying practical.'}`;
  } else {
    return `You are Nadar, an intelligent AI assistant for blind users. Respond in English.

${questionContext}${signalContext}

Describe the environment helpfully and practically in English. Focus on safety, navigation, and answering any user questions.

${verbosity === 'brief' ? 'Keep responses brief and focused.' : 'Provide helpful detail while staying practical.'}`;
  }
}

// Quick analysis prompt for signal detection
function buildSignalPrompt() {
  return `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean,
  "hazards": ["obstacle"|"vehicle"|"drop"|"crowd"|"unknown"],
  "people_count": number,
  "lighting_ok": boolean,
  "confidence": number
}

Rules:
- has_text: true if readable text is prominent (signs, documents, screens)
- hazards: array of immediate dangers detected
- people_count: approximate number of people visible (0 if none)
- lighting_ok: true if lighting is adequate for navigation
- confidence: 0.0-1.0 how confident you are in this analysis

Return ONLY the JSON, no other text.`;
}

// Convert base64 to inline image format for Gemini
function toInlineImage(imageBase64: string, mimeType: string = 'image/jpeg') {
  return { inlineData: { data: imageBase64, mimeType } };
}

// Main handler function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Route handling
  const { url } = req;

  if (url === '/health' || url === '/') {
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: 'Nadar API Server',
      version: '1.0.0'
    });
    return;
  }

  // Handle describe endpoint
  if (url === '/describe' && req.method === 'POST') {
    try {
      // Validate request body
      const parseResult = DescribeBody.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.issues[0]?.message || 'Validation failed'
        });
        return;
      }

      const { imageBase64, mimeType, options, sessionId } = parseResult.data;

      // Check for API key
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return;
      }

      // Process image with Gemini
      const startTime = Date.now();
      const systemPrompt = buildSystemPrompt(options);
      const parts = [systemPrompt, toInlineImage(imageBase64, mimeType)];

      // Generate content with timeout
      const timeoutMs = 30000; // 30 seconds
      const result = await Promise.race([
        model.generateContent(parts as any),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
        })
      ]) as any;

      const endTime = Date.now();
      const text = result.response.text();

      res.status(200).json({
        text,
        timestamp: new Date().toISOString(),
        sessionId: sessionId || `session-${Date.now()}`,
        processingTime: endTime - startTime
      });
      return;

    } catch (error: any) {
      console.error('Error processing describe request:', error);

      // Map Gemini errors to user-friendly messages
      let errorMessage = 'Failed to process image description';
      let errorCode = 'UNKNOWN';

      if (error?.message?.includes('timeout')) {
        errorMessage = 'The model took too long. Try again.';
        errorCode = 'TIMEOUT';
      } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        errorMessage = 'Daily limit reached. Try later.';
        errorCode = 'QUOTA';
      } else if (error?.message?.includes('unauthorized') || error?.message?.includes('API key')) {
        errorMessage = 'API key invalid on server.';
        errorCode = 'UNAUTHORIZED';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'No connection. Check internet.';
        errorCode = 'NETWORK';
      }

      res.status(500).json({ error: errorMessage, err_code: errorCode });
      return;
    }
  }

  // Handle TTS endpoint
  if (url === '/tts' && req.method === 'POST') {
    try {
      // Validate request body
      const parseResult = TTSBody.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.issues[0]?.message || 'Validation failed'
        });
        return;
      }

      const { text, voice } = parseResult.data;

      // Check for API key
      if (!process.env.ELEVENLABS_API_KEY) {
        res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
        return;
      }

      // Voice mapping for ElevenLabs
      const voiceMap: Record<string, string> = {
        'alloy': 'pNInz6obpgDQGcFmaJgB', // Adam - warm, engaging
        'echo': 'VR6AewLTigWG4xSOukaG', // Antoni - well-rounded
        'fable': 'ErXwobaYiN019PkySvjV', // Arnold - crisp, clear
        'onyx': 'VR6AewLTigWG4xSOukaG', // Antoni (fallback)
        'nova': 'jsCqWAovK2LkecY7zXl4', // Bella - friendly
        'shimmer': 'AZnzlk1XvdvUeBnXmlld', // Domi - confident
        'Kore': 'OfGMGmhShO8iL9jCkXy8', // Darija voice - perfect for Moroccan Arabic
        'darija': 'OfGMGmhShO8iL9jCkXy8', // Direct Darija voice mapping
      };

      const voiceId = voiceMap[voice || 'Kore'] || voiceMap['Kore'];
      const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

      // Process TTS with ElevenLabs
      const startTime = Date.now();

      const response = await Promise.race([
        fetch(ttsUrl, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'accept': 'audio/mpeg',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.7,
              style: 0,
              use_speaker_boost: true
            },
          }),
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TTS timeout')), 20000);
        })
      ]) as Response;

      const endTime = Date.now();

      if (!response.ok) {
        let detail = '';
        try {
          detail = await response.text();
        } catch {}
        res.status(500).json({
          error: `ElevenLabs API error: ${response.status}`,
          err_code: 'ELEVENLABS_ERROR',
          details: detail
        });
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio/')) {
        const maybeText = await response.text().catch(() => '');
        res.status(500).json({
          error: 'Invalid audio response from ElevenLabs',
          err_code: 'INVALID_AUDIO',
          details: maybeText.slice(0, 200)
        });
        return;
      }

      const audioBuffer = await response.arrayBuffer();
      if (audioBuffer.byteLength === 0) {
        res.status(500).json({ error: 'Empty audio from ElevenLabs', err_code: 'EMPTY_AUDIO' });
        return;
      }

      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      res.status(200).json({
        audioBase64,
        mimeType: 'audio/mpeg',
        timestamp: new Date().toISOString(),
        processingTime: endTime - startTime
      });
      return;

    } catch (error: any) {
      console.error('Error processing TTS request:', error);

      // Map TTS errors to user-friendly messages
      let errorMessage = 'Failed to generate speech';
      let errorCode = 'UNKNOWN';

      if (error?.message?.includes('timeout')) {
        errorMessage = 'Speech generation took too long. Try again.';
        errorCode = 'TIMEOUT';
      } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        errorMessage = 'Daily limit reached. Try later.';
        errorCode = 'QUOTA';
      } else if (error?.message?.includes('unauthorized') || error?.message?.includes('API key')) {
        errorMessage = 'API key invalid on server.';
        errorCode = 'UNAUTHORIZED';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'No connection. Check internet.';
        errorCode = 'NETWORK';
      }

      res.status(500).json({ error: errorMessage, err_code: errorCode });
      return;
    }
  }

  // Handle smart assist endpoint
  if (url === '/assist' && req.method === 'POST') {
    try {
      // Validate request body
      const parseResult = AssistBody.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.issues[0]?.message || 'Validation failed'
        });
        return;
      }

      const { imageBase64, mimeType, question, sessionId, language, verbosity } = parseResult.data;

      // Check for API key
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return;
      }

      const startTime = Date.now();

      // Step 1: Quick signal detection
      const signalPrompt = buildSignalPrompt();
      const signalParts = [signalPrompt, toInlineImage(imageBase64, mimeType)];

      let signals = {
        has_text: false,
        hazards: [] as string[],
        people_count: 0,
        lighting_ok: true,
        confidence: 0.5
      };

      try {
        const signalResult = await Promise.race([
          model.generateContent(signalParts as any),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Signal detection timeout')), 10000);
          })
        ]) as any;

        const signalText = signalResult.response.text();
        const parsedSignals = JSON.parse(signalText);
        signals = { ...signals, ...parsedSignals };
      } catch (error) {
        console.log('Signal detection failed, using defaults:', error);
      }

      // Step 2: Generate smart response
      const assistPrompt = buildAssistPrompt({ language, verbosity }, question, signals);
      const assistParts = [assistPrompt, toInlineImage(imageBase64, mimeType)];

      const assistResult = await Promise.race([
        model.generateContent(assistParts as any),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Assist timeout')), 25000);
        })
      ]) as any;

      const endTime = Date.now();
      const responseText = assistResult.response.text();

      // Cache the image for follow-up questions
      const finalSessionId = sessionId || `session-${Date.now()}`;
      imageCache.set(finalSessionId, {
        imageBase64,
        mimeType: mimeType || 'image/jpeg',
        timestamp: Date.now()
      });

      // Clean up old cache entries periodically
      if (Math.random() < 0.1) { // 10% chance to cleanup
        cleanupCache();
      }

      // Parse response into speak and details
      const sentences = responseText.split(/[.!?]+/).filter(s => s.trim());
      const speak = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '.' : '');
      const details = sentences.length > 2 ? sentences.slice(2).map(s => s.trim()).filter(s => s) : undefined;

      // Generate follow-up suggestions based on signals
      const followup_suggest = [];
      if (signals.has_text) {
        followup_suggest.push("اقرا لي النص كامل"); // "Read me all the text"
      }
      if (signals.hazards.length > 0) {
        followup_suggest.push("شنو الخطر اللي قدامي؟"); // "What danger is in front of me?"
      }
      if (signals.people_count > 0) {
        followup_suggest.push("شكون الناس اللي هنا؟"); // "Who are the people here?"
      }

      res.status(200).json({
        speak,
        details,
        signals,
        followup_suggest: followup_suggest.slice(0, 3),
        timestamp: new Date().toISOString(),
        sessionId: finalSessionId,
        processingTime: endTime - startTime
      });
      return;

    } catch (error: any) {
      console.error('Error processing assist request:', error);

      // Fallback to basic description if assist fails
      try {
        const fallbackPrompt = buildSystemPrompt({ language: 'darija', verbosity: 'brief' });
        const fallbackParts = [fallbackPrompt, toInlineImage(req.body.imageBase64, req.body.mimeType)];

        const fallbackResult = await model.generateContent(fallbackParts as any);
        const fallbackText = fallbackResult.response.text();

        res.status(200).json({
          speak: fallbackText,
          signals: { has_text: false, hazards: [], people_count: 0, lighting_ok: true, confidence: 0.3 },
          fallback: true,
          timestamp: new Date().toISOString(),
          sessionId: req.body.sessionId || `session-${Date.now()}`,
          processingTime: Date.now() - Date.now()
        });
        return;
      } catch (fallbackError) {
        // Final fallback
        res.status(500).json({
          error: 'Vision processing failed',
          err_code: 'VISION_ERROR',
          speak: 'معذرة، ما قدرتش نشوف الصورة دابا. جرب مرة أخرى.' // "Sorry, I couldn't see the image now. Try again."
        });
        return;
      }
    }
  }

  // Handle follow-up questions endpoint
  if (url === '/followup' && req.method === 'POST') {
    try {
      // Validate request body
      const parseResult = FollowUpBody.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.issues[0]?.message || 'Validation failed'
        });
        return;
      }

      const { sessionId, question, language, verbosity } = parseResult.data;

      // Check for API key
      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return;
      }

      // Get cached image
      const cachedImage = imageCache.get(sessionId);
      if (!cachedImage) {
        res.status(400).json({
          error: 'No image found for this session. Please take a new photo first.',
          err_code: 'NO_CACHED_IMAGE'
        });
        return;
      }

      const startTime = Date.now();

      // Generate follow-up response using cached image
      let followUpPrompt: string;

      if (language === 'darija') {
        followUpPrompt = `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco. The user is asking a follow-up question about the same image.

User's question: "${question}"

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

Be accurate and helpful. If the question is about reading text, read all the text clearly. If it's about details, provide more details about the requested part.

${verbosity === 'brief' ? 'Keep the answer brief and direct.' : 'Provide sufficient detail for a complete answer.'}`;
      } else if (language === 'ar') {
        followUpPrompt = `You are نظر (Nadar), an intelligent AI assistant for blind users. The user is asking a follow-up question about the same image.

User's question: "${question}"

Respond in Modern Standard Arabic. Be accurate and helpful.

${verbosity === 'brief' ? 'Keep the answer brief and direct.' : 'Provide sufficient detail for a complete answer.'}`;
      } else {
        followUpPrompt = `You are Nadar, an intelligent AI assistant for blind users. The user is asking a follow-up question about the same image.

User's question: "${question}"

Respond in English. Be accurate and helpful.

${verbosity === 'brief' ? 'Keep the answer brief and direct.' : 'Provide sufficient detail for a complete answer.'}`;
      }

      const followUpParts = [followUpPrompt, toInlineImage(cachedImage.imageBase64, cachedImage.mimeType)];

      const followUpResult = await Promise.race([
        model.generateContent(followUpParts as any),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Follow-up timeout')), 20000);
        })
      ]) as any;

      const endTime = Date.now();
      const responseText = followUpResult.response.text();

      res.status(200).json({
        speak: responseText,
        timestamp: new Date().toISOString(),
        sessionId,
        processingTime: endTime - startTime,
        followup: true
      });
      return;

    } catch (error: any) {
      console.error('Error processing follow-up request:', error);

      let errorMessage = 'Failed to process follow-up question';
      let errorCode = 'UNKNOWN';

      if (error?.message?.includes('timeout')) {
        errorMessage = 'Follow-up took too long. Try again.';
        errorCode = 'TIMEOUT';
      } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        errorMessage = 'Daily limit reached. Try later.';
        errorCode = 'QUOTA';
      }

      res.status(500).json({ error: errorMessage, err_code: errorCode });
      return;
    }
  }

  // Handle other endpoints with placeholder responses
  res.status(200).json({
    message: 'Nadar API Server',
    endpoint: url,
    method: req.method,
    status: 'Endpoint available - implementation in progress'
  });
}


