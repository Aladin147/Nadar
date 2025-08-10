import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { OCRBody } from './schemas';
import { resolveImage, cacheImage } from '../index';
import { mapGeminiError } from '../providers/geminiProvider';


export const ocrRouter = Router();
export const helpOCR = 'POST /ocr expects JSON: { imageBase64, options? }';

ocrRouter.get('/', (_req, res) => res.type('text/plain').send(helpOCR));
const provider = new HybridProvider();

ocrRouter.post('/', async (req, res) => {
  const parse = OCRBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });

  const { options } = parse.data;
  const full = req.query.full === 'true';

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
    const result = await provider.ocr({ imageBase64, mimeType, options, full });
    res.json(result);
  } catch (e: any) {
    const { message, err_code } = mapGeminiError(e);
    res.status(500).json({ message, err_code });
  }
});

