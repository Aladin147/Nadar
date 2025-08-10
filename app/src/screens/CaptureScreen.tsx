import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Platform, TextInput, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { theme } from '../app/theme';                     // ✅ correct for screens
import { useAppState } from '../app/state/AppContext';
import { useSettings } from '../app/state/useSettings';
import { describe, ocr, qa, testConnection } from '../api/client';
import { downscale } from '../utils/downscale';

// Import the updated components
import { Segmented } from '../app/components/Segmented';
import { Chip } from '../app/components/Chip';
import { Card } from '../app/components/Card';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { ConnectivityPill } from '../app/components/ConnectivityPill';

const { width, height } = Dimensions.get('window');

export default function CaptureScreen() {
  const { state, dispatch } = useAppState();
  const { settings } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'scene' | 'ocr' | 'qa'>('scene');
  const [question, setQuestion] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<any>(null);

  // Persist last question and restore on mount
  useEffect(() => {
    (async () => {
      try {
        const last = await AsyncStorage.getItem('nadar.lastQuestion.v1');
        if (last) setQuestion(last);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('nadar.lastQuestion.v1', question).catch(()=>{});
  }, [question]);

  // Timer handling for progress HUD
  useEffect(() => {
    if (state.isLoading) {
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isLoading]);

  async function processImage(imageUri: string, source: 'camera' | 'library') {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      console.log(`📷 Processing ${source} image...`);
      const downscaled = await downscale(imageUri, 1024, 0.7);
      console.log('📷 Image downscaled, calling API...');

      const opts = { verbosity: settings.verbosity, language: settings.language };
      let result: any;

      if (mode === 'scene') {
        console.log('🔍 Calling describe API...');
        result = await describe(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else if (mode === 'ocr') {
        console.log('📖 Calling OCR API...');
        result = await ocr(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else {
        if (!question.trim()) {
          dispatch({ type: 'SET_ERROR', error: 'Please select a question for Q&A mode' });
          return;
        }
        console.log('❓ Calling Q&A API...');
        result = await qa(downscaled.base64, question.trim(), downscaled.mimeType, opts, state.sessionId);
      }

      console.log('✅ API call successful, navigating to results...');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});

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
      console.error('❌ Processing error:', error);
      const errorMessage = error?.message || 'Failed to analyze image';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(()=>{});
    } finally {
      // Keep isLoading state managed by success/SET_CAPTURE_RESULT or error above
    }
  }


  // Web version - show image picker interface
  if (Platform.OS === 'web') {
    // Web version - show image picker interface
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webContainer}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>نظر</Text>
              <Text style={styles.subtitle}>Nadar</Text>
              <ConnectivityPill style={styles.connectivityPill} />
            </View>
            <Segmented
              options={['scene', 'ocr', 'qa']}
              value={mode}
              onChange={(v) => setMode(v as any)}
            />
          </View>

          {mode === 'qa' && (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>What would you like to know?</Text>
              <View style={styles.presetQuestions}>
                {['What is this?', 'What color is it?', 'Is there text?'].map(q => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.presetQuestion, question === q && styles.presetQuestionActive]}
                    onPress={() => setQuestion(q)}
                  >
                    <Text style={styles.presetQuestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask about the image…"
                placeholderTextColor={theme.colors.textMut}
                style={styles.questionInput}
                accessibilityLabel="Ask a question"
                accessibilityHint="Type your custom question about the image"
                returnKeyType="send"
                multiline={false}
              />
            </View>
          )}

          <View style={styles.webCaptureArea}>
            <PrimaryButton
              title={state.isLoading ? 'Analyzing…' : '📁 Select Image'}
              disabled={state.isLoading}
              style={{ minWidth: 220 }}
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: false,
                    quality: 1,
                    base64: true,
                  });
                  if (!result.canceled && result.assets[0]) {
                    const asset = result.assets[0];
                    const uriOrData = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri;
                    await processImage(uriOrData, 'library');
                  }
                } catch (error: any) {
                  console.error('Web image select error:', error);
                  dispatch({ type: 'SET_ERROR', error: error?.message || 'Failed to select image' });
                }
              }}
            />
          </View>

          {state.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {state.error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => dispatch({ type: 'SET_ERROR', error: null })}
              >
                <Text style={styles.retryText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <View style={styles.container}><Text style={styles.permissionText}>Loading camera...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>Nadar needs camera access to analyze your surroundings.</Text>
          <PrimaryButton title="Enable Camera" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || state.isLoading) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      console.log('📷 Taking photo...');
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      console.log('📷 Photo taken, downscaling...');

      const downscaled = await downscale(photo.uri, 1024, 0.7);
      console.log('📷 Image downscaled, calling API...');

      const opts = { verbosity: settings.verbosity, language: settings.language };
      let result;

      if (mode === 'scene') {
        console.log('🔍 Calling describe API...');
        result = await describe(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else if (mode === 'ocr') {
        console.log('📖 Calling OCR API...');
        result = await ocr(downscaled.base64, downscaled.mimeType, opts, state.sessionId);
      } else {
        if (!question.trim()) {
          dispatch({ type: 'SET_ERROR', error: 'Please select a question for Q&A mode' });
          return;
        }
        console.log('❓ Calling Q&A API...');
        result = await qa(downscaled.base64, question.trim(), downscaled.mimeType, opts, state.sessionId);
      }

      console.log('✅ API call successful, navigating to results...');

      const captureResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri: photo.uri,
        mode,
        question: mode === 'qa' ? question : undefined,
        result: result.text,
        timings: result.timings
          ? { prep: undefined, model: (result.timings as any).modelMs ?? (result.timings as any).model ?? undefined, total: undefined }
          : undefined,
        structured: (result as any).structured,
      };

      dispatch({ type: 'SET_CAPTURE_RESULT', result: captureResult });
      dispatch({ type: 'ADD_TO_HISTORY', result: captureResult });
      dispatch({ type: 'NAVIGATE', route: 'results' });

    } catch (error: any) {
      console.error('❌ Capture error:', error);
      const errorMessage = error.message || 'Failed to analyze image';
      dispatch({ type: 'SET_ERROR', error: `Error: ${errorMessage}. Check server connection.` });
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>نظر</Text>
              <Text style={styles.subtitle}>Nadar</Text>
              <ConnectivityPill style={styles.connectivityPill} />
            </View>
            <Segmented
              options={['scene', 'ocr', 'qa']}
              value={mode}
              onChange={(v) => setMode(v as any)}
            />
          </View>

          {mode === 'qa' && (
            <Card style={styles.questionContainer}>
              <Text style={styles.questionLabel}>What would you like to know?</Text>
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
                placeholder="Ask a question…"
                placeholderTextColor={theme.colors.textMut}
                style={styles.questionInput}
                accessibilityLabel="Ask a question"
                accessibilityHint="Type your custom question about the image"
                returnKeyType="send"
                multiline={false}
                onSubmitEditing={() => {
                  // Auto-capture when user presses send
                  if (question.trim()) {
                    handleCapture();
                  }
                }}
              />
            </Card>
          )}

          <View style={styles.captureArea}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={state.isLoading}
              accessibilityLabel={`Capture for ${mode} analysis`}
              accessibilityHint="Tap to take photo and analyze"
            >
              <View style={[styles.captureInner, state.isLoading && styles.captureLoading]}>
                {state.isLoading ? (
                  <Text style={styles.captureText}>Analyzing...</Text>
                ) : (
                  <Text style={styles.captureText}>📷</Text>
                )}
              </View>
            </TouchableOpacity>

            <SecondaryButton
              title="📱 Library"
              style={styles.libraryButton}
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
                } catch (error: any) {
                  dispatch({ type: 'SET_ERROR', error: 'Failed to select image' });
                }
              }}
              disabled={state.isLoading}
            />
          </View>

          {state.isLoading && (
            <View
              style={styles.hud}
              accessibilityLabel="Analyzing"
              accessibilityLiveRegion="polite"
              pointerEvents="none"
            >
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.hudText}>Analyzing… {(elapsedMs / 1000).toFixed(1)}s</Text>
            </View>
          )}

          <View style={styles.footer}>
            {state.error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {state.error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => dispatch({ type: 'SET_ERROR', error: null })}
                >
                  <Text style={styles.retryText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.instruction}>
                {mode === 'scene' && 'Point at your surroundings for instant scene analysis'}
                {mode === 'ocr' && 'Point at text to read signs, menus, and documents'}
                {mode === 'qa' && 'Select a question and point at what you want to know about'}
              </Text>
            )}
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: theme.colors.overlay35 },
  header: {
    paddingTop: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  title: {
    ...theme.typography.title,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  subtitle: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    textAlign: 'center',
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
  },
  connectivityPill: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  questionContainer: {
    margin: theme.spacing(2),
    backgroundColor: theme.colors.overlay70,
  },
  questionLabel: {
    ...theme.typography.section,
    color: '#fff',
    marginBottom: theme.spacing(1.5),
  },
  presetQuestions: { gap: theme.spacing(1) },
  presetQuestion: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.radius.md,
    padding: theme.spacing(1),
  },
  presetQuestionActive: { backgroundColor: theme.colors.primary },
  presetQuestionText: { color: '#fff', textAlign: 'center' },
  questionInput: {
    marginTop: theme.spacing(2),
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  captureArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  captureInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  captureLoading: { backgroundColor: theme.colors.primary },
  captureText: { fontSize: 24, fontWeight: '800' },
  footer: {
    padding: theme.spacing(2),
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  hud: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  hudText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  instruction: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.sm,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(1),
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  libraryButton: {
    marginTop: theme.spacing(2),
  },
  webContainer: {
    flex: 1,
    padding: theme.spacing(3),
    backgroundColor: theme.colors.bg,
  },
  webCaptureArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webUploadButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.radius.lg,
    minWidth: 200,
  },
  webUploadText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  permissionText: {
    color: theme.colors.textMut,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.lg,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
