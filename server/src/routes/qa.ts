import { Router } from 'express';
import { QABody } from './schemas';
import { handleVisionRoute } from './visionRouteHandler';


export const qaRouter = Router();
export const helpQA = 'POST /qa expects JSON: { imageBase64, question, options? }';

qaRouter.get('/', (_req, res) => res.type('text/plain').send(helpQA));

qaRouter.post('/', async (req, res) => {
  await handleVisionRoute(req, res, {
    mode: 'qa',
    schema: QABody,
    providerCall: (provider, { imageBase64, mimeType, options, question }) =>
      provider.qa({ imageBase64, question, mimeType, options })
  });
});

