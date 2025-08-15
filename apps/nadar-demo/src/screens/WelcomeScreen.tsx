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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { theme, createTextStyle, componentStyles } from '../theme';
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
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkConnectionStatus();
    checkAudioPermissions();

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.duration.slow,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.duration.slow,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...theme.animation.spring.gentle,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation for connection status
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('🔍 Testing connection to API server...');
      const result = await testConnection();
      console.log('📡 Connection test result:', result);
      setIsConnected(result);
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      setIsConnected(false);
    }
  };

  const checkAudioPermissions = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      setAudioPermission(status === 'granted');
    } catch (error) {
      console.error('Audio permission check failed:', error);
      setAudioPermission(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsCheckingPermissions(true);
    
    try {
      // Request camera permission
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

      // Request audio permission
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

      // All permissions granted, navigate to capture screen
      navigation.navigate('Capture');
    } catch (error) {
      console.error('Permission request failed:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const allPermissionsGranted = cameraPermission?.granted && audioPermission;

  // Debug mode: Allow bypassing connection check for UI testing
  const debugMode = __DEV__ && true; // TEMPORARY: Set to true to test UI while debugging connection
  const canProceed = allPermissionsGranted && (isConnected || debugMode);

  // TEMPORARY: Force navigation to work for UI testing
  const forceNavigation = __DEV__ && true;
  const actualCanProceed = forceNavigation || canProceed;

  // Debug logging
  console.log('🔍 Navigation Debug:', {
    cameraGranted: cameraPermission?.granted,
    audioPermission,
    allPermissionsGranted,
    isConnected,
    debugMode,
    canProceed,
    actualCanProceed,
    forceNavigation
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
      <LinearGradient
        colors={theme.gradients.background.colors}
        style={styles.container}
        start={theme.gradients.background.start}
        end={theme.gradients.background.end}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Main Content Area */}
          <View style={styles.mainContent}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <Animated.View
                style={[
                  styles.content,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim }
                    ]
                  }
                ]}
              >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              {/* App Icon with Glow Effect */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <LinearGradient
                  colors={theme.gradients.primary.colors}
                  style={styles.iconGradient}
                  start={theme.gradients.primary.start}
                  end={theme.gradients.primary.end}
                >
                  <Text style={styles.appIcon}>👁️</Text>
                </LinearGradient>
              </Animated.View>

              {/* App Title */}
              <Text style={styles.appTitle}>نظر</Text>
              <Text style={styles.appSubtitle}>Nadar AI Assistant</Text>

              {/* Connection Status */}
              <View style={styles.statusContainer}>
                <Animated.View
                  style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: isConnected ? theme.colors.success : theme.colors.error,
                      transform: [{ scale: pulseAnim }]
                    }
                  ]}
                />
                <Text style={styles.statusText}>
                  {isConnected === null ? 'Checking connection...' :
                   isConnected ? 'Connected' : 'Connection failed'}
                </Text>
              </View>
            </View>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>📷</Text>
                </View>
                <Text style={styles.featureTitle}>Visual Analysis</Text>
                <Text style={styles.featureDescription}>
                  Advanced AI vision to understand your surroundings
                </Text>
              </View>

              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🎤</Text>
                </View>
                <Text style={styles.featureTitle}>Voice Input</Text>
                <Text style={styles.featureDescription}>
                  Speak naturally in Moroccan Darija
                </Text>
              </View>

              <View style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🔊</Text>
                </View>
                <Text style={styles.featureTitle}>Audio Response</Text>
                <Text style={styles.featureDescription}>
                  Clear, natural voice responses
                </Text>
              </View>
            </View>

            {/* Permissions Card */}
            <View style={styles.permissionsCard}>
              <Text style={styles.permissionsTitle}>Setup Required</Text>

              <View style={styles.permissionsList}>
                <View style={styles.permissionItem}>
                  <View style={[
                    styles.permissionStatus,
                    { backgroundColor: cameraPermission?.granted ? theme.colors.success : theme.colors.error }
                  ]}>
                    <Text style={styles.permissionStatusIcon}>
                      {cameraPermission?.granted ? '✓' : '!'}
                    </Text>
                  </View>
                  <View style={styles.permissionContent}>
                    <Text style={styles.permissionTitle}>Camera Access</Text>
                    <Text style={styles.permissionDescription}>
                      Required to analyze your surroundings
                    </Text>
                  </View>
                </View>

                <View style={styles.permissionItem}>
                  <View style={[
                    styles.permissionStatus,
                    { backgroundColor: audioPermission ? theme.colors.success : theme.colors.error }
                  ]}>
                    <Text style={styles.permissionStatusIcon}>
                      {audioPermission ? '✓' : '!'}
                    </Text>
                  </View>
                  <View style={styles.permissionContent}>
                    <Text style={styles.permissionTitle}>Microphone Access</Text>
                    <Text style={styles.permissionDescription}>
                      Required for voice input and questions
                    </Text>
                  </View>
                </View>

                <View style={styles.permissionItem}>
                  <View style={[
                    styles.permissionStatus,
                    { backgroundColor: isConnected ? theme.colors.success : theme.colors.error }
                  ]}>
                    <Text style={styles.permissionStatusIcon}>
                      {isConnected ? '✓' : '!'}
                    </Text>
                  </View>
                  <View style={styles.permissionContent}>
                    <Text style={styles.permissionTitle}>Server Connection</Text>
                    <Text style={styles.permissionDescription}>
                      Connected to AI processing services
                    </Text>
                  </View>
                </View>
              </View>

              {/* Debug: Manual connection test button */}
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.debugButton}
                  onPress={checkConnectionStatus}
                >
                  <Text style={styles.debugButtonText}>🔄 Test Connection</Text>
                </TouchableOpacity>
              )}
            </View>

              </Animated.View>
            </ScrollView>
          </View>

          {/* Persistent Action Button */}
          <View style={styles.persistentButtonContainer}>
            <TouchableOpacity
              style={[
                styles.startButton,
                actualCanProceed && styles.startButtonEnabled
              ]}
              onPress={() => {
                console.log('🚀 Button pressed! Navigating to Capture...');
                if (actualCanProceed) {
                  navigation.navigate('Capture');
                } else {
                  requestAllPermissions();
                }
              }}
              disabled={isCheckingPermissions}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={actualCanProceed ?
                  theme.gradients.primary.colors :
                  [theme.colors.surfaceElevated, theme.colors.surfaceElevated]
                }
                style={styles.startButtonGradient}
                start={theme.gradients.primary.start}
                end={theme.gradients.primary.end}
              >
                {isCheckingPermissions ? (
                  <ActivityIndicator color={theme.colors.text} size="small" />
                ) : (
                  <Text style={styles.startButtonText}>
                    {actualCanProceed ? 'Start Using Nadar' :
                     allPermissionsGranted ? 'Checking Connection...' : 'Grant Permissions'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(2), // Reduced padding since button is persistent
  },
  content: {
    paddingTop: theme.spacing(1),
  },

  // Hero Section - More compact
  heroSection: {
    alignItems: 'center',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  iconContainer: {
    marginBottom: theme.spacing(3),
  },
  iconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.xl,
  },
  appIcon: {
    fontSize: 40,
  },
  appTitle: {
    ...createTextStyle('display'),
    textAlign: 'center',
    marginBottom: theme.spacing(1),
    color: theme.colors.text,
  },
  appSubtitle: {
    ...createTextStyle('subheading', theme.colors.textSecondary),
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing(1),
  },
  statusText: {
    ...createTextStyle('caption', theme.colors.textSecondary),
  },

  // Features Grid - More compact
  featuresGrid: {
    paddingVertical: theme.spacing(2),
  },
  featureCard: {
    ...componentStyles.card.glass,
    marginBottom: theme.spacing(2),
    alignItems: 'center',
    paddingVertical: theme.spacing(2.5),
    paddingHorizontal: theme.spacing(3),
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    ...theme.shadows.sm,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTitle: {
    ...createTextStyle('label'),
    marginBottom: theme.spacing(1),
    textAlign: 'center',
  },
  featureDescription: {
    ...createTextStyle('caption', theme.colors.textSecondary),
    textAlign: 'center',
    lineHeight: 18,
  },

  // Permissions Card - More compact
  permissionsCard: {
    ...componentStyles.card.elevated,
    marginBottom: theme.spacing(2),
    paddingVertical: theme.spacing(2.5),
    paddingHorizontal: theme.spacing(3),
  },
  permissionsTitle: {
    ...createTextStyle('subheading'),
    marginBottom: theme.spacing(2.5),
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  permissionsList: {
    // Using marginBottom instead of gap for React Native compatibility
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    paddingVertical: theme.spacing(0.5),
  },
  permissionStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  permissionStatusIcon: {
    ...createTextStyle('label', theme.colors.text),
    fontSize: 14,
    fontWeight: '700',
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    ...createTextStyle('body'),
    marginBottom: 2,
  },
  permissionDescription: {
    ...createTextStyle('caption', theme.colors.textSecondary),
    lineHeight: 16,
  },

  // Persistent Button Container
  persistentButtonContainer: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Start Button
  startButton: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  startButtonGradient: {
    ...componentStyles.button.primary,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  startButtonText: {
    ...createTextStyle('label', theme.colors.text),
    fontSize: 18,
    fontWeight: '700',
  },

  // Debug styles
  debugButton: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    marginTop: theme.spacing(2),
    alignSelf: 'center',
  },
  debugButtonText: {
    ...createTextStyle('caption', theme.colors.textInverse),
    fontWeight: '600',
  },
});
