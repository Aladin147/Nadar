import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScreenWrapper } from '../app/components/ScreenWrapper';
import { StyledText } from '../app/components/StyledText';
import { ShutterButton } from '../app/components/ShutterButton';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../app/theme'; // ✅ correct for screens
import { useAppState } from '../app/state/AppContext';
import { useSettings } from '../app/state/useSettings';
import { assist } from '../api/client';
import { downscale } from '../utils/downscale';
import { audioRecorder } from '../app/utils/audioRecording';
import { liveAssist, createSessionId, logLiveAssistTelemetry } from '../app/services/liveAssistApi';

// Map error codes to friendly messages
function mapErrorMessage(error: any): string {
  const err_code = error?.err_code;
  const message = error?.message;

  if (err_code) {
    switch (err_code) {
      case 'NETWORK':
        return 'No connection. Check internet or server in Settings.';
      case 'TIMEOUT':
        return 'The model took too long. Try again.';
      case 'QUOTA':
        return 'Daily limit reached. Try later or switch provider in Settings.';
      case 'UNAUTHORIZED':
        return 'API key invalid on server.';
      case 'TOO_LARGE':
        return 'Image too large. Move closer or try again.';
      case 'UNKNOWN':
      default:
        return message || 'Something went wrong. Please try again.';
    }
  }

  return message || error?.message || 'Failed to analyze image';
}

// Import the updated components
import { Segmented } from '../app/components/Segmented';
import { Chip } from '../app/components/Chip';

import { SecondaryButton } from '../app/components/SecondaryButton';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { ConnectivityPill } from '../app/components/ConnectivityPill';

export default function CaptureScreen() {
  const { state, dispatch } = useAppState();
  const { settings } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const [question, setQuestion] = useState('');

  // Audio recording state for experimental multimodal
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [experimentalMode, setExperimentalMode] = useState(false);

  const cameraRef = useRef<any>(null);

  // Persist last question and restore on mount
  useEffect(() => {
    (async () => {
      try {
        const last = await AsyncStorage.getItem('nadar.lastQuestion.v1');
        if (last) setQuestion(last);
      } catch {
        // Ignore storage errors
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('nadar.lastQuestion.v1', question).catch(() => {});
  }, [question]);

  async function processImage(imageUri: string, _source: 'camera' | 'library') {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const downscaled = await downscale(imageUri, 1024, 0.7);

      const opts = { verbosity: settings.verbosity, language: settings.language };

      // Use the new smart assist endpoint
      const result = await assist(
        downscaled.base64,
        downscaled.mimeType,
        question.trim() || undefined,
        opts,
        state.sessionId
      );

      console.log('🔍 Full API response:', JSON.stringify(result, null, 2));
      console.log('🆔 Session ID from API:', result.sessionId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const captureResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri,
        mode: 'assist' as any, // New assist mode
        question: question.trim() || undefined,
        result: result.speak, // Use the speak text as the main result
        details: result.details, // Additional details
        signals: result.signals, // AI analysis signals
        followup_suggest: result.followup_suggest, // Suggested follow-up questions
        sessionId: result.sessionId, // Store session ID for follow-up questions
        timings: result.processingTime ? { total: result.processingTime } : undefined,
        structured: undefined, // Not used in assist mode
      };

      dispatch({ type: 'SET_CAPTURE_RESULT', result: captureResult });
      dispatch({ type: 'ADD_TO_HISTORY', result: captureResult });
      dispatch({ type: 'NAVIGATE', route: 'results' });
    } catch (error: any) {
      const errorMessage = mapErrorMessage(error);
      dispatch({ type: 'SET_LOADING', loading: false });
      dispatch({ type: 'SHOW_TOAST', message: errorMessage, toastType: 'error' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }

  // Experimental multimodal processing with audio + image
  async function processMultimodal(imageUri: string, audioUri: string | null) {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    setIsProcessingAudio(true);

    const startTime = Date.now();

    try {
      const downscaled = await downscale(imageUri, 1024, 0.7);
      const sessionId = createSessionId();

      // Prepare image data
      const imageData = {
        mime: downscaled.mimeType,
        data: downscaled.base64
      };

      // Prepare audio data if available
      let audioData = undefined;
      if (audioUri) {
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        audioData = audioBase64;
      }

      console.log(`🚀 Experimental multimodal request: image=${!!imageData}, audio=${!!audioData}, question="${question}"`);

      // Call the multimodal API
      const result = await liveAssist(sessionId, {
        language: settings.language,
        style: settings.verbosity === 'brief' ? 'single_paragraph' : 'detailed',
        image: imageData,
        audio: audioData,
        question: question.trim() || undefined
      });

      const totalTime = Date.now() - startTime;

      // Log telemetry
      logLiveAssistTelemetry(
        sessionId,
        result,
        totalTime,
        !!imageData,
        !!audioData,
        !!question.trim()
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Create capture result compatible with existing UI
      const captureResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri,
        mode: 'assist' as any,
        question: question.trim() || undefined,
        result: result.speak,
        details: undefined,
        signals: undefined,
        followup_suggest: result.suggest,
        sessionId: result.sessionId,
        timings: { total: result.model_ms },
        structured: undefined,
      };

      dispatch({ type: 'SET_CAPTURE_RESULT', result: captureResult });
      dispatch({ type: 'ADD_TO_HISTORY', result: captureResult });
      dispatch({ type: 'NAVIGATE', route: 'results' });

    } catch (error: any) {
      const errorMessage = mapErrorMessage(error);
      dispatch({ type: 'SET_LOADING', loading: false });
      dispatch({ type: 'SHOW_TOAST', message: errorMessage, toastType: 'error' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsProcessingAudio(false);
    }
  }

  // Audio recording functions
  async function startRecording() {
    try {
      setIsRecording(true);
      await audioRecorder.startRecording();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      dispatch({ type: 'SHOW_TOAST', message: 'Failed to start recording', toastType: 'error' });
    }
  }

  async function stopRecording() {
    try {
      const audioUri = await audioRecorder.stopRecording();
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      if (audioUri) {
        // Take a photo and process with audio
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({ base64: true });
          await processMultimodal(photo.uri, audioUri);
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      dispatch({ type: 'SHOW_TOAST', message: 'Failed to process recording', toastType: 'error' });
    }
  }

  // Web is not supported in this refactor, so we return a placeholder.
  if (Platform.OS === 'web') {
    return (
      <ScreenWrapper style={{ justifyContent: 'center', alignItems: 'center' }}>
        <StyledText variant="title">Nadar</StyledText>
        <StyledText>This application is intended for mobile use.</StyledText>
      </ScreenWrapper>
    );
  }

  if (!permission) {
    return (
      <ScreenWrapper>
        <StyledText>Loading camera...</StyledText>
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper style={styles.permissionContainer}>
        <StyledText variant="title" style={{ textAlign: 'center' }}>
          Camera Access Required
        </StyledText>
        <StyledText
          variant="body"
          style={{ textAlign: 'center', marginVertical: theme.spacing(2) }}
        >
          Nadar needs camera access to analyze your surroundings.
        </StyledText>
        <PrimaryButton title="Enable Camera" onPress={requestPermission} />
      </ScreenWrapper>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || state.isLoading) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      await processImage(photo.uri, 'camera');
    } catch (error: any) {
      const errorMessage = mapErrorMessage(error);
      dispatch({ type: 'SET_LOADING', loading: false });
      dispatch({ type: 'SHOW_TOAST', message: errorMessage, toastType: 'error' });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <StyledText variant="title" style={styles.title}>
              Assist
            </StyledText>
            <ConnectivityPill style={styles.connectivityPill} />
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Footer Controls */}
          <View style={styles.footer}>
            {/* Experimental Mode Toggle */}
            <View style={styles.experimentalToggle}>
              <Chip
                title={experimentalMode ? "🧪 Multimodal" : "📸 Standard"}
                selected={experimentalMode}
                onPress={() => setExperimentalMode(!experimentalMode)}
                style={{ marginBottom: theme.spacing(1) }}
              />
            </View>

            {/* Question input with speech button */}
            <View style={styles.qaContainer}>
              <View style={styles.inputRow}>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder={experimentalMode ? "اسأل سؤال... (اختياري)" : "اسأل سؤال... (اختياري)"}
                  placeholderTextColor={theme.colors.textMut}
                  style={styles.questionInput}
                  returnKeyType="send"
                  onSubmitEditing={experimentalMode ? undefined : handleCapture}
                />
                <SecondaryButton
                  title={experimentalMode ? (isRecording ? "🔴" : "🎤") : "🎤"}
                  onPress={experimentalMode ? (isRecording ? stopRecording : startRecording) : () => {
                    dispatch({ type: 'SHOW_TOAST', message: 'Enable Multimodal mode for voice input', toastType: 'info' });
                  }}
                  style={[
                    styles.speechButton,
                    isRecording && { backgroundColor: theme.colors.error }
                  ]}
                  disabled={state.isLoading || isProcessingAudio}
                />
              </View>
              {experimentalMode && (
                <StyledText variant="caption" style={styles.experimentalHint}>
                  {isRecording ? "🎤 Recording... Release to process" :
                   isProcessingAudio ? "🧠 Processing audio + image..." :
                   "Hold mic button and speak, then release"}
                </StyledText>
              )}
            </View>

            <View style={styles.captureRow}>
              <View style={styles.libraryButtonContainer}>
                <SecondaryButton
                  title="Library"
                  onPress={async () => {
                    try {
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: false,
                        quality: 1,
                      });
                      if (!result.canceled && result.assets[0]) {
                        await processImage(result.assets[0].uri, 'library');
                      }
                    } catch {
                      dispatch({ type: 'SET_ERROR', error: 'Failed to select image' });
                    }
                  }}
                  disabled={state.isLoading}
                />
              </View>

              <ShutterButton onPress={handleCapture} isLoading={state.isLoading} />

              <View style={styles.placeholderButton} />
            </View>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: theme.spacing(2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing(4),
  },
  title: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  connectivityPill: {
    position: 'absolute',
    top: theme.spacing(4),
    right: theme.spacing(2),
  },
  footer: {
    paddingBottom: theme.spacing(2),
    gap: theme.spacing(3),
  },
  modeSwitcherContainer: {
    alignItems: 'center',
  },
  qaContainer: {
    gap: theme.spacing(2),
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
  },
  presetQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(1),
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing(1),
    alignItems: 'center',
  },
  questionInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
  },
  speechButton: {
    minWidth: 50,
    paddingHorizontal: theme.spacing(1),
  },
  experimentalToggle: {
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  experimentalHint: {
    textAlign: 'center',
    color: theme.colors.textMut,
    marginTop: theme.spacing(1),
  },
  captureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  libraryButtonContainer: {
    flex: 1,
    alignItems: 'center',
  },
  placeholderButton: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

});
