import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-debug-handler', 'debug-routing-individual');
  
  return res.status(200).json({
    CRITICAL_TEST: 'INDIVIDUAL_HANDLER_WORKING',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA
    },
    message: 'IF YOU SEE THIS, INDIVIDUAL ROUTING IS WORKING!'
  });
}
