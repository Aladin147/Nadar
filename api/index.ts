import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import your existing routes
import { describeRouter } from '../server/src/routes/describe';
import { ocrRouter } from '../server/src/routes/ocr';
import { qaRouter } from '../server/src/routes/qa';
import { ttsRouter } from '../server/src/routes/tts';
import { logTelemetry, extractTelemetryContext } from '../server/src/utils/telemetry';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// API routes
app.use('/describe', describeRouter);
app.use('/ocr', ocrRouter);
app.use('/qa', qaRouter);
app.use('/tts', ttsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Nadar API Server', 
    version: '1.0.0',
    endpoints: ['/health', '/describe', '/ocr', '/qa', '/tts']
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  const context = extractTelemetryContext(req);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const errCode = err.code || 'INTERNAL_ERROR';

  logTelemetry({
    ok: false,
    err_code: errCode,
    remote_addr: context.remote_addr,
    user_agent: context.user_agent,
    request_id: context.request_id
  });

  res.status(status).json({ error: message, err_code: errCode });
});

// Export for Vercel
export default app;
