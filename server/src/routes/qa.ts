import { Router } from 'express';
import { GeminiProvider } from '../providers/geminiProvider';
import { QABody } from './schemas';


export const helpQA = 'POST /qa expects JSON: { imageBase64, question, options? }';

qaRouter.get('/', (_req, res) => res.type('text/plain').send(helpQA));

export const qaRouter = Router();
const provider = new GeminiProvider();

qaRouter.post('/', async (req, res) => {
  const parse = QABody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.issues[0]?.message || 'invalid body' });
  const { imageBase64, question, options, mimeType } = parse.data;
  try {
    const result = await provider.qa({ imageBase64, question, mimeType, options });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

