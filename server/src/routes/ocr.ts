import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider.js';

export const ocrRouter = Router();
const provider = new GeminiProvider();

ocrRouter.post('/', async (req, res) => {
  const { imageBase64, options } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
  try {
    const result = await provider.ocr({ imageBase64, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

