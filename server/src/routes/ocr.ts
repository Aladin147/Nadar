import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { OCRBody } from './schemas';
import { resolveImage, cacheImage } from '../index';
import { mapGeminiError } from '../providers/geminiProvider';
import { createTelemetryLogger, calculateRequestSize } from '../utils/telemetry';


export const ocrRouter = Router();
export const helpOCR = 'POST /ocr expects JSON: { imageBase64, options? }';

ocrRouter.get('/', (_req, res) => res.type('text/plain').send(helpOCR));
const provider = new HybridProvider();

ocrRouter.post('/', async (req, res) => {
  const telemetry = createTelemetryLogger('ocr');
  const parse = OCRBody.safeParse(req.body);

  if (!parse.success) {
    telemetry.log(false, 0, 0, 0, 'INVALID_INPUT');
    return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  }

  const { options } = parse.data;
  const full = req.query.full === 'true';
  const bytesIn = calculateRequestSize(req.body);

  // Cache new image if provided
  cacheImage(req.body);

  // Resolve image from cache or body
  const imageBuffer = resolveImage(req.body);
  if (!imageBuffer) {
    telemetry.log(false, 0, 0, bytesIn, 'NO_IMAGE');
    return res.status(400).json({ error: 'No image provided or cached image not found' });
  }

  const imageBase64 = imageBuffer.toString('base64');
  const mimeType = req.body.mimeType || 'image/jpeg';

  try {
    const result = await provider.ocr({ imageBase64, mimeType, options, full });
    const modelMs = result.timings?.model || 0;
    telemetry.log(true, modelMs, 0, bytesIn, null);
    res.json(result);
  } catch (e: any) {
    const { message, err_code } = mapGeminiError(e);
    telemetry.log(false, 0, 0, bytesIn, err_code);
    res.status(500).json({ message, err_code });
  }
});

