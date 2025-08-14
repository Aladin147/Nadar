import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Fast image inspector for signal detection
interface ImageSignals {
  has_text: boolean;
  hazards: string[];
  people_count: number;
  lighting_ok: boolean;
  confidence: number;
}

async function inspectImage(imageBase64: string, mimeType: string, genAI: GoogleGenerativeAI): Promise<ImageSignals> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean (true if any readable text is visible),
  "hazards": string[] (list of safety hazards like "moving vehicle", "stairs", "obstacle", max 3),
  "people_count": number (count of people visible, 0-10+),
  "lighting_ok": boolean (true if lighting is adequate for clear vision),
  "confidence": number (0.0-1.0, overall confidence in analysis)
}

Be concise and accurate. Return only valid JSON.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType
        }
      }
    ]);

    const responseText = result.response.text().trim();

    try {
      const signals = JSON.parse(responseText);
      return {
        has_text: Boolean(signals.has_text),
        hazards: Array.isArray(signals.hazards) ? signals.hazards.slice(0, 3).map(String) : [],
        people_count: Math.max(0, Math.min(10, Number(signals.people_count) || 0)),
        lighting_ok: Boolean(signals.lighting_ok),
        confidence: Math.max(0, Math.min(1, Number(signals.confidence) || 0))
      };
    } catch (parseError) {
      console.warn('Failed to parse image inspector JSON:', responseText);
      return {
        has_text: responseText.toLowerCase().includes('text'),
        hazards: [],
        people_count: 0,
        lighting_ok: true,
        confidence: 0.5
      };
    }
  } catch (error) {
    console.error('Image inspection failed:', error);
    return {
      has_text: false,
      hazards: [],
      people_count: 0,
      lighting_ok: true,
      confidence: 0.0
    };
  }
}

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
  signals: ImageSignals;
  followup_suggest?: string[];
  timestamp: string;
  sessionId: string;
  processingTime: number;
  fallback?: boolean;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function createSystemPrompt(language: string, signals?: ImageSignals, question?: string): string {
  const langDir = language === 'ar' ? 'اكتب بالعربية الفصحى' :
                  language === 'darija' ? 'اكتب بالدارجة المغربية' :
                  'Write in English';

  return `${langDir} You are نظر (Nadar), helping blind users navigate safely.

Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short ${language === 'darija' ? 'Darija' : language} paragraph (≤2 sentences) with safety/next-step first",
  "details": ["Additional detail 1", "Additional detail 2", "Additional detail 3"],
  "has_text_content": ${signals?.has_text ? 'true' : 'false'}
}

For the paragraph:
- Start with safety information or immediate next steps
- Keep to maximum 2 sentences in ${language === 'darija' ? 'Darija' : language}
- Be actionable and concise
${question ? '- Answer the specific question first, then provide context' : ''}
${signals?.has_text ?
  '- IMPORTANT: Since text was detected, mention the visible text content prominently in your response' :
  '- Focus on scene description and navigation guidance'}

For details array:
- Provide 2-4 additional bullet points for "More" expansion
- Include objects, navigation guidance, environmental context
${signals?.has_text ? '- Include text-related details since text was detected' : ''}
- Keep each detail concise but informative

Don't identify people; avoid reading private screens; express uncertainty when unsure. Never use phrases like "as you can see" or "if you look".`;
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

    // Step 1: Fast image inspection
    const inspectionStart = Date.now();
    const signals = await inspectImage(imageBase64, mimeType, genAI);
    const inspectionTime = Date.now() - inspectionStart;

    console.log(`🔍 Image inspection signals:`, signals);

    // Step 2: Generate response based on signals and question
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: createSystemPrompt(language, signals, question)
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
    const responseText = response.text();

    const processingTime = Date.now() - startTime;

    // Parse single-paragraph response
    let speak = responseText;
    let details: string[] = [];

    try {
      const parsed = JSON.parse(responseText.trim());
      if (parsed.paragraph && Array.isArray(parsed.details)) {
        speak = parsed.paragraph;
        details = parsed.details;
      }
    } catch (parseError) {
      console.warn('Failed to parse single-paragraph JSON response, using fallback:', responseText);
    }

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
      speak,
      details,
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
