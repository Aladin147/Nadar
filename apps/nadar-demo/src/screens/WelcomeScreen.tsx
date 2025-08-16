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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { theme } from '../theme';
import { testConnection } from '../api/client';

type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Settings: undefined;
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

  // Animation values - subtle and premium
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Aurora effect animations
  const aurora1Anim = useRef(new Animated.Value(0)).current;
  const aurora2Anim = useRef(new Animated.Value(0)).current;
  const aurora3Anim = useRef(new Animated.Value(0)).current;
  
  // Card animations
  const card1Anim = useRef(new Animated.Value(30)).current;
  const card2Anim = useRef(new Animated.Value(30)).current;
  const card3Anim = useRef(new Animated.Value(30)).current;

  // Floating particles
  const particle1Anim = useRef(new Animated.Value(0)).current;
  const particle2Anim = useRef(new Animated.Value(0)).current;
  const particle3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkConnectionStatus();
    checkAudioPermissions();

    // Smooth entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Cards fade in after logo
      Animated.stagger(200, [
        Animated.parallel([
          Animated.timing(card1Anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(card2Anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(card3Anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Very subtle pulse for logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Aurora animations - very slow and subtle
    const aurora1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(aurora1Anim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(aurora1Anim, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const aurora2Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(aurora2Anim, {
          toValue: 1,
          duration: 20000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(aurora2Anim, {
          toValue: 0,
          duration: 20000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const aurora3Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(aurora3Anim, {
          toValue: 1,
          duration: 25000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(aurora3Anim, {
          toValue: 0,
          duration: 25000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    aurora1Animation.start();
    aurora2Animation.start();
    aurora3Animation.start();

    // Floating particles animations
    const particle1Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(particle1Anim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(particle1Anim, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const particle2Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(particle2Anim, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(particle2Anim, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const particle3Animation = Animated.loop(
      Animated.sequence([
        Animated.timing(particle3Anim, {
          toValue: 1,
          duration: 22000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(particle3Anim, {
          toValue: 0,
          duration: 22000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    particle1Animation.start();
    particle2Animation.start();
    particle3Animation.start();

    return () => {
      pulseAnimation.stop();
      aurora1Animation.stop();
      aurora2Animation.stop();
      aurora3Animation.stop();
      particle1Animation.stop();
      particle2Animation.stop();
      particle3Animation.stop();
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
  const canProceed = allPermissionsGranted && (isConnected || __DEV__);

  // Clean Visual Intelligence icon - simplified and readable
  const VisionIcon = () => (
    <View style={styles.iconSvg}>
      {/* Main eye structure */}
      <View style={styles.eyeContainer}>
        <View style={styles.eyeOuter} />
        <View style={styles.eyeIris} />
        <View style={styles.eyePupil}>
          <View style={styles.aiSpark} />
        </View>
      </View>

      {/* Simple AI indicators */}
      <View style={styles.aiIndicator1} />
      <View style={styles.aiIndicator2} />
      <View style={styles.aiIndicator3} />
    </View>
  );

  const VoiceIcon = () => (
    <View style={styles.iconSvg}>
      <View style={styles.iconWave1} />
      <View style={styles.iconWave2} />
      <View style={styles.iconWave3} />
    </View>
  );

  const ShieldIcon = () => (
    <View style={styles.iconSvg}>
      <View style={styles.iconShield} />
      <View style={styles.iconCheck} />
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {/* Deep gradient background */}
        <LinearGradient
          colors={['#0A0E27', '#1A1F3A', '#0D1117']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Enhanced spotlight from above effect - tighter cone with smoother gradient */}
        <View style={styles.spotlightContainer}>
          {/* Outermost soft glow */}
          <View style={styles.spotlightOuter1}>
            <LinearGradient
              colors={[
                'rgba(59, 130, 246, 0.22)',
                'rgba(59, 130, 246, 0.16)',
                'rgba(59, 130, 246, 0.11)',
                'rgba(59, 130, 246, 0.07)',
                'rgba(59, 130, 246, 0.04)',
                'rgba(59, 130, 246, 0.02)',
                'rgba(59, 130, 246, 0.01)',
                'transparent'
              ]}
              style={styles.spotlightGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* Second outer layer */}
          <View style={styles.spotlightOuter2}>
            <LinearGradient
              colors={[
                'rgba(56, 189, 248, 0.18)',
                'rgba(56, 189, 248, 0.13)',
                'rgba(56, 189, 248, 0.09)',
                'rgba(56, 189, 248, 0.06)',
                'rgba(56, 189, 248, 0.03)',
                'rgba(56, 189, 248, 0.015)',
                'transparent'
              ]}
              style={styles.spotlightGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* First middle layer */}
          <View style={styles.spotlightMiddle1}>
            <LinearGradient
              colors={[
                'rgba(139, 92, 246, 0.15)',
                'rgba(139, 92, 246, 0.11)',
                'rgba(139, 92, 246, 0.07)',
                'rgba(139, 92, 246, 0.04)',
                'rgba(139, 92, 246, 0.02)',
                'rgba(139, 92, 246, 0.01)',
                'transparent'
              ]}
              style={styles.spotlightGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* Second middle layer */}
          <View style={styles.spotlightMiddle2}>
            <LinearGradient
              colors={[
                'rgba(99, 102, 241, 0.12)',
                'rgba(99, 102, 241, 0.08)',
                'rgba(99, 102, 241, 0.05)',
                'rgba(99, 102, 241, 0.03)',
                'rgba(99, 102, 241, 0.015)',
                'transparent'
              ]}
              style={styles.spotlightGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* First inner layer */}
          <View style={styles.spotlightInner1}>
            <LinearGradient
              colors={[
                'rgba(168, 85, 247, 0.10)',
                'rgba(168, 85, 247, 0.07)',
                'rgba(168, 85, 247, 0.04)',
                'rgba(168, 85, 247, 0.02)',
                'rgba(168, 85, 247, 0.01)',
                'transparent'
              ]}
              style={styles.spotlightGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* Innermost bright core */}
          <View style={styles.spotlightInner2}>
            <LinearGradient
              colors={[
                'rgba(147, 51, 234, 0.08)',
                'rgba(147, 51, 234, 0.05)',
                'rgba(147, 51, 234, 0.03)',
                'rgba(147, 51, 234, 0.015)',
                'rgba(147, 51, 234, 0.005)',
                'transparent'
              ]}
              style={styles.spotlightGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>

          {/* Soft edge blending - left */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(10, 14, 39, 0.3)',
              'rgba(10, 14, 39, 0.7)',
              'rgba(10, 14, 39, 1)'
            ]}
            style={styles.spotlightBlendLeft}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
          />

          {/* Soft edge blending - right */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(10, 14, 39, 0.3)',
              'rgba(10, 14, 39, 0.7)',
              'rgba(10, 14, 39, 1)'
            ]}
            style={styles.spotlightBlendRight}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </View>

        {/* Aurora effect layers */}
        <Animated.View
          style={[
            styles.aurora,
            styles.aurora1,
            {
              opacity: aurora1Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.05, 0.12],
              }),
              transform: [
                {
                  translateY: aurora1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(56, 189, 248, 0)', 'rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.aurora,
            styles.aurora2,
            {
              opacity: aurora2Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.04, 0.09],
              }),
              transform: [
                {
                  translateX: aurora2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 30],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0)', 'rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.aurora,
            styles.aurora3,
            {
              opacity: aurora3Anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.03, 0.07],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.8, y: 0 }}
            end={{ x: 0.2, y: 1 }}
          />
        </Animated.View>

        {/* Floating particles for subtle ambiance */}
        <Animated.View
          style={[
            styles.particle,
            styles.particle1,
            {
              opacity: particle1Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.3, 0],
              }),
              transform: [
                {
                  translateY: particle1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, -100],
                  }),
                },
                {
                  translateX: particle1Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 20, 0],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.particle,
            styles.particle2,
            {
              opacity: particle2Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.2, 0],
              }),
              transform: [
                {
                  translateY: particle2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, -100],
                  }),
                },
                {
                  translateX: particle2Anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -15, 0],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.particle,
            styles.particle3,
            {
              opacity: particle3Anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.25, 0],
              }),
              transform: [
                {
                  translateY: particle3Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, -100],
                  }),
                },
              ],
            },
          ]}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Settings Button */}
          <Animated.View
            style={[
              styles.settingsButton,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButtonTouch}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.settingsButtonGradient}
              >
                <View style={styles.settingsIcon}>
                  <View style={styles.settingsGear} />
                  <View style={styles.settingsTooth1} />
                  <View style={styles.settingsTooth2} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Hero Section */}
            <Animated.View
              style={[
                styles.heroSection,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Logo Container */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                {/* Subtle glow behind logo */}
                <Animated.View
                  style={[
                    styles.logoGlow,
                    {
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.05],
                        outputRange: [0.2, 0.3],
                      }),
                    },
                  ]}
                />
                
                {/* Your actual logo */}
                <Image
                  source={require('../../assets/welcome_screen.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* App Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.appTitle}>نَظَر</Text>
                <Text style={styles.appSubtitle}>NADAR AI</Text>
                <View style={styles.taglineContainer}>
                  <View style={styles.taglineLine} />
                  <Text style={styles.tagline}>Your AI Vision Companion</Text>
                  <View style={styles.taglineLine} />
                </View>
              </View>

              {/* Status Indicator */}
              <View style={styles.statusContainer}>
                <Animated.View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isConnected ? '#10B981' : '#EF4444',
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isConnected === null
                    ? 'Initializing...'
                    : isConnected
                    ? 'System Online'
                    : __DEV__
                    ? 'Development Mode'
                    : 'Offline Mode'}
                </Text>
              </View>
            </Animated.View>

            {/* Feature Cards */}
            <View style={styles.cardsContainer}>
              {/* Visual Intelligence Card */}
              <Animated.View
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: card1Anim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIcon}>
                      <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        style={styles.cardIconGradient}
                      >
                        <VisionIcon />
                      </LinearGradient>
                    </View>
                    <View style={styles.cardTextContent}>
                      <Text style={styles.cardTitle}>Visual Intelligence</Text>
                      <Text style={styles.cardDescription}>
                        Advanced neural networks analyze your environment with 95% accuracy
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Voice Interaction Card */}
              <Animated.View
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: card2Anim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIcon}>
                      <LinearGradient
                        colors={['#8B5CF6', '#7C3AED']}
                        style={styles.cardIconGradient}
                      >
                        <VoiceIcon />
                      </LinearGradient>
                    </View>
                    <View style={styles.cardTextContent}>
                      <Text style={styles.cardTitle}>Natural Voice</Text>
                      <Text style={styles.cardDescription}>
                        Speak naturally in Darija, get instant responses
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* Safety Features Card */}
              <Animated.View
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: card3Anim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIcon}>
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.cardIconGradient}
                      >
                        <ShieldIcon />
                      </LinearGradient>
                    </View>
                    <View style={styles.cardTextContent}>
                      <Text style={styles.cardTitle}>Safety First</Text>
                      <Text style={styles.cardDescription}>
                        Real-time hazard detection and navigation guidance
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Permissions Section - Only show if needed */}
            {!allPermissionsGranted && (
              <Animated.View 
                style={[
                  styles.permissionsSection,
                  { opacity: fadeAnim }
                ]}
              >
                <View style={styles.permissionRow}>
                  <View style={styles.permissionItem}>
                    <View
                      style={[
                        styles.permissionDot,
                        {
                          backgroundColor: cameraPermission?.granted
                            ? '#10B981'
                            : '#475569',
                        },
                      ]}
                    />
                    <Text style={styles.permissionText}>Camera</Text>
                  </View>
                  <View style={styles.permissionDivider} />
                  <View style={styles.permissionItem}>
                    <View
                      style={[
                        styles.permissionDot,
                        {
                          backgroundColor: audioPermission ? '#10B981' : '#475569',
                        },
                      ]}
                    />
                    <Text style={styles.permissionText}>Microphone</Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* CTA Button */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                if (canProceed) {
                  navigation.navigate('Capture');
                } else {
                  requestAllPermissions();
                }
              }}
              disabled={isCheckingPermissions}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  canProceed
                    ? ['#3B82F6', '#2563EB']
                    : ['#475569', '#334155']
                }
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isCheckingPermissions ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.ctaContent}>
                    <Text style={styles.ctaText}>
                      {canProceed
                        ? 'Begin Experience'
                        : allPermissionsGranted
                        ? 'Connecting...'
                        : 'Setup Nadar'}
                    </Text>
                    {canProceed && (
                      <View style={styles.ctaArrow}>
                        <View style={styles.arrowLine} />
                        <View style={styles.arrowHead} />
                      </View>
                    )}
                  </View>
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
    backgroundColor: '#0A0E27',
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

  // Aurora Effects
  aurora: {
    position: 'absolute',
    width: width * 2,
    height: height * 0.8,
  },
  aurora1: {
    top: -100,
    left: -width * 0.5,
  },
  aurora2: {
    top: height * 0.2,
    left: -width * 0.3,
  },
  aurora3: {
    bottom: -100,
    right: -width * 0.4,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3B82F6',
  },
  logo: {
    width: 120,
    height: 120,
  },

  // Title Section
  titleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 3,
    marginBottom: 15,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taglineLine: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
    marginHorizontal: 12,
  },
  tagline: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },

  // Status Section
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Cards
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  featureCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardGradient: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  cardIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  // Enhanced icon designs
  iconSvg: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Clean Visual Intelligence icon styles - properly centered
  eyeContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eyeOuter: {
    width: 18,
    height: 11,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  eyeIris: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    opacity: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  eyePupil: {
    width: 4,
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  aiSpark: {
    width: 1.5,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 0.75,
    alignSelf: 'center',
  },

  // Simple AI indicators around the eye
  aiIndicator1: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    top: 2,
    left: 2,
    opacity: 0.8,
  },
  aiIndicator2: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 1.5,
    top: 2,
    right: 2,
    opacity: 0.8,
  },
  aiIndicator3: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#10B981',
    borderRadius: 1.5,
    bottom: 2,
    left: 10.5,
    opacity: 0.8,
  },

  // Floating particles
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  particle1: {
    left: width * 0.2,
  },
  particle2: {
    left: width * 0.7,
    backgroundColor: '#8B5CF6',
  },
  particle3: {
    left: width * 0.5,
    backgroundColor: '#10B981',
  },

  // Spotlight from above effect
  spotlightContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  // Shared gradient style
  spotlightGradient: {
    width: '100%',
    height: '100%',
  },
  // Enhanced spotlight layers with tighter cone and smoother gradients
  spotlightOuter1: {
    position: 'absolute',
    top: -height * 0.25,
    left: width * 0.12,
    width: width * 0.76,
    height: height * 1.2,
    borderRadius: width * 0.38,
    overflow: 'hidden',
  },
  spotlightOuter2: {
    position: 'absolute',
    top: -height * 0.22,
    left: width * 0.16,
    width: width * 0.68,
    height: height * 1.0,
    borderRadius: width * 0.34,
    overflow: 'hidden',
  },
  spotlightMiddle1: {
    position: 'absolute',
    top: -height * 0.18,
    left: width * 0.20,
    width: width * 0.60,
    height: height * 0.85,
    borderRadius: width * 0.30,
    overflow: 'hidden',
  },
  spotlightMiddle2: {
    position: 'absolute',
    top: -height * 0.15,
    left: width * 0.24,
    width: width * 0.52,
    height: height * 0.72,
    borderRadius: width * 0.26,
    overflow: 'hidden',
  },
  spotlightInner1: {
    position: 'absolute',
    top: -height * 0.12,
    left: width * 0.28,
    width: width * 0.44,
    height: height * 0.60,
    borderRadius: width * 0.22,
    overflow: 'hidden',
  },
  spotlightInner2: {
    position: 'absolute',
    top: -height * 0.08,
    left: width * 0.32,
    width: width * 0.36,
    height: height * 0.48,
    borderRadius: width * 0.18,
    overflow: 'hidden',
  },
  // Soft edge blending
  spotlightBlendLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.3,
    height: height,
  },
  spotlightBlendRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width * 0.3,
    height: height,
  },
  iconWave1: {
    position: 'absolute',
    width: 4,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    left: 4,
  },
  iconWave2: {
    position: 'absolute',
    width: 4,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  iconWave3: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    right: 4,
  },
  iconShield: {
    width: 20,
    height: 22,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  iconCheck: {
    position: 'absolute',
    width: 8,
    height: 4,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
    top: 8,
  },

  // Permissions
  permissionsSection: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  permissionText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  permissionDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },

  // CTA Button
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
    backgroundColor: 'rgba(10, 14, 39, 0.95)',
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ctaArrow: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowLine: {
    width: 16,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  arrowHead: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginLeft: -5,
  },

  // Settings button
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  settingsButtonTouch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  settingsIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsGear: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 8,
  },
  settingsTooth1: {
    position: 'absolute',
    width: 3,
    height: 2,
    backgroundColor: '#FFFFFF',
    top: -1,
    left: 8.5,
  },
  settingsTooth2: {
    position: 'absolute',
    width: 2,
    height: 3,
    backgroundColor: '#FFFFFF',
    left: -1,
    top: 8.5,
  },
});