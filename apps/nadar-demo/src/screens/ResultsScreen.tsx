import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../theme';
import { tts, assistWithImageRef, assistVoiceFollowup, clearSessionMemory } from '../api/client';
import { AudioPlayer, AudioPlayerRef } from '../utils/audioPlayer';
import { audioRecorder } from '../utils/audioRecording';
import { CompactCostDisplay, CostTracker } from '../components/CostTracker';

type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Results: { response: any; sessionId: string };
};

type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

interface Props {
  navigation: ResultsScreenNavigationProp;
  route: ResultsScreenRouteProp;
}

const { width, height } = Dimensions.get('window');

export default function ResultsScreen({ navigation, route }: Props) {
  const { response, sessionId } = route.params;
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [isRecordingFollowup, setIsRecordingFollowup] = useState(false);
  const [isProcessingFollowup, setIsProcessingFollowup] = useState(false);
  const [showCostTracker, setShowCostTracker] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const audioRef = useRef<AudioPlayerRef['current']>(null);
  const audioPlayer = useRef(new AudioPlayer({ current: null }));

  // Animation values - much slower and subtler
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  // Individual element animations
  const responseCardAnim = useRef(new Animated.Value(50)).current;
  const followupCardAnim = useRef(new Animated.Value(50)).current;
  const chip1Anim = useRef(new Animated.Value(20)).current;
  const chip2Anim = useRef(new Animated.Value(20)).current;
  const chip3Anim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Initialize audio player
    audioPlayer.current.initialize();

    // Entrance animations - very gentle
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 20,
        useNativeDriver: true,
      }),
      Animated.timing(responseCardAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Follow-up card slides in after main card
      Animated.parallel([
        Animated.timing(followupCardAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Stagger chip animations
        Animated.stagger(100, [
          Animated.spring(chip1Anim, {
            toValue: 0,
            friction: 10,
            tension: 30,
            useNativeDriver: true,
          }),
          Animated.spring(chip2Anim, {
            toValue: 0,
            friction: 10,
            tension: 30,
            useNativeDriver: true,
          }),
          Animated.spring(chip3Anim, {
            toValue: 0,
            friction: 10,
            tension: 30,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Very subtle continuous animations
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
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

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    floatAnimation.start();
    pulseAnimation.start();
    shimmerAnimation.start();

    // Auto-play TTS for the main response
    if (response?.speak) {
      playTTS(response.speak);
    }

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [response]);

  const playTTS = async (text: string) => {
    if (!text.trim()) return;

    try {
      setIsPlayingTTS(true);
      await audioPlayer.current.initialize();
      const ttsResult = await tts(text, 'Kore', 'elevenlabs');
      await audioPlayer.current.playAudio(ttsResult.audioBase64, ttsResult.mimeType);
    } catch (error) {
      console.error('TTS playback failed:', error);
    } finally {
      setIsPlayingTTS(false);
    }
  };

  const handleFollowupChip = async (question: string, index: number) => {
    setSelectedChip(index);
    try {
      setIsProcessingFollowup(true);
      const imageRef = response.followupToken || 'last';
      const followupResult = await assistWithImageRef(
        imageRef,
        question,
        { language: 'darija', verbosity: 'brief' },
        sessionId
      );

      if (followupResult.speak) {
        await playTTS(followupResult.speak);
      }

      Alert.alert('Follow-up Response', followupResult.speak || 'Response received');
    } catch (error) {
      Alert.alert('Error', 'Failed to process follow-up question.');
    } finally {
      setIsProcessingFollowup(false);
      setSelectedChip(null);
    }
  };

  const handleTextFollowup = async () => {
    if (!followupText.trim()) return;
    
    await handleFollowupChip(followupText, -1);
    setFollowupText('');
  };

  const startVoiceFollowup = async () => {
    try {
      setIsRecordingFollowup(true);
      await audioRecorder.startRecording();
    } catch (error) {
      setIsRecordingFollowup(false);
      Alert.alert('Error', 'Failed to start audio recording.');
    }
  };

  const stopVoiceFollowup = async () => {
    try {
      const audioUri = await audioRecorder.stopRecording();
      setIsRecordingFollowup(false);

      if (audioUri) {
        setIsProcessingFollowup(true);
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        const imageRef = response.followupToken || 'last';
        const followupResult = await assistVoiceFollowup(
          imageRef,
          audioBase64,
          'audio/wav',
          { language: 'darija', verbosity: 'brief' },
          sessionId
        );

        if (followupResult.speak) {
          await playTTS(followupResult.speak);
        }

        Alert.alert('Voice Follow-up Response', followupResult.speak || 'Response received');
        setIsProcessingFollowup(false);
      }
    } catch (error) {
      setIsRecordingFollowup(false);
      setIsProcessingFollowup(false);
      Alert.alert('Error', 'Failed to process voice follow-up.');
    }
  };

  const handleNewCapture = () => {
    navigation.navigate('Capture');
  };

  const handleClearMemory = async () => {
    Alert.alert(
      'Clear Session Memory',
      'This will clear all conversation history and context. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearSessionMemory(sessionId);
              Alert.alert('Success', 'Session memory cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear session memory');
            }
          }
        }
      ]
    );
  };

  const chipAnimations = [chip1Anim, chip2Anim, chip3Anim];

  return (
    <View style={styles.container}>
      {/* Animated gradient background */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Subtle floating orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            transform: [
              { translateY: floatAnim },
              { scale: pulseAnim }
            ],
            opacity: 0.05,
          }
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            transform: [
              { translateY: Animated.multiply(floatAnim, -1) },
              { scale: pulseAnim }
            ],
            opacity: 0.05,
          }
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Premium Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Welcome')}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)']}
              style={styles.headerButtonGradient}
            >
              <Text style={styles.headerButtonText}>←</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Analysis</Text>
            <Animated.View style={[styles.headerSubtitle, { opacity: fadeAnim }]}>
              <View style={styles.sessionIndicator}>
                <Animated.View style={[
                  styles.sessionDot,
                  {
                    transform: [{ scale: pulseAnim }],
                    backgroundColor: '#10B981',
                  }
                ]} />
                <Text style={styles.sessionText}>Session Active</Text>
              </View>
            </Animated.View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleClearMemory}
            >
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
                style={styles.headerButtonGradient}
              >
                <Text style={styles.headerButtonIcon}>🗑️</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleNewCapture}
            >
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.05)']}
                style={styles.headerButtonGradient}
              >
                <Text style={styles.headerButtonIcon}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cost Tracker Display */}
        <CompactCostDisplay onPress={() => setShowCostTracker(true)} />

        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Main Response Card - Premium Design */}
            <Animated.View
              style={[
                styles.responseCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: responseCardAnim },
                    { scale: scaleAnim },
                    { translateY: floatAnim }
                  ]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.08)', 'rgba(59, 130, 246, 0.02)']}
                style={styles.cardGradient}
              >
                {/* Card Header with Animation */}
                <View style={styles.responseHeader}>
                  <View style={styles.responseAvatarContainer}>
                    <LinearGradient
                      colors={['#60A5FA', '#3B82F6', '#2563EB']}
                      style={styles.responseAvatar}
                    >
                      <Text style={styles.responseAvatarEmoji}>🤖</Text>
                    </LinearGradient>
                    {isPlayingTTS && (
                      <Animated.View style={[
                        styles.audioWave,
                        {
                          transform: [{ scale: pulseAnim }],
                          opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.02],
                            outputRange: [0.6, 0.2],
                          })
                        }
                      ]} />
                    )}
                  </View>
                  
                  <View style={styles.responseHeaderContent}>
                    <Text style={styles.responseLabel}>Nadar Response</Text>
                    {isPlayingTTS && (
                      <View style={styles.playingIndicator}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text style={styles.playingText}>Speaking...</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.detailsToggle}
                    onPress={() => setShowDetails(!showDetails)}
                  >
                    <LinearGradient
                      colors={['rgba(148, 163, 184, 0.1)', 'rgba(148, 163, 184, 0.05)']}
                      style={styles.detailsToggleGradient}
                    >
                      <Text style={styles.detailsToggleText}>
                        {showDetails ? '−' : '+'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Main Response Text */}
                <View style={styles.responseBody}>
                  <Text style={styles.responseText}>{response.speak}</Text>
                </View>

                {/* Details Section with Animation */}
                {showDetails && response.details && response.details.length > 0 && (
                  <Animated.View style={[styles.detailsSection, { opacity: fadeAnim }]}>
                    <View style={styles.detailsDivider} />
                    {response.details.map((detail: string, index: number) => (
                      <View key={index} style={styles.detailItem}>
                        <View style={styles.detailBullet}>
                          <LinearGradient
                            colors={['#60A5FA', '#3B82F6']}
                            style={styles.detailBulletGradient}
                          />
                        </View>
                        <Text style={styles.detailText}>{detail}</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}

                {/* Action Buttons */}
                <View style={styles.responseActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => playTTS(response.speak)}
                    disabled={isPlayingTTS}
                  >
                    <LinearGradient
                      colors={isPlayingTTS ? 
                        ['rgba(148, 163, 184, 0.1)', 'rgba(148, 163, 184, 0.05)'] :
                        ['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                      style={styles.actionButtonGradient}
                    >
                      <Text style={styles.actionButtonIcon}>🔊</Text>
                      <Text style={styles.actionButtonText}>Replay</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {response.signals?.has_text && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {/* Handle read text */}}
                    >
                      <LinearGradient
                        colors={['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.1)']}
                        style={styles.actionButtonGradient}
                      >
                        <Text style={styles.actionButtonIcon}>📖</Text>
                        <Text style={styles.actionButtonText}>Read Text</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Follow-up Section - Premium Design */}
            <Animated.View
              style={[
                styles.followupCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: followupCardAnim },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(168, 85, 247, 0.05)', 'rgba(168, 85, 247, 0.02)']}
                style={styles.cardGradient}
              >
                <View style={styles.followupHeader}>
                  <View style={styles.followupIconContainer}>
                    <LinearGradient
                      colors={['#C084FC', '#A855F7']}
                      style={styles.followupIcon}
                    >
                      <Text style={styles.followupIconEmoji}>💬</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.followupTitle}>Continue Conversation</Text>
                </View>

                {/* Suggested Questions with Premium Chips */}
                {response.followup_suggest && response.followup_suggest.length > 0 && (
                  <View style={styles.suggestedQuestions}>
                    {response.followup_suggest.slice(0, 3).map((suggestion: string, index: number) => (
                      <Animated.View
                        key={index}
                        style={[
                          { transform: [{ translateX: chipAnimations[index] || 0 }] }
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            styles.suggestionChip,
                            selectedChip === index && styles.suggestionChipActive
                          ]}
                          onPress={() => handleFollowupChip(suggestion, index)}
                          disabled={isProcessingFollowup}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={selectedChip === index ?
                              ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0.2)'] :
                              ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                            style={styles.chipGradient}
                          >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                            {selectedChip === index && isProcessingFollowup ? (
                              <ActivityIndicator size="small" color="#3B82F6" />
                            ) : (
                              <Text style={styles.suggestionArrow}>→</Text>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                )}

                {/* Custom Input Section */}
                <View style={styles.inputSection}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ask anything..."
                      placeholderTextColor="rgba(148, 163, 184, 0.5)"
                      value={followupText}
                      onChangeText={setFollowupText}
                      multiline
                      editable={!isProcessingFollowup}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!followupText.trim() || isProcessingFollowup) && styles.sendButtonDisabled
                      ]}
                      onPress={handleTextFollowup}
                      disabled={!followupText.trim() || isProcessingFollowup}
                    >
                      <LinearGradient
                        colors={followupText.trim() && !isProcessingFollowup ?
                          ['#3B82F6', '#2563EB'] :
                          ['#475569', '#334155']}
                        style={styles.sendButtonGradient}
                      >
                        {isProcessingFollowup ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.sendButtonText}>↑</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Voice Button */}
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={isRecordingFollowup ? stopVoiceFollowup : startVoiceFollowup}
                    disabled={isProcessingFollowup}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isRecordingFollowup ?
                        ['#EF4444', '#DC2626'] :
                        ['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                      style={styles.voiceButtonGradient}
                    >
                      {isRecordingFollowup ? (
                        <>
                          <Animated.View style={[
                            styles.recordingDot,
                            {
                              transform: [{ scale: pulseAnim }]
                            }
                          ]} />
                          <Text style={styles.voiceButtonText}>Recording... Tap to stop</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.voiceButtonIcon}>🎤</Text>
                          <Text style={styles.voiceButtonText}>Voice Question</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Cost Tracker Modal */}
      <CostTracker
        visible={showCostTracker}
        onClose={() => setShowCostTracker(false)}
      />
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
  keyboardAvoid: {
    flex: 1,
  },

  // Floating orbs
  orb: {
    position: 'absolute',
    borderRadius: 1000,
  },
  orb1: {
    width: 500,
    height: 500,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    top: -200,
    right: -200,
  },
  orb2: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    bottom: -150,
    left: -150,
  },

  // Premium Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
  headerButtonIcon: {
    fontSize: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  sessionText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Response Card
  responseCard: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardGradient: {
    padding: 20,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  responseAvatarContainer: {
    position: 'relative',
  },
  responseAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseAvatarEmoji: {
    fontSize: 24,
  },
  audioWave: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  responseHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  responseLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playingText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 6,
    fontWeight: '500',
  },
  detailsToggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailsToggleGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsToggleText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  responseBody: {
    marginBottom: 16,
  },
  responseText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#E2E8F0',
    fontWeight: '400',
  },
  detailsSection: {
    paddingTop: 16,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailBullet: {
    width: 20,
    height: 20,
    marginRight: 12,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBulletGradient: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#94A3B8',
  },
  responseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginHorizontal: -4,
  },
  actionButton: {
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
  },

  // Follow-up Card
  followupCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  followupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  followupIconContainer: {
    marginRight: 12,
  },
  followupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followupIconEmoji: {
    fontSize: 20,
  },
  followupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
  },

  // Suggested Questions
  suggestedQuestions: {
    marginBottom: 20,
  },
  suggestionChip: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestionChipActive: {
    transform: [{ scale: 0.98 }],
  },
  chipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#CBD5E1',
    fontWeight: '500',
    marginRight: 12,
  },
  suggestionArrow: {
    fontSize: 18,
    color: '#60A5FA',
    fontWeight: '600',
  },

  // Input Section
  inputSection: {
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 15,
    color: '#E2E8F0',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Voice Button
  voiceButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  voiceButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
  },
  voiceButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  voiceButtonText: {
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
});