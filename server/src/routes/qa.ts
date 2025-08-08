import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider';

export const qaRouter = Router();
const provider = new GeminiProvider();

qaRouter.post('/', async (req, res) => {
  const { imageBase64, question, options } = req.body ?? {};
  if (!imageBase64 || !question) return res.status(400).json({ error: 'imageBase64 and question required' });
  try {
    const result = await provider.qa({ imageBase64, question, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

