import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Follow-up test request:', {
      method: req.method,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });

    // Test the exact follow-up request that's failing
    const testFollowupRequest = {
      sessionId: req.body.sessionId || 'test-session-123',
      imageRef: req.body.imageRef || 'last',
      question: req.body.question || 'فين الممر الخالي؟',
      language: 'darija',
      verbosity: 'brief'
    };

    console.log('🧪 Testing follow-up request:', testFollowupRequest);

    // Try to make the same request that the demo app makes
    const response = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/assist-shared`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFollowupRequest)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    console.log('📡 Follow-up response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });

    const processingTime = Date.now() - startTime;

    if (response.ok) {
      return res.status(200).json({
        success: true,
        message: 'Follow-up test successful',
        test_request: testFollowupRequest,
        server_response: responseData,
        response_status: response.status,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Follow-up test failed - server error captured',
        test_request: testFollowupRequest,
        server_error: responseData,
        response_status: response.status,
        response_status_text: response.statusText,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Follow-up test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Follow-up test failed',
      details: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });
  }
}
