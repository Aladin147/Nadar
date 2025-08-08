import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { describeRouter } from './routes/describe';
import { ocrRouter } from './routes/ocr';
import { qaRouter } from './routes/qa';
import { ttsRouter } from './routes/tts';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/', (_req, res) => res.type('text/plain').send('Nadar API. Endpoints: /health, POST /describe, /ocr, /qa, /tts'));


app.use('/describe', describeRouter);
app.use('/ocr', ocrRouter);
app.use('/qa', qaRouter);
app.use('/tts', ttsRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Nadar server listening on :${port}`);
});

