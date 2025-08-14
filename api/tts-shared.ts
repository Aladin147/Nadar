// TTS endpoint using shared core architecture

import { createVercelTTSHandler } from '../shared/adapters/vercelAdapter';
import { ConsoleTelemetryLogger } from '../shared/providers/telemetryProvider';
import { TTSDeps } from '../shared/core/ttsCore';

// Create dependencies for Vercel environment
const deps: TTSDeps = {
  telemetry: new ConsoleTelemetryLogger(),
  now: () => Date.now(),
  geminiApiKey: process.env.GEMINI_API_KEY,
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY
};

// Export the handler
export default createVercelTTSHandler(deps);
