import { Router } from 'express';
import { DescribeBody } from './schemas';
import { handleVisionRoute } from './visionRouteHandler';
export const describeRouter = Router();



export const helpDescribe = 'POST /describe expects JSON: { imageBase64, options? }';

describeRouter.get('/', (_req, res) => res.type('text/plain').send(helpDescribe));

describeRouter.post('/', async (req, res) => {
  await handleVisionRoute(req, res, {
    mode: 'describe',
    schema: DescribeBody,
    providerCall: (provider, { imageBase64, mimeType, options }) =>
      provider.describe({ imageBase64, mimeType, options })
  });
});

