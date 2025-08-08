import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider';


export const helpDescribe = 'POST /describe expects JSON: { imageBase64, options? }';

describeRouter.get('/', (_req, res) => res.type('text/plain').send(helpDescribe));

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

