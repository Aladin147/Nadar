import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';

type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Settings: undefined;
  Results: { response: any; sessionId: string };
};

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

// Custom icon components for settings
const VoiceIcon = () => (
  <View style={styles.settingIcon}>
    <View style={styles.voiceWave1} />
    <View style={styles.voiceWave2} />
    <View style={styles.voiceWave3} />
  </View>
);

const AccessibilityIcon = () => (
  <View style={styles.settingIcon}>
    <View style={styles.accessibilityCircle} />
    <View style={styles.accessibilityPerson} />
  </View>
);

const PrivacyIcon = () => (
  <View style={styles.settingIcon}>
    <View style={styles.privacyShield} />
    <View style={styles.privacyLock} />
  </View>
);

const GeneralIcon = () => (
  <View style={styles.settingIcon}>
    <View style={styles.generalGear} />
    <View style={styles.generalTooth1} />
    <View style={styles.generalTooth2} />
  </View>
);

const AboutIcon = () => (
  <View style={styles.settingIcon}>
    <View style={styles.aboutCircle} />
    <Text style={styles.aboutI}>i</Text>
  </View>
);

export default function SettingsScreen({ navigation }: Props) {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Settings state
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    hapticFeedback: true,
    autoSpeak: true,
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    dataCollection: false,
    crashReports: true,
    voiceSpeed: 1.0,
    voiceVolume: 0.8,
  });

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
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous subtle animations
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
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

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              voiceEnabled: true,
              hapticFeedback: true,
              autoSpeak: true,
              highContrast: false,
              largeText: false,
              reduceMotion: false,
              dataCollection: false,
              crashReports: true,
              voiceSpeed: 1.0,
              voiceVolume: 0.8,
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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

      {/* Background orbs */}
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

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
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
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
              style={styles.headerButtonGradient}
            >
              <Text style={styles.headerButtonText}>←</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Customize your experience</Text>
          </View>

          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Settings Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ]
            }
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Voice & Audio Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <VoiceIcon />
                <Text style={styles.sectionTitle}>Voice & Audio</Text>
              </View>

              <View style={styles.settingCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Voice Responses</Text>
                      <Text style={styles.settingDescription}>Enable spoken responses</Text>
                    </View>
                    <Switch
                      value={settings.voiceEnabled}
                      onValueChange={(value) => handleSettingChange('voiceEnabled', value)}
                      trackColor={{ false: '#374151', true: '#3B82F6' }}
                      thumbColor={settings.voiceEnabled ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.settingDivider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Auto-Speak Results</Text>
                      <Text style={styles.settingDescription}>Automatically read analysis results</Text>
                    </View>
                    <Switch
                      value={settings.autoSpeak}
                      onValueChange={(value) => handleSettingChange('autoSpeak', value)}
                      trackColor={{ false: '#374151', true: '#3B82F6' }}
                      thumbColor={settings.autoSpeak ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Accessibility Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AccessibilityIcon />
                <Text style={styles.sectionTitle}>Accessibility</Text>
              </View>

              <View style={styles.settingCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>High Contrast</Text>
                      <Text style={styles.settingDescription}>Increase visual contrast</Text>
                    </View>
                    <Switch
                      value={settings.highContrast}
                      onValueChange={(value) => handleSettingChange('highContrast', value)}
                      trackColor={{ false: '#374151', true: '#10B981' }}
                      thumbColor={settings.highContrast ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.settingDivider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Large Text</Text>
                      <Text style={styles.settingDescription}>Increase text size</Text>
                    </View>
                    <Switch
                      value={settings.largeText}
                      onValueChange={(value) => handleSettingChange('largeText', value)}
                      trackColor={{ false: '#374151', true: '#10B981' }}
                      thumbColor={settings.largeText ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.settingDivider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Reduce Motion</Text>
                      <Text style={styles.settingDescription}>Minimize animations</Text>
                    </View>
                    <Switch
                      value={settings.reduceMotion}
                      onValueChange={(value) => handleSettingChange('reduceMotion', value)}
                      trackColor={{ false: '#374151', true: '#10B981' }}
                      thumbColor={settings.reduceMotion ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* General Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <GeneralIcon />
                <Text style={styles.sectionTitle}>General</Text>
              </View>

              <View style={styles.settingCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Haptic Feedback</Text>
                      <Text style={styles.settingDescription}>Vibration for interactions</Text>
                    </View>
                    <Switch
                      value={settings.hapticFeedback}
                      onValueChange={(value) => handleSettingChange('hapticFeedback', value)}
                      trackColor={{ false: '#374151', true: '#8B5CF6' }}
                      thumbColor={settings.hapticFeedback ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Privacy Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <PrivacyIcon />
                <Text style={styles.sectionTitle}>Privacy & Data</Text>
              </View>

              <View style={styles.settingCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Data Collection</Text>
                      <Text style={styles.settingDescription}>Help improve the app</Text>
                    </View>
                    <Switch
                      value={settings.dataCollection}
                      onValueChange={(value) => handleSettingChange('dataCollection', value)}
                      trackColor={{ false: '#374151', true: '#EF4444' }}
                      thumbColor={settings.dataCollection ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>

                  <View style={styles.settingDivider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Crash Reports</Text>
                      <Text style={styles.settingDescription}>Send crash data to developers</Text>
                    </View>
                    <Switch
                      value={settings.crashReports}
                      onValueChange={(value) => handleSettingChange('crashReports', value)}
                      trackColor={{ false: '#374151', true: '#EF4444' }}
                      thumbColor={settings.crashReports ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* About Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AboutIcon />
                <Text style={styles.sectionTitle}>About</Text>
              </View>

              <View style={styles.settingCard}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                  style={styles.cardGradient}
                >
                  <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Version</Text>
                      <Text style={styles.settingDescription}>1.0.0 (Build 1)</Text>
                    </View>
                    <Text style={styles.settingArrow}>→</Text>
                  </TouchableOpacity>

                  <View style={styles.settingDivider} />

                  <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Privacy Policy</Text>
                      <Text style={styles.settingDescription}>View our privacy policy</Text>
                    </View>
                    <Text style={styles.settingArrow}>→</Text>
                  </TouchableOpacity>

                  <View style={styles.settingDivider} />

                  <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingLabel}>Terms of Service</Text>
                      <Text style={styles.settingDescription}>View terms and conditions</Text>
                    </View>
                    <Text style={styles.settingArrow}>→</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>

            {/* Reset Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetSettings}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
                  style={styles.resetGradient}
                >
                  <Text style={styles.resetText}>Reset All Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
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

  // Background elements
  backgroundOrb: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    top: height / 2 - 250,
    left: width / 2 - 250,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 14, 39, 0.5)',
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
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },

  // Setting Cards
  settingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardGradient: {
    padding: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 16,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
  },
  settingArrow: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },

  // Reset Button
  resetButton: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  resetGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Custom icon styles
  settingIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Voice icon
  voiceWave1: {
    position: 'absolute',
    width: 3,
    height: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    left: 6,
  },
  voiceWave2: {
    position: 'absolute',
    width: 3,
    height: 18,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    left: 10.5,
  },
  voiceWave3: {
    position: 'absolute',
    width: 3,
    height: 14,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    left: 15,
  },

  // Accessibility icon
  accessibilityCircle: {
    width: 20,
    height: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 10,
  },
  accessibilityPerson: {
    position: 'absolute',
    width: 8,
    height: 12,
    backgroundColor: '#10B981',
    borderRadius: 2,
    top: 4,
  },

  // Privacy icon
  privacyShield: {
    width: 16,
    height: 18,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 2,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  privacyLock: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#EF4444',
    borderRadius: 1,
    top: 6,
  },

  // General icon
  generalGear: {
    width: 18,
    height: 18,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 9,
  },
  generalTooth1: {
    position: 'absolute',
    width: 4,
    height: 2,
    backgroundColor: '#8B5CF6',
    top: -1,
    left: 10,
  },
  generalTooth2: {
    position: 'absolute',
    width: 2,
    height: 4,
    backgroundColor: '#8B5CF6',
    left: -1,
    top: 10,
  },

  // About icon
  aboutCircle: {
    width: 20,
    height: 20,
    backgroundColor: '#64748B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutI: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
