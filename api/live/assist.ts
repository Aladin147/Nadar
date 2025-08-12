import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

// For now, let's implement a simpler HTTP-based approach for the prototype
// WebSocket support in Vercel is complex, so we'll do single-shot requests

interface LiveAssistRequest {
  sessionId: string;
  language: 'darija' | 'english' | 'french';
  style: 'single_paragraph' | 'detailed';
  image?: {
    mime: string;
    data: string; // base64
  };
  audio?: {
    mime: string;
    data: string; // base64
  };
  question?: string;
}

interface LiveAssistResponse {
  sessionId: string;
  speak: string;
  suggest?: string[];
  tokens_in?: number;
  tokens_out?: number;
  audio_bytes?: number;
  model_ms?: number;
  assist_engine: string;
}

// Initialize Google GenAI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Create system prompt for multimodal processing
function createSystemPrompt(language: string, style: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco. You will receive an image and potentially audio input with a question. Analyze both to provide helpful guidance.

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
3. Information priority:
   - Safety first: any immediate dangers or obstacles
   - Answer user's audio/text question if provided
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

${style === 'single_paragraph' ? 'Keep it brief - 2-3 sentences maximum.' : 'Give helpful details but focus on what matters most.'}

CORRECT Example (Arabic script only):
"انتبه! كاين درج قدامك، خاصك تطلع بحذر. كاين نص على لوحة على اليمين، بغيتي نقراه ليك؟ المكان فيه إضاءة مزيانة والطريق واضح."`;
  }
  
  // Default English fallback
  return `You are Nadar, an AI assistant for blind users. Analyze the image and audio question to provide helpful guidance in a single paragraph.`;
}

function generateFollowUpSuggestions(language: string): string[] {
  if (language === 'darija') {
    return [
      'نقرا النص كامل؟',
      'فين الممر الخالي؟',
      'شنو كاين حداي؟'
    ];
  }
  
  return [
    'Read all text?',
    'Where is the clear path?',
    'What is next to me?'
  ];
}

async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🚀 LIVE ASSIST HANDLER CALLED!');
  console.log('🔍 Method:', req.method);
  console.log('🔍 Body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    const {
      sessionId,
      language = 'darija',
      style = 'single_paragraph',
      image,
      audio,
      question
    }: LiveAssistRequest = req.body;

    console.log(`🚀 Live assist request: ${sessionId}, lang: ${language}, has_audio: ${!!audio}, has_image: ${!!image}`);

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!image && !audio && !question) {
      return res.status(400).json({ error: 'At least one of image, audio, or question is required' });
    }

    // Use Gemini 2.5 Flash for multimodal processing
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: createSystemPrompt(language, style)
    });

    // Build the content array for multimodal input
    const content: any[] = [];

    // Add image if provided
    if (image) {
      content.push({
        inlineData: {
          data: image.data,
          mimeType: image.mime
        }
      });
    }

    // Add audio if provided
    if (audio) {
      content.push({
        inlineData: {
          data: audio.data,
          mimeType: audio.mime
        }
      });
    }

    // Add text question if provided
    if (question) {
      content.push({
        text: question
      });
    }

    // If no explicit question but we have audio/image, add a general prompt
    if (!question && (audio || image)) {
      const defaultPrompt = language === 'darija' 
        ? 'وصف لي شنو كاين فهاد الصورة وجاوبني على السؤال ديالي'
        : 'Describe what you see in this image and answer my question';
      content.push({
        text: defaultPrompt
      });
    }

    console.log(`🧠 Sending multimodal request to Gemini 2.5 Flash with ${content.length} parts`);

    // Generate response
    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    const modelMs = Date.now() - startTime;
    const audioBytes = audio ? Buffer.from(audio.data, 'base64').length : 0;

    console.log(`✅ Live assist response generated in ${modelMs}ms, audio_bytes: ${audioBytes}`);

    const liveResponse: LiveAssistResponse = {
      sessionId,
      speak: text,
      suggest: generateFollowUpSuggestions(language),
      audio_bytes: audioBytes,
      model_ms: modelMs,
      assist_engine: 'gemini-multimodal'
    };

    // Add token usage if available
    if (response.usageMetadata) {
      liveResponse.tokens_in = response.usageMetadata.promptTokenCount;
      liveResponse.tokens_out = response.usageMetadata.candidatesTokenCount;
    }

    res.status(200).json(liveResponse);

  } catch (error: any) {
    console.error('❌ Live assist error:', error);
    
    const errorResponse = {
      error: 'Live assist failed',
      message: error?.message || 'Unknown error',
      assist_engine: 'gemini-multimodal'
    };

    res.status(500).json(errorResponse);
  }
}

// Export as default for Vercel API routes
export default handler;
