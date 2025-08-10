import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { OCRBody } from './schemas';


export const ocrRouter = Router();
export const helpOCR = 'POST /ocr expects JSON: { imageBase64, options? }';

ocrRouter.get('/', (_req, res) => res.type('text/plain').send(helpOCR));
const provider = new HybridProvider();

ocrRouter.post('/', async (req, res) => {
  const parse = OCRBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  const { imageBase64, options, mimeType } = parse.data;
  try {
    const result = await provider.ocr({ imageBase64, mimeType, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

