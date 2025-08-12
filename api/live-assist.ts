import { GoogleGenAI, Modality } from '@google/genai';
import WebSocket from 'ws';
import { IncomingMessage } from 'http';

// Types for our WebSocket messages
interface StartMessage {
  type: 'start';
  sessionId: string;
  language: 'darija' | 'english' | 'french';
  style: 'single_paragraph' | 'detailed';
  image?: {
    mime: string;
    data: string; // base64
  };
  question?: string;
}

interface AudioMessage {
  type: 'audio';
  mime: string;
  data: string; // base64
}

interface CommitMessage {
  type: 'commit';
}

type ClientMessage = StartMessage | AudioMessage | CommitMessage;

interface DeltaResponse {
  type: 'delta';
  text: string;
}

interface DoneResponse {
  type: 'done';
  text: string;
  suggest?: string[];
  tokens_in?: number;
  tokens_out?: number;
  audio_bytes?: number;
  model_ms?: number;
}

interface ErrorResponse {
  type: 'error';
  message: string;
  code?: string;
}

type ServerResponse = DeltaResponse | DoneResponse | ErrorResponse;

// Session management
interface LiveSession {
  sessionId: string;
  geminiSession: any; // Gemini Live session
  startTime: number;
  language: string;
  style: string;
  image?: { mime: string; data: string };
  question?: string;
  audioChunks: Buffer[];
  totalAudioBytes: number;
}

const activeSessions = new Map<string, LiveSession>();

// Initialize Google GenAI client
const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY!
});

// Session timeout (20 seconds)
const SESSION_TIMEOUT = 20000;

// Clean up expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.startTime > SESSION_TIMEOUT) {
      try {
        session.geminiSession?.close();
      } catch (e) {
        console.error('Error closing expired session:', e);
      }
      activeSessions.delete(sessionId);
      console.log(`🧹 Cleaned up expired session: ${sessionId}`);
    }
  }
}, 5000); // Check every 5 seconds

// Create system prompt for Gemini Live
function createSystemPrompt(language: string, style: string): string {
  if (language === 'darija') {
    return `You are نظر (Nadar), an intelligent AI assistant for blind users in Morocco. Analyze the image and audio question to provide helpful guidance.

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
   - Answer user's audio question if provided
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

export default function handler(req: IncomingMessage, socket: any, head: Buffer) {
  // Only handle WebSocket upgrade requests
  if (req.url !== '/api/live/assist') {
    socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    return;
  }

  const wss = new WebSocket.Server({ noServer: true });
  
  wss.handleUpgrade(req, socket, head, (ws) => {
    console.log('🔌 WebSocket connection established for live assist');
    
    let currentSession: LiveSession | null = null;
    
    ws.on('message', async (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'start':
            await handleStart(ws, message);
            break;
          case 'audio':
            await handleAudio(ws, message);
            break;
          case 'commit':
            await handleCommit(ws);
            break;
          default:
            sendError(ws, 'Unknown message type', 'INVALID_MESSAGE');
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
        sendError(ws, 'Failed to process message', 'PROCESSING_ERROR');
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      if (currentSession) {
        try {
          currentSession.geminiSession?.close();
        } catch (e) {
          console.error('Error closing session on disconnect:', e);
        }
        activeSessions.delete(currentSession.sessionId);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
    
    // Handle start message
    async function handleStart(ws: WebSocket, message: StartMessage) {
      try {
        console.log(`🚀 Starting live session: ${message.sessionId}`);
        
        // Clean up any existing session
        if (currentSession) {
          try {
            currentSession.geminiSession?.close();
          } catch (e) {}
          activeSessions.delete(currentSession.sessionId);
        }
        
        // Create new session
        const session: LiveSession = {
          sessionId: message.sessionId,
          geminiSession: null,
          startTime: Date.now(),
          language: message.language,
          style: message.style,
          image: message.image,
          question: message.question,
          audioChunks: [],
          totalAudioBytes: 0
        };
        
        // Create Gemini Live session
        const config = {
          responseModalities: [Modality.TEXT],
          systemInstruction: createSystemPrompt(message.language, message.style)
        };
        
        // Use native audio model for better multimodal support
        const model = "gemini-2.5-flash-preview-native-audio-dialog";
        
        session.geminiSession = await genAI.live.connect({
          model,
          config,
          callbacks: {
            onopen: () => {
              console.log(`✅ Gemini Live session opened: ${message.sessionId}`);
            },
            onmessage: (response: any) => {
              // Forward Gemini responses to client
              if (response.data) {
                const deltaResponse: DeltaResponse = {
                  type: 'delta',
                  text: response.data
                };
                ws.send(JSON.stringify(deltaResponse));
              }
              
              if (response.serverContent?.turnComplete) {
                // Session complete
                const doneResponse: DoneResponse = {
                  type: 'done',
                  text: response.data || '',
                  suggest: generateFollowUpSuggestions(message.language),
                  audio_bytes: session.totalAudioBytes,
                  model_ms: Date.now() - session.startTime
                };
                ws.send(JSON.stringify(doneResponse));
              }
            },
            onerror: (error: any) => {
              console.error('❌ Gemini Live error:', error);
              sendError(ws, 'Gemini Live session error', 'GEMINI_ERROR');
            },
            onclose: () => {
              console.log(`🔌 Gemini Live session closed: ${message.sessionId}`);
            }
          }
        });
        
        currentSession = session;
        activeSessions.set(message.sessionId, session);
        
        // Send initial content if we have image and/or question
        if (message.image || message.question) {
          const content: any = {};
          
          if (message.image) {
            content.image = {
              data: message.image.data,
              mimeType: message.image.mime
            };
          }
          
          if (message.question) {
            content.text = message.question;
          }
          
          await session.geminiSession.sendRealtimeInput(content);
        }
        
      } catch (error) {
        console.error('❌ Error starting session:', error);
        sendError(ws, 'Failed to start live session', 'SESSION_START_ERROR');
      }
    }
    
    // Handle audio chunks
    async function handleAudio(ws: WebSocket, message: AudioMessage) {
      if (!currentSession) {
        sendError(ws, 'No active session', 'NO_SESSION');
        return;
      }
      
      try {
        // Convert base64 to buffer and track size
        const audioBuffer = Buffer.from(message.data, 'base64');
        currentSession.audioChunks.push(audioBuffer);
        currentSession.totalAudioBytes += audioBuffer.length;
        
        // Send audio to Gemini Live
        await currentSession.geminiSession.sendRealtimeInput({
          audio: {
            data: message.data,
            mimeType: message.mime
          }
        });
        
      } catch (error) {
        console.error('❌ Error processing audio:', error);
        sendError(ws, 'Failed to process audio', 'AUDIO_ERROR');
      }
    }
    
    // Handle commit (end of input)
    async function handleCommit(ws: WebSocket) {
      if (!currentSession) {
        sendError(ws, 'No active session', 'NO_SESSION');
        return;
      }
      
      try {
        console.log(`✅ Committing session: ${currentSession.sessionId}`);
        // Signal end of input to Gemini
        // The response will be handled by the onmessage callback
        
      } catch (error) {
        console.error('❌ Error committing session:', error);
        sendError(ws, 'Failed to commit session', 'COMMIT_ERROR');
      }
    }
  });
}

// Helper functions
function sendError(ws: WebSocket, message: string, code?: string) {
  const errorResponse: ErrorResponse = {
    type: 'error',
    message,
    code
  };
  ws.send(JSON.stringify(errorResponse));
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
