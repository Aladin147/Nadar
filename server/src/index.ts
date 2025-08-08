import express from 'express';
import { describeRouter } from './routes/describe.js';
import { ocrRouter } from './routes/ocr.js';
import { qaRouter } from './routes/qa.js';
import { ttsRouter } from './routes/tts.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/describe', describeRouter);
app.use('/ocr', ocrRouter);
app.use('/qa', qaRouter);
app.use('/tts', ttsRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Nadar server listening on :${port}`);
});

