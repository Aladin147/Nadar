import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-nadar-handler', 'FORCE-REFRESH-WORKING');
  res.setHeader('x-deployment-time', new Date().toISOString());
  
  return res.status(200).json({
    NUCLEAR_TEST: 'INDIVIDUAL_ROUTING_CONFIRMED_WORKING',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    deploymentId: Math.random().toString(36).substring(7),
    message: '🚀 IF YOU SEE THIS, ROUTING IS FIXED!',
    sha: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV
  });
}
