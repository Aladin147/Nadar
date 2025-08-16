import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { testConnection } from '../api/client';

type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Results: { response: any };
};

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // Individual card animations
  const card1Anim = useRef(new Animated.Value(-width)).current;
  const card2Anim = useRef(new Animated.Value(-width)).current;
  const card3Anim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    checkConnectionStatus();
    checkAudioPermissions();

    // Epic entrance animation sequence
    Animated.sequence([
      // First: Logo entrance with rotation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2400, // Slower, more graceful rotation
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Then: Cards slide in with stagger
      Animated.stagger(150, [
        Animated.spring(card1Anim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(card2Anim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(card3Anim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous animations
    // Pulse animation for logo - much more subtle
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03, // Much more subtle scaling
          duration: 4000, // Slower, more breathing-like
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000, // Slower return
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Floating animation - more gentle
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3, // Much more subtle movement
          duration: 6000, // Slower, more meditative
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 6000, // Slower return
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer effect - slower and more elegant
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 5000, // Slower shimmer for elegance
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Gradient rotation - extremely slow for barely perceptible ambient effect
    const gradientAnimation = Animated.loop(
      Animated.timing(gradientAnim, {
        toValue: 1,
        duration: 60000, // 1 minute for barely noticeable ambient effect
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    floatAnimation.start();
    shimmerAnimation.start();
    gradientAnimation.start();

    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
      shimmerAnimation.stop();
      gradientAnimation.stop();
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const result = await testConnection();
      setIsConnected(result);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const checkAudioPermissions = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      setAudioPermission(status === 'granted');
    } catch (error) {
      setAudioPermission(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsCheckingPermissions(true);
    
    try {
      if (!cameraPermission?.granted) {
        const cameraResult = await requestCameraPermission();
        if (!cameraResult.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Nadar needs camera access to analyze your surroundings.',
            [{ text: 'OK' }]
          );
          setIsCheckingPermissions(false);
          return;
        }
      }

      if (!audioPermission) {
        const audioResult = await Audio.requestPermissionsAsync();
        if (audioResult.status !== 'granted') {
          Alert.alert(
            'Audio Permission Required',
            'Nadar needs microphone access for voice input.',
            [{ text: 'OK' }]
          );
          setIsCheckingPermissions(false);
          return;
        }
        setAudioPermission(true);
      }

      navigation.navigate('Capture');
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const allPermissionsGranted = cameraPermission?.granted && audioPermission;
  const canProceed = allPermissionsGranted && (isConnected || __DEV__); // Allow dev mode bypass

  // Rotation interpolation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Shimmer translation
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {/* Animated gradient background */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [{
                rotate: gradientAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['#0F172A', '#1E293B', '#334155', '#1E293B', '#0F172A']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Floating orbs for depth - much more subtle */}
        <Animated.View
          style={[
            styles.orb,
            styles.orb1,
            {
              transform: [
                { translateY: Animated.multiply(floatAnim, 0.3) }, // Much more subtle movement
                { scale: Animated.add(1, Animated.multiply(Animated.subtract(pulseAnim, 1), 0.2)) } // Very subtle scaling
              ],
            }
          ]}
        />
        <Animated.View
          style={[
            styles.orb,
            styles.orb2,
            {
              transform: [
                { translateY: Animated.multiply(floatAnim, -0.2) }, // Even more subtle counter-movement
                { scale: Animated.add(1, Animated.multiply(Animated.subtract(pulseAnim, 1), 0.1)) } // Barely perceptible scaling
              ],
            }
          ]}
        />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Hero Section with Premium Logo */}
            <Animated.View
              style={[
                styles.heroSection,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: floatAnim }
                  ]
                }
              ]}
            >
              {/* Logo with multiple layers */}
              <View style={styles.logoContainer}>
                {/* Outer glow ring */}
                <Animated.View
                  style={[
                    styles.logoGlowOuter,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.15],
                        outputRange: [0.3, 0.1],
                      })
                    }
                  ]}
                />
                
                {/* Middle glow ring */}
                <Animated.View
                  style={[
                    styles.logoGlowMiddle,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.15],
                        outputRange: [0.5, 0.2],
                      })
                    }
                  ]}
                />

                {/* Main logo */}
                <Animated.View
                  style={[
                    styles.logoMain,
                    {
                      transform: [
                        { rotate: spin },
                        { scale: pulseAnim }
                      ]
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#60A5FA', '#3B82F6', '#2563EB']}
                    style={styles.logoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.logoEmoji}>👁️</Text>
                    
                    {/* Shimmer effect */}
                    <Animated.View
                      style={[
                        styles.shimmer,
                        {
                          transform: [{ translateX: shimmerTranslate }]
                        }
                      ]}
                    />
                  </LinearGradient>
                </Animated.View>
              </View>

              {/* App Title with gradient text effect */}
              <View style={styles.titleContainer}>
                <Text style={styles.appTitleArabic}>نَظَر</Text>
                <Text style={styles.appSubtitle}>NADAR AI</Text>
                <Text style={styles.tagline}>Your AI Vision Companion</Text>
              </View>

              {/* Live connection status */}
              <Animated.View
                style={[
                  styles.statusBadge,
                  {
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                <View style={styles.statusBlur}>
                  <View style={styles.statusContent}>
                    <Animated.View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isConnected ? '#10B981' : '#EF4444',
                          transform: [{ scale: pulseAnim }]
                        }
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {isConnected === null ? 'Connecting...' :
                       isConnected ? 'System Ready' : __DEV__ ? 'Dev Mode' : 'Offline Mode'}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Premium Feature Cards */}
            <View style={styles.cardsContainer}>
              {/* Card 1 - Visual Intelligence */}
              <Animated.View
                style={[
                  { transform: [{ translateX: card1Anim }] }
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.02)']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                          <LinearGradient
                            colors={['#60A5FA', '#3B82F6']}
                            style={styles.cardIconGradient}
                          >
                            <Text style={styles.cardIcon}>🎯</Text>
                          </LinearGradient>
                        </View>
                        <View style={styles.cardBadge}>
                          <Text style={styles.cardBadgeText}>AI POWERED</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.cardTitle}>Visual Intelligence</Text>
                      <Text style={styles.cardDescription}>
                        Advanced neural networks analyze your environment in real-time, 
                        identifying objects, text, and context with unprecedented accuracy.
                      </Text>
                      
                      <View style={styles.cardStats}>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>95%</Text>
                          <Text style={styles.statLabel}>Accuracy</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>&lt;2s</Text>
                          <Text style={styles.statLabel}>Response</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Card 2 - Darija Voice */}
              <Animated.View
                style={[
                  { transform: [{ translateX: card2Anim }] }
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.05)', 'rgba(168, 85, 247, 0.02)']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                          <LinearGradient
                            colors={['#C084FC', '#A855F7']}
                            style={styles.cardIconGradient}
                          >
                            <Text style={styles.cardIcon}>🗣️</Text>
                          </LinearGradient>
                        </View>
                        <View style={[styles.cardBadge, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                          <Text style={styles.cardBadgeText}>DARIJA NATIVE</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.cardTitle}>Natural Voice</Text>
                      <Text style={styles.cardDescription}>
                        Speak naturally in Moroccan Darija. Our AI understands context, 
                        dialects, and responds in clear, natural language.
                      </Text>
                      
                      <View style={styles.cardStats}>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>100%</Text>
                          <Text style={styles.statLabel}>Darija</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>Natural</Text>
                          <Text style={styles.statLabel}>Speech</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Card 3 - Safety First */}
              <Animated.View
                style={[
                  { transform: [{ translateX: card3Anim }] }
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <View style={styles.featureCard}>
                    <LinearGradient
                      colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)', 'rgba(34, 197, 94, 0.02)']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                          <LinearGradient
                            colors={['#4ADE80', '#22C55E']}
                            style={styles.cardIconGradient}
                          >
                            <Text style={styles.cardIcon}>🛡️</Text>
                          </LinearGradient>
                        </View>
                        <View style={[styles.cardBadge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                          <Text style={styles.cardBadgeText}>SAFETY FIRST</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.cardTitle}>Hazard Detection</Text>
                      <Text style={styles.cardDescription}>
                        Instant alerts for obstacles, hazards, and navigation guidance. 
                        Your safety is our primary concern.
                      </Text>
                      
                      <View style={styles.cardStats}>
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>24/7</Text>
                          <Text style={styles.statLabel}>Active</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                          <Text style={styles.statValue}>Instant</Text>
                          <Text style={styles.statLabel}>Alerts</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Permissions Status - Minimalist */}
            {!allPermissionsGranted && (
              <View style={styles.permissionsContainer}>
                <Text style={styles.permissionsTitle}>Quick Setup</Text>
                <View style={styles.permissionItems}>
                  <View style={styles.permissionItem}>
                    <View style={[
                      styles.permissionIcon,
                      { backgroundColor: cameraPermission?.granted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
                    ]}>
                      <Text>{cameraPermission?.granted ? '✓' : '📷'}</Text>
                    </View>
                    <Text style={styles.permissionText}>Camera</Text>
                  </View>
                  
                  <View style={styles.permissionItem}>
                    <View style={[
                      styles.permissionIcon,
                      { backgroundColor: audioPermission ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
                    ]}>
                      <Text>{audioPermission ? '✓' : '🎤'}</Text>
                    </View>
                    <Text style={styles.permissionText}>Microphone</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Premium CTA Button */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (canProceed) {
                  navigation.navigate('Capture');
                } else {
                  requestAllPermissions();
                }
              }}
              disabled={isCheckingPermissions}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={canProceed ? 
                  ['#3B82F6', '#2563EB', '#1E40AF'] : 
                  ['#64748B', '#475569', '#334155']
                }
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isCheckingPermissions ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>
                      {canProceed ? 'Start Experience' : 
                       allPermissionsGranted ? 'Connecting...' : 'Enable Access'}
                    </Text>
                    <Text style={styles.ctaArrow}>→</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Floating orbs
  orb: {
    position: 'absolute',
    borderRadius: 1000,
  },
  orb1: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    top: -100,
    left: -100,
  },
  orb2: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    bottom: -50,
    right: -50,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoGlowOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  logoGlowMiddle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  logoMain: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 50,
    zIndex: 2,
  },
  shimmer: {
    position: 'absolute',
    width: 40,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },

  // Title Section
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitleArabic: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 5,
    textShadowColor: 'rgba(59, 130, 246, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  appSubtitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 4,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  // Status Badge
  statusBadge: {
    marginTop: 20,
  },
  statusBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },

  // Cards Container
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Feature Cards
  featureCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardGradient: {
    padding: 24,
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 20,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },

  // Permissions
  permissionsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionItems: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  permissionItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // CTA Section
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  ctaButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  ctaArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});