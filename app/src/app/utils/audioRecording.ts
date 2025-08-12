import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface AudioRecordingConfig {
  android: {
    extension: '.m4a';
    outputFormat: Audio.AndroidOutputFormat.MPEG_4;
    audioEncoder: Audio.AndroidAudioEncoder.AAC;
    sampleRate: 16000;
    numberOfChannels: 1;
    bitRate: 128000;
  };
  ios: {
    extension: '.m4a';
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC;
    audioQuality: Audio.IOSAudioQuality.HIGH;
    sampleRate: 16000;
    numberOfChannels: 1;
    bitRate: 128000;
    linearPCMBitDepth: 16;
    linearPCMIsBigEndian: false;
    linearPCMIsFloat: false;
  };
}

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  constructor() {
    this.setupAudio();
  }

  private async setupAudio() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Failed to setup audio:', error);
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    try {
      console.log('🎤 Starting audio recording...');
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const recordingConfig: AudioRecordingConfig = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(recordingConfig);
      await this.recording.startAsync();
      
      this.isRecording = true;
      console.log('✅ Audio recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.isRecording || !this.recording) {
      console.warn('No recording in progress');
      return null;
    }

    try {
      console.log('🛑 Stopping audio recording...');
      
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isRecording = false;
      this.recording = null;

      console.log('✅ Audio recording stopped, URI:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      this.isRecording = false;
      this.recording = null;
      throw error;
    }
  }

  async convertToBase64(uri: string): Promise<{ data: string; mime: string }> {
    try {
      console.log('🔄 Converting audio to base64...');
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // For now, we'll use m4a format and let the server handle conversion
      // In a production app, we might want to convert to PCM on the client
      const mime = 'audio/m4a';

      console.log(`✅ Audio converted to base64, size: ${base64.length} chars`);
      
      return {
        data: base64,
        mime
      };
    } catch (error) {
      console.error('❌ Failed to convert audio to base64:', error);
      throw error;
    }
  }

  isCurrentlyRecording(): boolean {
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
