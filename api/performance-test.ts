import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple performance testing endpoint to measure server response times
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  // Set headers for no caching and performance monitoring
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-handler', 'performance-test');
  res.setHeader('x-start-time', startTime.toString());

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType, payload } = req.body;
    
    switch (testType) {
      case 'echo':
        // Simple echo test to measure network latency
        const echoTime = Date.now() - startTime;
        return res.json({
          success: true,
          testType: 'echo',
          payload,
          serverProcessingMs: echoTime,
          timestamp: new Date().toISOString()
        });
        
      case 'image-processing':
        // Test image processing overhead
        const imageStart = Date.now();
        
        if (!payload.imageBase64) {
          return res.status(400).json({ error: 'imageBase64 required for image-processing test' });
        }
        
        // Simulate image processing steps
        const imageBuffer = Buffer.from(payload.imageBase64, 'base64');
        const imageSizeBytes = imageBuffer.length;
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const imageProcessingTime = Date.now() - imageStart;
        const totalTime = Date.now() - startTime;
        
        return res.json({
          success: true,
          testType: 'image-processing',
          imageSizeBytes,
          imageProcessingMs: imageProcessingTime,
          totalMs: totalTime,
          timestamp: new Date().toISOString()
        });
        
      case 'ai-simulation':
        // Simulate AI processing time
        const aiStart = Date.now();
        
        // Simulate AI processing delay
        const simulatedAiTime = Math.random() * 200 + 50; // 50-250ms
        await new Promise(resolve => setTimeout(resolve, simulatedAiTime));
        
        const aiProcessingTime = Date.now() - aiStart;
        const aiTotalTime = Date.now() - startTime;
        
        return res.json({
          success: true,
          testType: 'ai-simulation',
          simulatedAiMs: Math.round(simulatedAiTime),
          actualProcessingMs: aiProcessingTime,
          totalMs: aiTotalTime,
          timestamp: new Date().toISOString()
        });
        
      default:
        return res.status(400).json({ error: 'Invalid testType. Use: echo, image-processing, or ai-simulation' });
    }
    
  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      errorMs: errorTime,
      timestamp: new Date().toISOString()
    });
  }
}
