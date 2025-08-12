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
import { describe, ocr, qa } from '../api/client';
import { downscale } from '../utils/downscale';

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
  const [mode, setMode] = useState<'scene' | 'ocr' | 'qa'>('scene');
  const [question, setQuestion] = useState('');

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
      let result: any;

      if (mode === 'scene') {
        result = await describe(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else if (mode === 'ocr') {
        result = await ocr(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else {
        if (!question.trim()) {
          dispatch({ type: 'SET_ERROR', error: 'Please select a question for Q&A mode' });
          return;
        }
        result = await qa(
          downscaled.base64,
          question.trim(),
          downscaled.mimeType,
          opts,
          state.sessionId
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      const captureResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri,
        mode,
        question: mode === 'qa' ? question : undefined,
        result: result.text,
        timings: result.timings,
        structured: (result as any).structured,
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

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      const downscaled = await downscale(photo.uri, 1024, 0.7);

      const opts = { verbosity: settings.verbosity, language: settings.language };
      let result;

      if (mode === 'scene') {
        result = await describe(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else if (mode === 'ocr') {
        result = await ocr(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else {
        if (!question.trim()) {
          dispatch({ type: 'SET_ERROR', error: 'Please select a question for Q&A mode' });
          return;
        }
        result = await qa(
          downscaled.base64,
          question.trim(),
          downscaled.mimeType,
          opts,
          state.sessionId
        );
      }

      const captureResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri: photo.uri,
        mode,
        question: mode === 'qa' ? question : undefined,
        result: result.text,
        timings: result.timings
          ? {
              prep: undefined,
              model: (result.timings as any).modelMs ?? (result.timings as any).model ?? undefined,
              total: undefined,
            }
          : undefined,
        structured: (result as any).structured,
      };

      dispatch({ type: 'SET_CAPTURE_RESULT', result: captureResult });
      dispatch({ type: 'ADD_TO_HISTORY', result: captureResult });
      dispatch({ type: 'NAVIGATE', route: 'results' });
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
              Nadar
            </StyledText>
            <ConnectivityPill style={styles.connectivityPill} />
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Footer Controls */}
          <View style={styles.footer}>
            <View style={styles.modeSwitcherContainer}>
              <Segmented
                options={['scene', 'ocr', 'qa']}
                value={mode}
                onChange={v => setMode(v as any)}
              />
            </View>

            {mode === 'qa' && (
              <View style={styles.qaContainer}>
                <View style={styles.presetQuestions}>
                  {['What is this?', 'What color is it?', 'Is there text?'].map(q => (
                    <Chip
                      key={q}
                      title={q}
                      selected={question === q}
                      onPress={() => setQuestion(q)}
                    />
                  ))}
                </View>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask a custom question…"
                  placeholderTextColor={theme.colors.textMut}
                  style={styles.questionInput}
                  returnKeyType="send"
                  onSubmitEditing={handleCapture}
                />
              </View>
            )}

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
  questionInput: {
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
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
