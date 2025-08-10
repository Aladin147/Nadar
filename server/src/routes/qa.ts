import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { QABody } from './schemas';
import { resolveImage, cacheImage } from '../index';
import { mapGeminiError } from '../providers/geminiProvider';
import { createTelemetryLogger, calculateRequestSize } from '../utils/telemetry';


export const qaRouter = Router();
export const helpQA = 'POST /qa expects JSON: { imageBase64, question, options? }';

qaRouter.get('/', (_req, res) => res.type('text/plain').send(helpQA));
const provider = new HybridProvider();

qaRouter.post('/', async (req, res) => {
  const telemetry = createTelemetryLogger('qa');
  const parse = QABody.safeParse(req.body);

  if (!parse.success) {
    telemetry.log(false, 0, 0, 0, 'INVALID_INPUT');
    return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  }

  const { question, options } = parse.data;
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
    const result = await provider.qa({ imageBase64, question, mimeType, options });
    const modelMs = result.timings?.model || 0;
    telemetry.log(true, modelMs, 0, bytesIn, null);
    res.json(result);
  } catch (e: any) {
    const { message, err_code } = mapGeminiError(e);
    telemetry.log(false, 0, 0, bytesIn, err_code);
    res.status(500).json({ message, err_code });
  }
});

