import { Router } from 'express';
import { HybridProvider } from '../providers/hybridProvider';
import { DescribeBody } from './schemas';
export const describeRouter = Router();



export const helpDescribe = 'POST /describe expects JSON: { imageBase64, options? }';

describeRouter.get('/', (_req, res) => res.type('text/plain').send(helpDescribe));
const provider = new HybridProvider();

describeRouter.post('/', async (req, res) => {
  const parse = DescribeBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  const { imageBase64, options, mimeType } = parse.data;
  try {
    const result = await provider.describe({ imageBase64, mimeType, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

