/**
 * Simple web audio utility for TTS playback
 * Specifically designed for React Native Web compatibility
 */

let currentAudio: HTMLAudioElement | null = null;

export async function playWebAudio(audioBase64: string, mimeType: string = 'audio/mpeg'): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🌐 Starting web audio playback...');
      console.log('📊 Audio data info:', {
        base64Length: audioBase64.length,
        mimeType: mimeType,
        firstChars: audioBase64.substring(0, 50) + '...'
      });

      // Stop any currently playing audio
      if (currentAudio) {
        console.log('🛑 Stopping previous audio...');
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
      }

      // Convert base64 to blob
      console.log('🔄 Converting base64 to blob...');
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const audioUrl = URL.createObjectURL(blob);

      console.log('📊 Blob info:', {
        blobSize: blob.size,
        blobType: blob.type,
        audioUrl: audioUrl
      });

      console.log('🎵 Creating audio element...');
      const audio = new Audio();
      currentAudio = audio;

      // Add comprehensive event logging
      audio.addEventListener('loadstart', () => console.log('📥 Audio: loadstart'));
      audio.addEventListener('durationchange', () => console.log('⏱️ Audio: durationchange, duration:', audio.duration));
      audio.addEventListener('loadedmetadata', () => console.log('📋 Audio: loadedmetadata'));
      audio.addEventListener('loadeddata', () => console.log('✅ Audio: loadeddata'));
      audio.addEventListener('progress', () => console.log('📈 Audio: progress'));
      audio.addEventListener('canplay', () => console.log('🎯 Audio: canplay'));
      audio.addEventListener('canplaythrough', () => console.log('🎯 Audio: canplaythrough'));
      audio.addEventListener('play', () => console.log('▶️ Audio: play event'));
      audio.addEventListener('playing', () => console.log('🔊 Audio: playing event'));
      audio.addEventListener('pause', () => console.log('⏸️ Audio: pause'));
      audio.addEventListener('ended', () => {
        console.log('🔚 Audio: ended');
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
      });
      audio.addEventListener('error', (e) => {
        console.error('❌ Audio: error event:', e);
        console.error('❌ Audio error details:', {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
        reject(new Error(`Audio error: ${audio.error?.message || 'Unknown error'}`));
      });

      // Try to play when ready
      audio.oncanplay = () => {
        console.log('🔊 Audio ready, attempting to play...');
        audio.play()
          .then(() => {
            console.log('✅ Audio.play() promise resolved');
            resolve();
          })
          .catch((playError) => {
            console.error('❌ Audio.play() promise rejected:', playError);
            reject(new Error(`Audio playback failed: ${playError.message}`));
          });
      };

      // Set source and start loading
      console.log('🔗 Setting audio source...');
      audio.src = audioUrl;
      audio.load();

    } catch (error) {
      console.error('❌ Web audio setup failed:', error);
      reject(error);
    }
  });
}

export function stopWebAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
    console.log('🛑 Web audio stopped');
  }
}

// Test function for debugging
export async function testWebAudio(): Promise<void> {
  try {
    console.log('🧪 Testing web audio with ElevenLabs...');
    
    const response = await fetch('http://localhost:4000/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'مرحبا، هذا اختبار للصوت من نظر',
        provider: 'elevenlabs'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 Received audio data:', {
      hasAudio: !!data.audioBase64,
      audioLength: data.audioBase64?.length || 0,
      mimeType: data.mimeType
    });

    await playWebAudio(data.audioBase64, data.mimeType);
    console.log('✅ Web audio test completed');
    
  } catch (error) {
    console.error('❌ Web audio test failed:', error);
    throw error;
  }
}

// Make test function available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).testWebAudio = testWebAudio;
  (window as any).playWebAudio = playWebAudio;
  (window as any).stopWebAudio = stopWebAudio;
}
