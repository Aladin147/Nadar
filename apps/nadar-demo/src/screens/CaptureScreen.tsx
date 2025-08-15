import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { assist, assistMultimodal } from '../api/client';
import { audioRecorder } from '../utils/audioRecording';

type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Results: { response: any; sessionId: string };
};

type CaptureScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Capture'>;

interface Props {
  navigation: CaptureScreenNavigationProp;
}

export default function CaptureScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captureMode, setCaptureMode] = useState<'image-only' | 'multimodal'>('image-only');
  const cameraRef = useRef<CameraView>(null);

  const handleImageOnlyCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      console.log('📸 Image captured, processing...');
      const startTime = Date.now();
      const result = await assist(photo.base64, 'image/jpeg');
      const endTime = Date.now();
      console.log(`⚡ App assist call took: ${endTime - startTime}ms`);
      
      navigation.navigate('Results', { 
        response: result, 
        sessionId: result.sessionId 
      });

    } catch (error) {
      console.error('Image capture error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setIsLoading(true);
        console.log('🖼️ Gallery image selected, processing...');
        
        const assistResult = await assist(result.assets[0].base64, 'image/jpeg');
        
        navigation.navigate('Results', { 
          response: assistResult, 
          sessionId: assistResult.sessionId 
        });
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert('Error', 'Failed to process selected image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setCaptureMode('multimodal');
      await audioRecorder.startRecording();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('🎤 Started recording audio');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setIsRecording(false);
      setCaptureMode('image-only');
      Alert.alert('Error', 'Failed to start audio recording. Please check permissions.');
    }
  };

  const stopRecordingAndCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Stop recording and get audio
      const audioUri = await audioRecorder.stopRecording();
      setIsRecording(false);

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      console.log('📸🎤 Multimodal capture completed, processing...');

      // Process multimodal request
      if (audioUri) {
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        console.log('🎤📸 Sending multimodal request with audio and image...');

        const startTime = Date.now();
        const multimodalResult = await assistMultimodal(
          photo.base64,
          'image/jpeg',
          audioBase64,
          'audio/wav'
        );
        const endTime = Date.now();
        console.log(`⚡ App multimodal call took: ${endTime - startTime}ms`);

        // Convert multimodal response to standard format for UI compatibility
        const standardResponse = {
          speak: multimodalResult.speak,
          details: [], // Multimodal doesn't return details
          signals: {
            has_text: false,
            hazards: [],
            people_count: 0,
            lighting_ok: true,
            confidence: 0.8
          },
          followup_suggest: multimodalResult.suggest || [],
          followupToken: 'last', // Use 'last' for image reference
          timestamp: new Date().toISOString(),
          sessionId: multimodalResult.sessionId, // Use the sessionId returned by server
          processingTime: multimodalResult.model_ms || 0,
          fallback: false
        };

        console.log('🆔 Server returned sessionId:', multimodalResult.sessionId);

        navigation.navigate('Results', {
          response: standardResponse,
          sessionId: multimodalResult.sessionId
        });
      } else {
        // Fallback to image-only if audio failed
        console.log('📸 Audio failed, falling back to image-only...');
        const result = await assist(photo.base64, 'image/jpeg');
        navigation.navigate('Results', {
          response: result,
          sessionId: result.sessionId
        });
      }
      
    } catch (error) {
      console.error('Multimodal capture error:', error);
      Alert.alert('Error', 'Failed to process image and audio. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRecording(false);
      setCaptureMode('image-only');
    }
  };

  return (
    <LinearGradient
      colors={theme.gradients.background.colors}
      style={styles.container}
      start={theme.gradients.background.start}
      end={theme.gradients.background.end}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading || isRecording}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Capture</Text>
          <View style={styles.placeholder} />
        </View>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {captureMode === 'multimodal' ? 'Processing image and audio...' : 'Processing image...'}
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handleGalleryPick}
            disabled={isLoading || isRecording}
          >
            <Text style={styles.buttonText}>📁</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.shutterButton, 
              (isLoading || isRecording) && styles.shutterButtonDisabled,
              isRecording && styles.shutterButtonRecording
            ]}
            onPress={isRecording ? stopRecordingAndCapture : handleImageOnlyCapture}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <View style={[
                styles.shutterInner,
                isRecording && { backgroundColor: theme.colors.error }
              ]} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonActive
            ]}
            onPress={isRecording ? stopRecordingAndCapture : startRecording}
            disabled={isLoading}
          >
            {isRecording ? (
              <View style={styles.recordingIndicator}>
                <ActivityIndicator color={theme.colors.text} size="small" />
              </View>
            ) : (
              <Text style={styles.buttonText}>🎤</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recording Indicator - Only show when recording */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Text style={styles.recordingText}>
              🔴 Recording... Tap to capture with audio
            </Text>
          </View>
        )}
      </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: theme.spacing(1),
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  placeholder: {
    width: 60, // Same width as back button for centering
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    margin: theme.spacing(3),
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.lg,
  },
  camera: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: theme.radius.xl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginTop: theme.spacing(2),
    textAlign: 'center',
    fontWeight: '500',
  },
  controls: {
    position: 'absolute',
    bottom: theme.spacing(8),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(4),
  },
  galleryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.md,
  },
  shutterButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...theme.shadows.xl,
  },
  shutterButtonDisabled: {
    opacity: 0.6,
  },
  shutterButtonRecording: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.md,
  },
  micButtonActive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
    ...theme.shadows.lg,
  },
  buttonText: {
    fontSize: 24,
    color: theme.colors.text,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: theme.spacing(2),
    left: theme.spacing(4),
    right: theme.spacing(4),
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.lg,
  },
  recordingText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
});
