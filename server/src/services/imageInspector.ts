import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ProviderError } from '../providers/ProviderError';
import { mapGeminiError } from '../providers/geminiProvider';

export interface ImageSignals {
  has_text: boolean;
  hazards: string[];
  people_count: number;
  lighting_ok: boolean;
  confidence: number;
}

export class ImageInspector {
  private gen: GoogleGenerativeAI;
  private model: GenerativeModel;
  private timeoutMs: number;

  constructor(genAI?: GoogleGenerativeAI) {
    this.gen = genAI || new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Use fast model for quick inspection
    this.model = this.gen.getGenerativeModel({
      model: 'gemini-2.5-flash-lite'
    });
    
    // Short timeout for fast inspection
    this.timeoutMs = Number(process.env.IMAGE_INSPECTOR_TIMEOUT_MS) || 5000;
  }

  async inspect(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<ImageSignals> {
    let timeoutId: NodeJS.Timeout;
    
    try {
      const prompt = `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean (true if any readable text is visible),
  "hazards": string[] (list of safety hazards like "moving vehicle", "stairs", "obstacle", max 3),
  "people_count": number (count of people visible, 0-10+),
  "lighting_ok": boolean (true if lighting is adequate for clear vision),
  "confidence": number (0.0-1.0, overall confidence in analysis)
}

Be concise and accurate. Return only valid JSON.`;

      const parts = [
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType
          }
        }
      ];

      const t0 = Date.now();
      const result = await Promise.race([
        this.model.generateContent(parts as any),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Image inspection timeout')), this.timeoutMs);
        })
      ]) as any;
      
      const t1 = Date.now();
      const responseText = result.response.text().trim();
      
      // Parse JSON response
      let signals: ImageSignals;
      try {
        signals = JSON.parse(responseText);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        console.warn('Failed to parse image inspector JSON:', responseText);
        signals = {
          has_text: responseText.toLowerCase().includes('text'),
          hazards: [],
          people_count: 0,
          lighting_ok: true,
          confidence: 0.5
        };
      }

      // Validate and sanitize the response
      signals = this.validateSignals(signals);
      
      console.log(`🔍 Image inspection completed in ${t1 - t0}ms:`, signals);
      
      return signals;
      
    } catch (error) {
      const { message, err_code } = mapGeminiError(error);
      console.error('Image inspection failed:', message);
      
      // Return safe defaults on error
      return {
        has_text: false,
        hazards: [],
        people_count: 0,
        lighting_ok: true,
        confidence: 0.0
      };
    } finally {
      if (timeoutId!) clearTimeout(timeoutId);
    }
  }

  private validateSignals(signals: any): ImageSignals {
    return {
      has_text: Boolean(signals.has_text),
      hazards: Array.isArray(signals.hazards) 
        ? signals.hazards.slice(0, 3).map(String) 
        : [],
      people_count: Math.max(0, Math.min(10, Number(signals.people_count) || 0)),
      lighting_ok: Boolean(signals.lighting_ok),
      confidence: Math.max(0, Math.min(1, Number(signals.confidence) || 0))
    };
  }
}

// Export singleton instance
export const imageInspector = new ImageInspector();