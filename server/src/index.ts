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

// LRU Image Cache with TTL and memory cap
interface CacheEntry {
  buf: Buffer;
  ts: number;
  lastAccessed: number;
}

class LRUImageCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 50, ttlMs = 120_000) { // 50 entries max, 2-minute TTL
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  set(sessionId: string, buffer: Buffer): void {
    const now = Date.now();
    const entry: CacheEntry = {
      buf: buffer,
      ts: now,
      lastAccessed: now
    };

    // Remove existing entry if present (for LRU update)
    if (this.cache.has(sessionId)) {
      this.cache.delete(sessionId);
    }

    // Add new entry
    this.cache.set(sessionId, entry);

    // Enforce size limit with LRU eviction
    if (this.cache.size > this.maxEntries) {
      this.evictLRU();
    }
  }

  get(sessionId: string): Buffer | null {
    const entry = this.cache.get(sessionId);
    if (!entry) return null;

    const now = Date.now();

    // Check TTL
    if (now - entry.ts > this.ttlMs) {
      this.cache.delete(sessionId);
      return null;
    }

    // Update access time for LRU
    entry.lastAccessed = now;

    // Move to end (most recently used)
    this.cache.delete(sessionId);
    this.cache.set(sessionId, entry);

    return entry.buf;
  }

  private evictLRU(): void {
    // Find least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted LRU image cache entry: ${oldestKey}`);
    }
  }

  cleanupExpired(): number {
    const cutoff = Date.now() - this.ttlMs;
    let evicted = 0;

    for (const [sessionId, entry] of this.cache.entries()) {
      if (entry.ts < cutoff) {
        this.cache.delete(sessionId);
        evicted++;
      }
    }

    return evicted;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxEntries: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs
    };
  }
}

export const recentImages = new LRUImageCache();

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

// Cleanup timer - run every 30 seconds, evict expired entries
const cleanupInterval = setInterval(() => {
  const evicted = recentImages.cleanupExpired();
  if (evicted > 0) {
    console.log(`🧹 Cleaned up ${evicted} expired image cache entries`);
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
    return recentImages.get(body.sessionId);
  }
  return null;
}

// Helper to cache image if sessionId provided
export function cacheImage(body: any): void {
  if (body.sessionId && body.imageBase64) {
    const buffer = Buffer.from(body.imageBase64, 'base64');
    recentImages.set(body.sessionId, buffer);
  }
}

const app = express();

// Trust proxy so rate limiter can read X-Forwarded-For from dev tunnels/reverse proxies
app.set('trust proxy', true);

app.use(morgan('combined'));

// Tiered rate limiting strategy
const generalLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 120, // 120 requests per minute (2 per second) - increased for legitimate usage
  standardHeaders: true,
  message: { error: 'Too many requests, please try again later', err_code: 'RATE_LIMIT_GENERAL' }
});

// Stricter limits for heavy compute endpoints
const visionLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 30, // 30 vision requests per minute - reasonable for photo sessions
  standardHeaders: true,
  message: { error: 'Too many vision requests, please slow down', err_code: 'RATE_LIMIT_VISION' },
  keyGenerator: (req) => `vision:${req.ip}` // Separate counter for vision endpoints
});

// Very permissive for health/debug endpoints
const healthLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 300, // 300 health checks per minute - supports network discovery
  standardHeaders: true,
  message: { error: 'Too many health checks', err_code: 'RATE_LIMIT_HEALTH' },
  keyGenerator: (req) => `health:${req.ip}`
});

app.use(generalLimiter);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health and debug endpoints with permissive rate limiting
app.get('/health', healthLimiter, (_req, res) => res.json({ ok: true }));

app.get('/version', healthLimiter, (_req, res) => {
  res.json(cachedVersionInfo);
});

app.get('/debug/cache', healthLimiter, (_req, res) => {
  res.json({
    imageCache: recentImages.getStats()
  });
});

app.get('/', (_req, res) => res.type('text/plain').send('Nadar API. Endpoints: /health, /version, POST /describe, /ocr, /qa, /tts'));

// Vision endpoints with stricter rate limiting
app.use('/describe', visionLimiter, describeRouter);
app.use('/ocr', visionLimiter, ocrRouter);
app.use('/qa', visionLimiter, qaRouter);

// TTS uses general limiter (allows for text chunking)
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

