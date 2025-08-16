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
import { optimizeImageForAI, logPerformance, getPerformanceStats } from '../utils/performanceOptimizer';

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

// Custom icon components for better visual design
const GalleryIcon = () => (
  <View style={styles.customIcon}>
    <View style={styles.galleryFrame} />
    <View style={styles.galleryImage} />
    <View style={styles.galleryCorner} />
  </View>
);

const MicrophoneIcon = () => (
  <View style={styles.customIcon}>
    <View style={styles.micBody} />
    <View style={styles.micGrille1} />
    <View style={styles.micGrille2} />
    <View style={styles.micGrille3} />
    <View style={styles.micBase} />
  </View>
);

const FlashIcon = ({ mode }: { mode: FlashMode }) => (
  <View style={styles.customIcon}>
    <View style={[styles.flashBolt, { opacity: mode === 'off' ? 0.3 : 1 }]} />
    <View style={[styles.flashSpark, { opacity: mode === 'auto' ? 1 : 0 }]} />
  </View>
);

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
        quality: 0.6, // Reduced for faster processing
        base64: false, // We'll optimize it ourselves
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture image');
      }

      // Optimize image for AI processing
      const imageProcessingStart = Date.now();
      const optimizedImage = await optimizeImageForAI(photo.uri);
      const imageProcessingTime = Date.now() - imageProcessingStart;

      console.log(`⚡ Image optimized: ${Math.round(optimizedImage.originalSize/1024)}KB → ${Math.round(optimizedImage.optimizedSize/1024)}KB in ${imageProcessingTime}ms`);

      const result = await assist(optimizedImage.base64, 'image/jpeg');
      
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
        mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6, // Reduced for faster processing
        base64: false, // We'll optimize it ourselves
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setIsLoading(true);
        setCaptureMode('processing');
        setCaptureHint('Processing image from gallery...');

        // Use optimized image processing
        const optimizedImage = await optimizeImageForAI(result.assets[0].uri);
        console.log(`⚡ Gallery image optimized: ${Math.round(optimizedImage.originalSize/1024)}KB → ${Math.round(optimizedImage.optimizedSize/1024)}KB`);

        const assistResult = await assist(optimizedImage.base64, optimizedImage.mimeType);
        
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
        quality: 0.6, // Reduced for faster processing
        base64: false, // We'll optimize it ourselves
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture image');
      }

      // Optimize image for AI processing
      const optimizedImage = await optimizeImageForAI(photo.uri);
      console.log(`⚡ Multimodal image optimized: ${Math.round(optimizedImage.originalSize/1024)}KB → ${Math.round(optimizedImage.optimizedSize/1024)}KB`);

      if (audioUri) {
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        const multimodalResult = await assistMultimodal(
          optimizedImage.base64,
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
        const result = await assist(optimizedImage.base64, 'image/jpeg');
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

  const rotation2 = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-180deg'],
  });

  return (
    <View style={styles.container}>
      {/* Enhanced deep gradient background */}
      <LinearGradient
        colors={[
          '#0A0E27',
          '#1A1B3A',
          '#2D1B69',
          '#1A1B3A',
          '#0A0E27'
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Enhanced animated background elements */}
      <Animated.View
        style={[
          styles.backgroundOrb,
          {
            transform: [
              { rotate: rotation },
              { scale: pulseAnim }
            ],
            opacity: 0.04,
          }
        ]}
      />

      {/* Additional background orbs for depth */}
      <Animated.View
        style={[
          styles.backgroundOrb2,
          {
            transform: [
              { rotate: rotation2 },
              { scale: Animated.multiply(pulseAnim, 0.8) }
            ],
            opacity: 0.02,
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
              <FlashIcon mode={flashMode} />
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
          {/* Enhanced Camera Frame with Premium Border */}
          <View style={styles.cameraFrame}>
            <LinearGradient
              colors={[
                'rgba(59, 130, 246, 0.25)',
                'rgba(139, 92, 246, 0.2)',
                'rgba(168, 85, 247, 0.25)'
              ]}
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
            colors={[
              'rgba(10, 14, 39, 0.98)',
              'rgba(26, 27, 58, 0.95)',
              'rgba(45, 27, 105, 0.92)',
              'rgba(26, 27, 58, 0.95)',
              'rgba(10, 14, 39, 0.98)'
            ]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
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
                  <GalleryIcon />
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
                      <MicrophoneIcon />
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

  // Enhanced background elements
  backgroundOrb: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    top: height / 2 - 300,
    left: width / 2 - 300,
  },
  backgroundOrb2: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    top: height / 2 - 200,
    right: -100,
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

  // Custom icon styles
  customIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gallery icon
  galleryFrame: {
    width: 18,
    height: 14,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 2,
  },
  galleryImage: {
    position: 'absolute',
    width: 10,
    height: 8,
    backgroundColor: '#60A5FA',
    borderRadius: 1,
    top: 3,
    left: 4,
  },
  galleryCorner: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    top: 1,
    right: 1,
  },

  // Microphone icon
  micBody: {
    width: 8,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  micGrille1: {
    position: 'absolute',
    width: 4,
    height: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 0.5,
    top: 4,
  },
  micGrille2: {
    position: 'absolute',
    width: 4,
    height: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 0.5,
    top: 6,
  },
  micGrille3: {
    position: 'absolute',
    width: 4,
    height: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 0.5,
    top: 8,
  },
  micBase: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    bottom: -2,
  },

  // Flash icon
  flashBolt: {
    width: 12,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ skewX: '-15deg' }],
  },
  flashSpark: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 1.5,
    top: 2,
    right: 2,
  },
});