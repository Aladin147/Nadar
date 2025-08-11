import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { DescribeBody } from './schemas';
import { resolveImage, cacheImage } from '../index';
import { mapGeminiError } from '../providers/geminiProvider';
import { createTelemetryLogger, calculateRequestSize } from '../utils/telemetry';
export const describeRouter = Router();



export const helpDescribe = 'POST /describe expects JSON: { imageBase64, options? }';

describeRouter.get('/', (_req, res) => res.type('text/plain').send(helpDescribe));
const provider = new HybridProvider();

describeRouter.post('/', async (req, res) => {
  const telemetry = createTelemetryLogger('describe');
  const parse = DescribeBody.safeParse(req.body);

  if (!parse.success) {
    telemetry.log(false, 0, 0, 0, 'INVALID_INPUT');
    return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  }

  const { options } = parse.data;
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
    const result = await provider.describe({ imageBase64, mimeType, options });
    const modelMs = result.timings?.model || 0;
    telemetry.log(true, modelMs, 0, bytesIn, null);
    res.json(result);
  } catch (e: any) {
    // Preserve ProviderError codes; fallback to mapping for unknown errors
    const { message, err_code } = e?.err_code ? { message: e.message, err_code: e.err_code } : mapGeminiError(e);
    telemetry.log(false, 0, 0, bytesIn, err_code);
    res.status(500).json({ message, err_code });
  }
});

