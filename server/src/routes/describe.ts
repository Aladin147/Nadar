import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { DescribeBody } from './schemas';
import { resolveImage, cacheImage } from '../index';
export const describeRouter = Router();



export const helpDescribe = 'POST /describe expects JSON: { imageBase64, options? }';

describeRouter.get('/', (_req, res) => res.type('text/plain').send(helpDescribe));
const provider = new HybridProvider();

describeRouter.post('/', async (req, res) => {
  const parse = DescribeBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });

  const { options } = parse.data;

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
    const result = await provider.describe({ imageBase64, mimeType, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

