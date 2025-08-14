// New Vercel assist endpoint using shared core architecture

import { createVercelAssistHandler } from '../shared/adapters/vercelAdapter';
import { GeminiProvider } from '../shared/providers/geminiProvider';
import { ConsoleTelemetryLogger } from '../shared/providers/telemetryProvider';
import { GlobalImageStore } from '../shared/stores/imageStore';
import { AssistDeps } from '../shared/types/api';

// Create dependencies for Vercel environment
const deps: AssistDeps = {
  providers: new GeminiProvider(process.env.GEMINI_API_KEY || ''),
  telemetry: new ConsoleTelemetryLogger(),
  imageStore: new GlobalImageStore(),
  now: () => Date.now()
};

// Export the handler
export default createVercelAssistHandler(deps);
