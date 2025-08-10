import { Router } from 'express';
import { HybridProvider, TTSProvider } from '../providers/hybridProvider';
import { TTSBody } from './schemas';
import { mapGeminiError } from '../providers/geminiProvider';
import { createTelemetryLogger, calculateRequestSize } from '../utils/telemetry';


export const ttsRouter = Router();
export const helpTTS = 'POST /tts expects JSON: { text, voice?, provider? }';

ttsRouter.get('/', (_req, res) => res.type('text/plain').send(helpTTS));
const provider = new HybridProvider();

// Get available TTS providers
ttsRouter.get('/providers', (_req, res) => {
  try {
    const available = provider.getAvailableProviders();
    const current = provider.getCurrentTTSProvider();
    res.json({ available, current });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

// Set TTS provider
ttsRouter.post('/provider', (req, res) => {
  try {
    const { provider: selectedProvider } = req.body;
    if (!selectedProvider || !['gemini', 'elevenlabs'].includes(selectedProvider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be "gemini" or "elevenlabs"' });
    }
    provider.setTTSProvider(selectedProvider as TTSProvider);
    res.json({ success: true, provider: selectedProvider });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

ttsRouter.post('/', async (req, res) => {
  const telemetry = createTelemetryLogger('tts');
  const parse = TTSBody.safeParse(req.body);

  if (!parse.success) {
    telemetry.log(false, 0, 0, 0, 'INVALID_INPUT');
    return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  }

  const { text, voice, rate } = parse.data;
  const { provider: requestProvider } = req.body; // Optional provider override
  const bytesIn = calculateRequestSize(req.body);
  const ttsStart = Date.now();

  try {
    const result = await provider.tts({ text, voice, provider: requestProvider, rate });
    const ttsMs = Date.now() - ttsStart;
    telemetry.log(true, 0, ttsMs, bytesIn, null);
    res.json(result);
  } catch (e: any) {
    const { message, err_code } = mapGeminiError(e);
    const ttsMs = Date.now() - ttsStart;
    telemetry.log(false, 0, ttsMs, bytesIn, err_code);
    res.status(500).json({ message, err_code });
  }
});

