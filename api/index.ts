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

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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

  // Handle other endpoints with placeholder responses
  res.status(200).json({
    message: 'Nadar API Server',
    endpoint: url,
    method: req.method,
    status: 'Endpoint available - implementation in progress'
  });
}


