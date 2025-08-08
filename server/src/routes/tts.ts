import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider';

export const ttsRouter = Router();
const provider = new GeminiProvider();

ttsRouter.post('/', async (req, res) => {
  const { text, voice } = req.body ?? {};
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const result = await provider.tts({ text, voice });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

