import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { CameraView, FlashMode } from 'expo-camera';
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

const { width, height } = Dimensions.get('window');

export default function CaptureScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captureMode, setCaptureMode] = useState<'ready' | 'recording' | 'processing'>('ready');
  const [captureHint, setCaptureHint] = useState('Point at what you want to analyze');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);

  // Animation values - very subtle
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // UI element animations
  const controlsAnim = useRef(new Animated.Value(100)).current;
  const shutterScaleAnim = useRef(new Animated.Value(1)).current;
  const recordPulseAnim = useRef(new Animated.Value(1)).current;
  const hintOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 25,
        useNativeDriver: true,
      }),
      Animated.timing(controlsAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(hintOpacityAnim, {
        toValue: 1,
        duration: 1000,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous subtle animations
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Scan line animation for camera effect
    const scanAnimation = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Slow rotation for visual interest
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    floatAnimation.start();
    scanAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
      scanAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  useEffect(() => {
    // Recording pulse animation
    if (isRecording) {
      const recordAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(recordPulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      recordAnimation.start();
      return () => recordAnimation.stop();
    }
  }, [isRecording]);

  const animateShutterPress = () => {
    Animated.sequence([
      Animated.timing(shutterScaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(shutterScaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleImageOnlyCapture = async () => {
    if (!cameraRef.current) return;

    try {
      animateShutterPress();
      setIsLoading(true);
      setCaptureMode('processing');
      setCaptureHint('Analyzing image...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      const result = await assist(photo.base64, 'image/jpeg');
      
      navigation.navigate('Results', { 
        response: result, 
        sessionId: result.sessionId 
      });

    } catch (error) {
      console.error('Image capture error:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      setCaptureMode('ready');
      setCaptureHint('Point at what you want to analyze');
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
        setCaptureMode('processing');
        setCaptureHint('Processing image from gallery...');
        
        const assistResult = await assist(result.assets[0].base64, 'image/jpeg');
        
        navigation.navigate('Results', { 
          response: assistResult, 
          sessionId: assistResult.sessionId 
        });
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert('Error', 'Failed to process selected image.');
      setCaptureMode('ready');
      setCaptureHint('Point at what you want to analyze');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashMode(current => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        case 'auto': return 'off';
        default: return 'off';
      }
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return '⚡';
      case 'auto': return '🔆';
      case 'off': return '⚡';
      default: return '⚡';
    }
  };

  const getFlashLabel = () => {
    switch (flashMode) {
      case 'on': return 'ON';
      case 'auto': return 'AUTO';
      case 'off': return 'OFF';
      default: return 'OFF';
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setCaptureMode('recording');
      setCaptureHint('Recording... Tap again to capture with audio');
      await audioRecorder.startRecording();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setCaptureMode('ready');
      setCaptureHint('Point at what you want to analyze');
      Alert.alert('Error', 'Failed to start audio recording.');
    }
  };

  const stopRecordingAndCapture = async () => {
    if (!cameraRef.current) return;

    try {
      animateShutterPress();
      setIsLoading(true);
      setCaptureMode('processing');
      setCaptureHint('Processing image and audio...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const audioUri = await audioRecorder.stopRecording();
      setIsRecording(false);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      if (audioUri) {
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        const multimodalResult = await assistMultimodal(
          photo.base64,
          'image/jpeg',
          audioBase64,
          'audio/wav'
        );

        const standardResponse = {
          speak: multimodalResult.speak,
          details: [],
          signals: {
            has_text: false,
            hazards: [],
            people_count: 0,
            lighting_ok: true,
            confidence: 0.8
          },
          followup_suggest: multimodalResult.suggest || [],
          followupToken: 'last',
          timestamp: new Date().toISOString(),
          sessionId: multimodalResult.sessionId,
          processingTime: multimodalResult.model_ms || 0,
          fallback: false
        };

        navigation.navigate('Results', {
          response: standardResponse,
          sessionId: multimodalResult.sessionId
        });
      } else {
        const result = await assist(photo.base64, 'image/jpeg');
        navigation.navigate('Results', {
          response: result,
          sessionId: result.sessionId
        });
      }
      
    } catch (error) {
      console.error('Multimodal capture error:', error);
      Alert.alert('Error', 'Failed to process capture.');
      setCaptureMode('ready');
      setCaptureHint('Point at what you want to analyze');
    } finally {
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, height],
  });

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated background elements */}
      <Animated.View
        style={[
          styles.backgroundOrb,
          {
            transform: [
              { rotate: rotation },
              { scale: pulseAnim }
            ],
            opacity: 0.03,
          }
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Premium Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(fadeAnim, -20) }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading || isRecording}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
              style={styles.headerButtonGradient}
            >
              <Text style={styles.headerButtonText}>←</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Capture</Text>
            <View style={styles.modeIndicator}>
              <Animated.View style={[
                styles.modeDot,
                {
                  backgroundColor: isRecording ? '#EF4444' : '#10B981',
                  transform: [{ scale: isRecording ? recordPulseAnim : pulseAnim }]
                }
              ]} />
              <Text style={styles.modeText}>
                {captureMode === 'recording' ? 'Recording Audio' : 
                 captureMode === 'processing' ? 'Processing...' : 'Ready'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleFlash}
            disabled={isLoading || isRecording}
          >
            <LinearGradient
              colors={flashMode === 'off' ?
                ['rgba(100, 116, 139, 0.1)', 'rgba(100, 116, 139, 0.05)'] :
                ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']
              }
              style={styles.headerButtonGradient}
            >
              <Text style={[
                styles.headerButtonText,
                { opacity: flashMode === 'off' ? 0.5 : 1 }
              ]}>
                {getFlashIcon()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Camera View Container */}
        <Animated.View 
          style={[
            styles.cameraContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: floatAnim }
              ]
            }
          ]}
        >
          {/* Camera Frame with Premium Border */}
          <View style={styles.cameraFrame}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(168, 85, 247, 0.2)']}
              style={styles.cameraFrameGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cameraInner}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  flash={flashMode}
                />

                {/* Scan Line Effect */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{ translateY: scanLineTranslate }],
                      opacity: 0.3,
                    }
                  ]}
                />

                {/* Corner Brackets for Focus */}
                <View style={styles.focusBrackets}>
                  <View style={[styles.bracket, styles.bracketTopLeft]} />
                  <View style={[styles.bracket, styles.bracketTopRight]} />
                  <View style={[styles.bracket, styles.bracketBottomLeft]} />
                  <View style={[styles.bracket, styles.bracketBottomRight]} />
                </View>

                {/* Loading Overlay */}
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <LinearGradient
                      colors={['rgba(15, 23, 42, 0.9)', 'rgba(30, 41, 59, 0.9)']}
                      style={styles.loadingGradient}
                    >
                      <ActivityIndicator size="large" color="#60A5FA" />
                      <Text style={styles.loadingText}>{captureHint}</Text>
                    </LinearGradient>
                  </View>
                )}

                {/* Hint Text */}
                <Animated.View 
                  style={[
                    styles.hintContainer,
                    {
                      opacity: hintOpacityAnim,
                      transform: [{ translateY: floatAnim }]
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(15, 23, 42, 0.8)', 'rgba(15, 23, 42, 0.6)']}
                    style={styles.hintGradient}
                  >
                    <Text style={styles.hintText}>{captureHint}</Text>
                  </LinearGradient>
                </Animated.View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Premium Control Panel */}
        <Animated.View 
          style={[
            styles.controlPanel,
            {
              opacity: fadeAnim,
              transform: [{ translateY: controlsAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.95)', 'rgba(30, 41, 59, 0.9)']}
            style={styles.controlPanelGradient}
          >
            {/* Secondary Controls */}
            <View style={styles.secondaryControls}>
              {/* Gallery Button */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleGalleryPick}
                disabled={isLoading || isRecording}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(148, 163, 184, 0.1)', 'rgba(148, 163, 184, 0.05)']}
                  style={styles.secondaryButtonGradient}
                >
                  <Text style={styles.secondaryButtonIcon}>🖼️</Text>
                  <Text style={styles.secondaryButtonText}>Gallery</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Main Shutter Button */}
              <Animated.View
                style={[
                  styles.shutterContainer,
                  {
                    transform: [
                      { scale: shutterScaleAnim },
                      { scale: isRecording ? recordPulseAnim : 1 }
                    ]
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={isRecording ? stopRecordingAndCapture : handleImageOnlyCapture}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isRecording ? 
                      ['#EF4444', '#DC2626', '#B91C1C'] :
                      isLoading ?
                      ['#64748B', '#475569', '#334155'] :
                      ['#60A5FA', '#3B82F6', '#2563EB']
                    }
                    style={styles.shutterGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    ) : (
                      <View style={styles.shutterInner}>
                        <View style={styles.shutterCore} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Voice Button */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={isRecording ? stopRecordingAndCapture : startRecording}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isRecording ?
                    ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)'] :
                    ['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.05)']
                  }
                  style={styles.secondaryButtonGradient}
                >
                  {isRecording ? (
                    <>
                      <Animated.View style={[
                        styles.recordingIndicator,
                        { transform: [{ scale: recordPulseAnim }] }
                      ]} />
                      <Text style={styles.secondaryButtonText}>Stop</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.secondaryButtonIcon}>🎤</Text>
                      <Text style={styles.secondaryButtonText}>Voice</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Mode Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionText}>
                Tap capture for image • Hold mic for audio question
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  safeArea: {
    flex: 1,
  },

  // Background elements
  backgroundOrb: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    top: height / 2 - 300,
    left: width / 2 - 300,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  modeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },

  // Camera Container
  cameraContainer: {
    flex: 1,
    padding: 16,
  },
  cameraFrame: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  cameraFrameGradient: {
    flex: 1,
    padding: 2,
  },
  cameraInner: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },

  // Camera Effects
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#60A5FA',
  },
  focusBrackets: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    bottom: '25%',
  },
  bracket: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(96, 165, 250, 0.5)',
    borderWidth: 2,
  },
  bracketTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  bracketTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bracketBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bracketBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    overflow: 'hidden',
  },
  loadingGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#E2E8F0',
    marginTop: 16,
    fontWeight: '600',
  },

  // Hint Container
  hintContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hintGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },

  // Control Panel
  controlPanel: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  controlPanelGradient: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  secondaryButton: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
  },
  secondaryButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  secondaryButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginBottom: 4,
  },

  // Shutter Button
  shutterContainer: {
    width: 88,
    height: 88,
  },
  shutterButton: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shutterGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 44,
  },
  shutterInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },

  // Instructions
  instructionsContainer: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});