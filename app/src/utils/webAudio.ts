/**
 * Simple web audio utility for TTS playback
 * Specifically designed for React Native Web compatibility
 */

let currentAudio: HTMLAudioElement | null = null;

export async function playWebAudio(
  audioBase64: string,
  mimeType: string = 'audio/mpeg'
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Starting web audio playback

      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
      }

      // Convert base64 to blob
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio();
      currentAudio = audio;

      // Add event listeners
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
      });
      audio.addEventListener('error', () => {
        reject(new Error(`Audio error: ${audio.error?.message || 'Unknown error'}`));
      });

      // Try to play when ready
      audio.oncanplay = () => {
        audio
          .play()
          .then(() => {
            resolve();
          })
          .catch(playError => {
            reject(new Error(`Audio playback failed: ${playError.message}`));
          });
      };

      // Set source and start loading
      audio.src = audioUrl;
      audio.load();
    } catch (error) {
      reject(error);
    }
  });
}

export function stopWebAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
}

// Test function for debugging
export async function testWebAudio(): Promise<void> {
  const response = await fetch('http://localhost:4000/tts', {
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
  await playWebAudio(data.audioBase64, data.mimeType);
}

// Make test function available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).testWebAudio = testWebAudio;
  (window as any).playWebAudio = playWebAudio;
  (window as any).stopWebAudio = stopWebAudio;
}
