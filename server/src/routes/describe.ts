import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider';

export const describeRouter = Router();
const provider = new GeminiProvider();

describeRouter.post('/', async (req, res) => {
  const { imageBase64, options, mimeType } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
  try {
    const result = await provider.describe({ imageBase64, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

