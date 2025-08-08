import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider';
import { TTSBody } from './schemas';


export const helpTTS = 'POST /tts expects JSON: { text, voice? }';

ttsRouter.get('/', (_req, res) => res.type('text/plain').send(helpTTS));

export const ttsRouter = Router();
const provider = new GeminiProvider();

ttsRouter.post('/', async (req, res) => {
  const parse = TTSBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  const { text, voice } = parse.data;
  try {
    const result = await provider.tts({ text, voice });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

