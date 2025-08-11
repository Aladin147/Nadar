import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { describeRouter } from './routes/describe';
import { ocrRouter } from './routes/ocr';
import { qaRouter } from './routes/qa';
import { ttsRouter } from './routes/tts';
import { execSync } from 'child_process';

// Ephemeral image cache for follow-ups (2-minute TTL)
export const recentImages = new Map<string, { buf: Buffer; ts: number }>();

// Cache git info at startup to avoid execSync on every /version request
let cachedVersionInfo: { commit: string; builtAt: string } | null = null;
try {
  const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const builtAt = new Date().toISOString();
  cachedVersionInfo = { commit, builtAt };
} catch (error) {
  // Fallback if git is not available
  cachedVersionInfo = {
    commit: process.env.GIT_COMMIT || 'unknown',
    builtAt: process.env.BUILD_TIME || new Date().toISOString()
  };
}

// Cleanup timer - run every 30 seconds, evict older than 120 seconds
const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - 120_000; // 2 minutes
  for (const [sessionId, entry] of recentImages.entries()) {
    if (entry.ts < cutoff) {
      recentImages.delete(sessionId);
    }
  }
}, 30_000);
// Prevent timer from keeping process alive during tests
cleanupInterval.unref();

// Helper to resolve image from request body
export function resolveImage(body: any): Buffer | null {
  if (body.imageBase64) {
    return Buffer.from(body.imageBase64, 'base64');
  }
  if (body.imageRef === 'last' && body.sessionId) {
    const cached = recentImages.get(body.sessionId);
    return cached?.buf || null;
  }
  return null;
}

// Helper to cache image if sessionId provided
export function cacheImage(body: any): void {
  if (body.sessionId && body.imageBase64) {
    recentImages.set(body.sessionId, {
      buf: Buffer.from(body.imageBase64, 'base64'),
      ts: Date.now()
    });
  }
}

const app = express();

// Trust proxy so rate limiter can read X-Forwarded-For from dev tunnels/reverse proxies
app.set('trust proxy', true);

app.use(morgan('combined'));
const limiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true });
app.use(limiter);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Version endpoint with cached git commit and build time
app.get('/version', (_req, res) => {
  res.json(cachedVersionInfo);
});

app.get('/', (_req, res) => res.type('text/plain').send('Nadar API. Endpoints: /health, /version, POST /describe, /ocr, /qa, /tts'));


app.use('/describe', describeRouter);
app.use('/ocr', ocrRouter);
app.use('/qa', qaRouter);
app.use('/tts', ttsRouter);

const port = Number(process.env.PORT) || 4000;
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

app.listen(port, '0.0.0.0', () => {
  console.log(`Nadar server listening on 0.0.0.0:${port}`);
});

