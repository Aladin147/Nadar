import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { describeRouter } from './routes/describe';
import { ocrRouter } from './routes/ocr';
import { qaRouter } from './routes/qa';
import { ttsRouter } from './routes/tts';

const app = express();

app.use(morgan('combined'));
const limiter = rateLimit({ windowMs: 60_000, limit: 60 });
app.use(limiter);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/', (_req, res) => res.type('text/plain').send('Nadar API. Endpoints: /health, POST /describe, /ocr, /qa, /tts'));


app.use('/describe', describeRouter);
app.use('/ocr', ocrRouter);
app.use('/qa', qaRouter);
app.use('/tts', ttsRouter);

const port = process.env.PORT || 4000;
// Centralized error handler (must be before listen)
import type { NextFunction, Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' });
  }
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = err?.message || 'Internal server error';
  res.status(status).json({ error: message });
});

app.listen(port, () => {
  console.log(`Nadar server listening on :${port}`);
});

