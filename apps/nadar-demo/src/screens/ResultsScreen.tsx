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
  Dimensions
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

export default function ResultsScreen({ navigation, route }: Props) {
  const { response, sessionId } = route.params;
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [followupText, setFollowupText] = useState('');
  const [isRecordingFollowup, setIsRecordingFollowup] = useState(false);
  const [isProcessingFollowup, setIsProcessingFollowup] = useState(false);
  const [showCostTracker, setShowCostTracker] = useState(false);
  const audioRef = useRef<AudioPlayerRef['current']>(null);
  const audioPlayer = useRef(new AudioPlayer({ current: null }));

  useEffect(() => {
    // Auto-play TTS for the main response
    if (response?.speak) {
      playTTS(response.speak);
    }
  }, [response]);

  const playTTS = async (text: string) => {
    if (!text.trim()) return;

    try {
      setIsPlayingTTS(true);
      console.log('🎵 Playing TTS for:', text.substring(0, 50) + '...');

      const ttsResult = await tts(text, 'Kore', 'elevenlabs');
      await audioPlayer.current.playAudio(ttsResult.audioBase64, ttsResult.mimeType);

      console.log('✅ TTS playback completed');
    } catch (error) {
      console.error('❌ TTS playback failed:', error);
      // Don't show error to user - TTS failure shouldn't block the demo
    } finally {
      setIsPlayingTTS(false);
    }
  };

  const handleFollowupChip = async (question: string) => {
    try {
      setIsProcessingFollowup(true);
      console.log('🔄 Processing follow-up question:', question);
      console.log('🎫 Using followupToken:', response.followupToken);

      // Use the actual followupToken from the response, fallback to 'last'
      const imageRef = response.followupToken || 'last';
      const followupResult = await assistWithImageRef(
        imageRef,
        question,
        { language: 'darija', verbosity: 'brief' },
        sessionId
      );

      console.log('✅ Follow-up response received:', followupResult.speak.substring(0, 50) + '...');

      // Play TTS for the response
      if (followupResult.speak) {
        await playTTS(followupResult.speak);
      }

      // Show the response in an alert (in a full implementation, you might navigate to a new screen)
      Alert.alert('Follow-up Response', followupResult.speak || 'Response received');

    } catch (error) {
      console.error('❌ Follow-up error:', error);
      Alert.alert('Error', 'Failed to process follow-up question. Please try again.');
    } finally {
      setIsProcessingFollowup(false);
    }
  };

  const handleTextFollowup = async () => {
    if (!followupText.trim()) return;
    
    await handleFollowupChip(followupText);
    setFollowupText('');
  };

  const startVoiceFollowup = async () => {
    try {
      setIsRecordingFollowup(true);
      await audioRecorder.startRecording();
      console.log('🎤 Started recording followup question');
    } catch (error) {
      console.error('❌ Failed to start followup recording:', error);
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
        console.log('🎤 Processing voice follow-up question...');

        const audioBase64 = await audioRecorder.convertToBase64(audioUri);

        // Use the voice follow-up function with audio + imageRef
        const imageRef = response.followupToken || 'last';
        const followupResult = await assistVoiceFollowup(
          imageRef,
          audioBase64,
          'audio/wav', // Assuming WAV format from recorder
          { language: 'darija', verbosity: 'brief' },
          sessionId
        );

        console.log('✅ Voice follow-up response received:', followupResult.speak.substring(0, 50) + '...');

        // Play TTS for the response
        if (followupResult.speak) {
          await playTTS(followupResult.speak);
        }

        // Show the response
        Alert.alert('Voice Follow-up Response', followupResult.speak || 'Response received');

        setIsProcessingFollowup(false);
      }
    } catch (error) {
      console.error('❌ Voice follow-up error:', error);
      setIsRecordingFollowup(false);
      setIsProcessingFollowup(false);
      Alert.alert('Error', 'Failed to process voice follow-up. Please try again.');
    }
  };

  const handleNewCapture = () => {
    navigation.navigate('Capture');
  };

  const handleClearMemory = async () => {
    try {
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
                console.error('❌ Clear memory error:', error);
                Alert.alert('Error', 'Failed to clear session memory');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Clear memory dialog error:', error);
    }
  };

  return (
    <LinearGradient
      colors={theme.gradients.background.colors}
      style={styles.container}
      start={theme.gradients.background.start}
      end={theme.gradients.background.end}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={styles.backButtonText}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Results</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.clearMemoryButton}
              onPress={handleClearMemory}
            >
              <Text style={styles.clearMemoryButtonText}>🧹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newCaptureButton}
              onPress={handleNewCapture}
            >
              <Text style={styles.newCaptureButtonText}>📷 New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cost Tracker Display */}
        <CompactCostDisplay onPress={() => setShowCostTracker(true)} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Main Response Card */}
        <View style={styles.responseCard}>
          {/* Response Header with Icon */}
          <View style={styles.responseHeader}>
            <View style={styles.responseIconContainer}>
              <Text style={styles.responseIcon}>🤖</Text>
            </View>
            <View style={styles.responseHeaderText}>
              <Text style={styles.responseTitle}>AI Response</Text>
              {isPlayingTTS && (
                <View style={styles.ttsIndicator}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.ttsIndicatorText}>Playing audio...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Main Response Text */}
          <View style={styles.responseContent}>
            <Text style={styles.responseText}>{response.speak}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.responseActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.replayButton]}
              onPress={() => playTTS(response.speak)}
              disabled={isPlayingTTS}
            >
              <Text style={styles.actionButtonIcon}>🔊</Text>
              <Text style={styles.actionButtonText}>Replay</Text>
            </TouchableOpacity>

            {/* Details Toggle */}
            {response.details && response.details.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.detailsButton]}
                onPress={() => setShowDetails(!showDetails)}
              >
                <Text style={styles.actionButtonIcon}>📋</Text>
                <Text style={styles.actionButtonText}>
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Details Section */}
          {showDetails && response.details && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Additional Details</Text>
              {response.details.map((detail: string, index: number) => (
                <View key={index} style={styles.detailItem}>
                  <Text style={styles.detailBullet}>•</Text>
                  <Text style={styles.detailText}>{detail}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Follow-up Section */}
        <View style={styles.followupCard}>
          {/* Section Header */}
          <View style={styles.followupHeader}>
            <View style={styles.followupIconContainer}>
              <Text style={styles.followupIcon}>💬</Text>
            </View>
            <Text style={styles.followupTitle}>Continue the Conversation</Text>
          </View>

          {/* Suggested Questions */}
          {response.followup_suggest && response.followup_suggest.length > 0 && (
            <View style={styles.suggestedSection}>
              <Text style={styles.suggestedTitle}>Quick Questions</Text>
              <View style={styles.suggestedGrid}>
                {response.followup_suggest.map((suggestion: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleFollowupChip(suggestion)}
                    disabled={isProcessingFollowup}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Text style={styles.suggestionArrow}>→</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Custom Question Input */}
          <View style={styles.customQuestionSection}>
            <Text style={styles.customQuestionTitle}>Ask Your Own Question</Text>

            {/* Text Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your question here..."
                placeholderTextColor={theme.colors.textMut}
                value={followupText}
                onChangeText={setFollowupText}
                multiline
                editable={!isProcessingFollowup}
              />
              <TouchableOpacity
                style={[styles.sendButton, !followupText.trim() && styles.sendButtonDisabled]}
                onPress={handleTextFollowup}
                disabled={!followupText.trim() || isProcessingFollowup}
              >
                {isProcessingFollowup ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Voice Input Button */}
            <TouchableOpacity
              style={[
                styles.voiceInputButton,
                isRecordingFollowup && styles.voiceInputButtonActive
              ]}
              onPress={isRecordingFollowup ? stopVoiceFollowup : startVoiceFollowup}
              disabled={isProcessingFollowup}
            >
              <View style={styles.voiceInputContent}>
                {isRecordingFollowup ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.text} />
                    <Text style={styles.voiceInputText}>🔴 Recording... Tap to stop</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.voiceInputIcon}>🎤</Text>
                    <Text style={styles.voiceInputText}>Ask with Voice</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>

      {/* Cost Tracker Modal */}
      <CostTracker
        visible={showCostTracker}
        onClose={() => setShowCostTracker(false)}
      />
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: theme.spacing(1),
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  clearMemoryButton: {
    padding: theme.spacing(1),
  },
  clearMemoryButtonText: {
    fontSize: 18,
  },
  newCaptureButton: {
    padding: theme.spacing(1),
  },
  newCaptureButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing(3),
    paddingBottom: theme.spacing(6),
  },
  // Response Card Styles
  responseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.xl,
    padding: theme.spacing(4),
    marginBottom: theme.spacing(4),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.lg,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  responseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  responseIcon: {
    fontSize: 24,
  },
  responseHeaderText: {
    flex: 1,
  },
  responseTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing(0.5),
  },
  ttsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ttsIndicatorText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginLeft: theme.spacing(1),
    fontWeight: '500',
  },
  responseContent: {
    marginBottom: theme.spacing(3),
  },
  responseText: {
    ...theme.typography.body,
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.text,
    textAlign: 'left',
  },
  responseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.lg,
    minWidth: 100,
  },
  replayButton: {
    backgroundColor: theme.colors.primary,
  },
  detailsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: theme.spacing(1),
  },
  actionButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: theme.spacing(3),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailsTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing(2),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1.5),
  },
  detailBullet: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginRight: theme.spacing(1),
    marginTop: 2,
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    flex: 1,
    lineHeight: 22,
  },
  // Follow-up Card Styles
  followupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.xl,
    padding: theme.spacing(4),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.lg,
  },
  followupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  followupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  followupIcon: {
    fontSize: 20,
  },
  followupTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontWeight: '700',
  },
  suggestedSection: {
    marginBottom: theme.spacing(4),
  },
  suggestedTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing(2),
  },
  suggestedGrid: {
    gap: theme.spacing(2),
  },
  suggestionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
  },
  suggestionArrow: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  // Custom Question Input Styles
  customQuestionSection: {
    marginTop: theme.spacing(1),
  },
  customQuestionTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing(3),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing(3),
    gap: theme.spacing(2),
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    maxHeight: 120,
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    borderRadius: theme.radius.lg,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  voiceInputButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  voiceInputButtonActive: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  voiceInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceInputIcon: {
    fontSize: 20,
    marginRight: theme.spacing(2),
  },
  voiceInputText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
});
