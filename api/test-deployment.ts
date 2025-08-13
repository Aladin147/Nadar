import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'test-deployment');

  return res.status(200).json({
    ok: true,
    route: '/api/test-deployment',
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    timestamp: new Date().toISOString(),
    method: req.method,
    deploymentTest: 'SUCCESS - INDIVIDUAL HANDLER WORKING!',
    uniqueId: 'DEPLOYMENT-TEST-12345',
    message: 'THIS IS THE REAL TEST-DEPLOYMENT HANDLER!'
  });
}
