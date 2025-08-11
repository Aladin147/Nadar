import { Router } from 'express';
import { OCRBody } from './schemas';
import { handleVisionRoute } from './visionRouteHandler';


export const ocrRouter = Router();
export const helpOCR = 'POST /ocr expects JSON: { imageBase64, options? }';

ocrRouter.get('/', (_req, res) => res.type('text/plain').send(helpOCR));

ocrRouter.post('/', async (req, res) => {
  const full = req.query.full === 'true';

  await handleVisionRoute(req, res, {
    mode: 'ocr',
    schema: OCRBody,
    providerCall: (provider, { imageBase64, mimeType, options }) =>
      provider.ocr({ imageBase64, mimeType, options, full })
  });
});

