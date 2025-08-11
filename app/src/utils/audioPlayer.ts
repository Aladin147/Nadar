import { Platform } from 'react-native';
import { playWebAudio, stopWebAudio } from './webAudio';

// Conditional imports for native platforms only
let Audio: any = null;
let FileSystem: any = null;
let base64ToUint8Array: any = null;
let pcm16ToWavBytes: any = null;

if (Platform.OS !== 'web') {
  try {
    Audio = require('expo-av').Audio;
    FileSystem = require('expo-file-system');
    const pcmUtils = require('./pcmToWav');
    base64ToUint8Array = pcmUtils.base64ToUint8Array;
    pcm16ToWavBytes = pcmUtils.pcm16ToWavBytes;
  } catch (error) {
    console.warn('Native audio modules not available:', error);
  }
}

export interface AudioPlayerRef {
  current: any | HTMLAudioElement | null;
}

/**
 * Cross-platform audio player for TTS
 * Handles both native (expo-av) and web (HTML5 Audio) playback
 */
export class AudioPlayer {
  private soundRef: AudioPlayerRef;

  constructor(soundRef: AudioPlayerRef) {
    this.soundRef = soundRef;
  }

  // Update the ref (needed for React ref updates)
  updateRef(newRef: AudioPlayerRef['current']) {
    this.soundRef.current = newRef;
  }

  async playAudio(audioBase64: string, mimeType?: string): Promise<void> {
    try {
      // Clean up previous audio
      await this.cleanup();

      if (Platform.OS === 'web') {
        await this.playWebAudio(audioBase64, mimeType);
      } else {
        await this.playNativeAudio(audioBase64, mimeType);
      }
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      throw error;
    }
  }

  private async playWebAudio(audioBase64: string, mimeType?: string): Promise<void> {
    console.log('🌐 Using simplified web audio playback...');
    await playWebAudio(audioBase64, mimeType || 'audio/mpeg');
  }

  private async playNativeAudio(audioBase64: string, mimeType?: string): Promise<void> {
    if (!Audio || !FileSystem) {
      throw new Error('Native audio modules not available');
    }

    console.log('📱 Playing audio on native platform...');

    // Set audio mode for native playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    let audioPath: string;

    if (mimeType === 'audio/mpeg') {
      // ElevenLabs returns MP3 - save directly
      audioPath = `${FileSystem.cacheDirectory}tts.mp3`;
      await FileSystem.writeAsStringAsync(audioPath, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      // Gemini returns PCM - convert to WAV
      const pcm = base64ToUint8Array(audioBase64);
      const wav = pcm16ToWavBytes(pcm);
      audioPath = `${FileSystem.cacheDirectory}tts.wav`;
      await FileSystem.writeAsStringAsync(audioPath, Buffer.from(wav).toString('base64'), {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    console.log('🔊 Creating native audio object...');
    const { sound } = await Audio.Sound.createAsync({ uri: audioPath });
    this.soundRef.current = sound;
    await sound.playAsync();
    console.log('✅ Native audio playback started');
  }

  async cleanup(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        stopWebAudio();
      } else if (this.soundRef.current && Audio) {
        // Native audio cleanup
        const sound = this.soundRef.current;
        await sound.unloadAsync();
        this.soundRef.current = null;
      }
    } catch (error) {
      console.log('⚠️ Audio cleanup error:', error);
    }
  }
}
