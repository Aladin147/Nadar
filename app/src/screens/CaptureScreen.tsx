import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../app/theme';
import { Segmented } from '../app/components/Segmented';
import { useAppState } from '../app/state/AppContext';
import { downscale } from '../utils/downscale';
import { describe, ocr, qa, testConnection } from '../api/client';
import { useSettings } from '../app/state/useSettings';
import * as ImagePicker from 'expo-image-picker';
import { DEMO_MODE } from '../config';

const { width, height } = Dimensions.get('window');

export default function CaptureScreen() {
  const { state, dispatch } = useAppState();
  const { settings } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'scene' | 'ocr' | 'qa'>('scene');
  const [question, setQuestion] = useState('');
  const cameraRef = useRef<any>(null);

  // Skip camera permissions on web or in demo mode
  if (Platform.OS === 'web' || DEMO_MODE) {
    // Web version - show image picker interface
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Nadar {DEMO_MODE ? '(Demo Mode)' : ''}</Text>
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
            </View>
          )}

          <View style={styles.webCaptureArea}>
            <TouchableOpacity
              style={styles.webUploadButton}
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
            >
              <Text style={styles.webUploadText}>
                {state.isLoading ? 'Analyzing...' : '📁 Select Image'}
              </Text>
            </TouchableOpacity>
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
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
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

      const downscaled = await downscale(photo.uri, 256, 0.4);
      console.log('📷 Image downscaled, calling API...');

      const opts = { verbosity: settings.verbosity, language: settings.language };
      let result;

      if (mode === 'scene') {
        console.log('🔍 Calling describe API...');
        result = await describe(downscaled.base64, downscaled.mimeType, opts);
      } else if (mode === 'ocr') {
        console.log('📖 Calling OCR API...');
        result = await ocr(downscaled.base64, downscaled.mimeType, opts);
      } else {
        if (!question.trim()) {
          dispatch({ type: 'SET_ERROR', error: 'Please select a question for Q&A mode' });
          return;
        }
        console.log('❓ Calling Q&A API...');
        result = await qa(downscaled.base64, question.trim(), downscaled.mimeType, opts);
      }

      console.log('✅ API call successful, navigating to results...');

      const captureResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri: photo.uri,
        mode,
        question: mode === 'qa' ? question : undefined,
        result: result.text,
        timings: result.timings,
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
            <Text style={styles.title}>Nadar</Text>
            <Segmented
              options={['scene', 'ocr', 'qa']}
              value={mode}
              onChange={(v) => setMode(v as any)}
            />
            <TouchableOpacity
              style={styles.testButton}
              onPress={async () => {
                console.log('🔍 Testing connection...');
                const success = await testConnection();
                console.log('🔍 Connection test result:', success);
              }}
            >
              <Text style={styles.testButtonText}>Test Connection</Text>
            </TouchableOpacity>
          </View>

          {mode === 'qa' && (
            <View style={styles.questionContainer}>
              <Text style={styles.questionLabel}>What would you like to know?</Text>
              {/* For now, show preset questions - full TextInput in next iteration */}
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
            </View>
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

            <TouchableOpacity
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
              accessibilityLabel="Select from photo library"
            >
              <Text style={styles.libraryText}>📱 Library</Text>
            </TouchableOpacity>
          </View>

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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  header: { 
    paddingTop: theme.spacing(2), 
    paddingHorizontal: theme.spacing(2),
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  title: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  questionContainer: {
    margin: theme.spacing(2),
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
  },
  questionLabel: { color: '#fff', fontWeight: '600', marginBottom: theme.spacing(1) },
  presetQuestions: { gap: theme.spacing(1) },
  presetQuestion: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.radius.md,
    padding: theme.spacing(1),
  },
  presetQuestionActive: { backgroundColor: theme.colors.primary },
  presetQuestionText: { color: '#fff', textAlign: 'center' },
  captureArea: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureLoading: { backgroundColor: theme.colors.primary },
  captureText: { fontSize: 24, fontWeight: '800' },
  footer: {
    padding: theme.spacing(2),
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
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
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
  },
  libraryText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
