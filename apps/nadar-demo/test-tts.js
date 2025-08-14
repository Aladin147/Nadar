// Simple test to verify TTS API works
const API_BASE = 'http://localhost:3000';

async function testTTS() {
  try {
    console.log('Testing TTS API...');
    
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'مرحبا، هذا اختبار للصوت من نظر',
        provider: 'elevenlabs',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ TTS API working, received audio data:', data.audioBase64 ? 'Yes' : 'No');
    console.log('MIME type:', data.mimeType);
    
  } catch (error) {
    console.error('❌ TTS test failed:', error.message);
  }
}

testTTS();