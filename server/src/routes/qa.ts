import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { QABody } from './schemas';
import { resolveImage, cacheImage } from '../index';


export const qaRouter = Router();
export const helpQA = 'POST /qa expects JSON: { imageBase64, question, options? }';

qaRouter.get('/', (_req, res) => res.type('text/plain').send(helpQA));
const provider = new HybridProvider();

qaRouter.post('/', async (req, res) => {
  const parse = QABody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });

  const { question, options } = parse.data;

  // Cache new image if provided
  cacheImage(req.body);

  // Resolve image from cache or body
  const imageBuffer = resolveImage(req.body);
  if (!imageBuffer) {
    return res.status(400).json({ error: 'No image provided or cached image not found' });
  }

  const imageBase64 = imageBuffer.toString('base64');
  const mimeType = req.body.mimeType || 'image/jpeg';

  try {
    const result = await provider.qa({ imageBase64, question, mimeType, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

