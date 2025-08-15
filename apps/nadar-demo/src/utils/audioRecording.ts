// Audio recording utility for demo app (based on MVP implementation)
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('⚠️ Recording already in progress');
      return;
    }

    try {
      console.log('🎤 Starting audio recording...');

      // Request permissions first
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }
      console.log('✅ Audio permissions granted');

      // Clean up any existing recording first
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('🧹 Cleaned up previous recording');
        }
        this.recording = null;
      }

      // Set audio mode with minimal settings first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Recording configuration optimized for speech
      const recordingConfig = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      };

      console.log('🔧 Creating new recording instance...');
      this.recording = new Audio.Recording();

      console.log('🔧 Preparing to record...');
      await this.recording.prepareToRecordAsync(recordingConfig);

      console.log('🔧 Starting recording...');
      await this.recording.startAsync();

      this.isRecording = true;
      console.log('✅ Audio recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.isRecording = false;
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.recording = null;
      }
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.isRecording || !this.recording) {
      console.warn('⚠️ No recording in progress');
      return null;
    }

    try {
      console.log('🛑 Stopping audio recording...');
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.recording = null;
      this.isRecording = false;

      if (uri) {
        console.log('✅ Audio recording stopped, saved to:', uri);
        return uri;
      } else {
        console.warn('⚠️ Recording stopped but no URI returned');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      this.isRecording = false;
      this.recording = null;
      throw error;
    }
  }

  async convertToBase64(audioUri: string): Promise<string> {
    try {
      console.log('🔄 Converting audio to base64...');
      const base64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('✅ Audio converted to base64, length:', base64.length);
      return base64;
    } catch (error) {
      console.error('❌ Failed to convert audio to base64:', error);
      throw error;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  async cleanup() {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error cleaning up recording:', error);
      }
      this.recording = null;
    }
    this.isRecording = false;
  }
}

// Singleton instance
export const audioRecorder = new AudioRecorder();
