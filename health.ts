import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'root-health-compatibility');
  
  return res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    message: 'Nadar API Server',
    version: '2.0.0-multimodal',
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    handler: 'root-health-endpoint'
  });
}
