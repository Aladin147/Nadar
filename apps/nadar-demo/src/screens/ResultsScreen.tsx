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
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../theme';
import { tts, postJSON } from '../api/client';
import { AudioPlayer, AudioPlayerRef } from '../utils/audioPlayer';
import { audioRecorder } from '../utils/audioRecording';

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
      
      const followupResult = await postJSON('/api/followup', {
        followupToken: response.followupToken || sessionId,
        question
      });

      if (followupResult.speak) {
        await playTTS(followupResult.speak);
      }

      // Update response with followup result
      // For now, just show an alert - in a full implementation, 
      // you might want to navigate to a new results screen or update current one
      Alert.alert('Follow-up Response', followupResult.speak || 'Response received');

    } catch (error) {
      console.error('Followup error:', error);
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
        const audioBase64 = await audioRecorder.convertToBase64(audioUri);
        
        // Send audio followup (this would need a new endpoint)
        // For now, just show that voice was recorded
        Alert.alert('Voice Recorded', 'Voice followup feature coming soon!');
        setIsProcessingFollowup(false);
      }
    } catch (error) {
      console.error('Voice followup error:', error);
      setIsRecordingFollowup(false);
      setIsProcessingFollowup(false);
      Alert.alert('Error', 'Failed to process voice followup.');
    }
  };

  const handleNewCapture = () => {
    navigation.navigate('Capture');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Results</Text>
        <TouchableOpacity 
          style={styles.newCaptureButton}
          onPress={handleNewCapture}
        >
          <Text style={styles.newCaptureButtonText}>📷 New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Response */}
        <View style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Text style={styles.responseText}>{response.speak}</Text>
            {isPlayingTTS && (
              <View style={styles.ttsIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.ttsIndicatorText}>Playing...</Text>
              </View>
            )}
          </View>
          
          {/* Replay Button */}
          <TouchableOpacity
            style={styles.replayButton}
            onPress={() => playTTS(response.speak)}
            disabled={isPlayingTTS}
          >
            <Text style={styles.replayButtonText}>🔊 Replay</Text>
          </TouchableOpacity>

          {/* Details Toggle */}
          {response.details && response.details.length > 0 && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.moreButtonText}>
                {showDetails ? 'Less Details' : 'More Details'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Details */}
          {showDetails && response.details && (
            <View style={styles.detailsContainer}>
              {response.details.map((detail: string, index: number) => (
                <Text key={index} style={styles.detailText}>• {detail}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Follow-up Section */}
        <View style={styles.followupSection}>
          <Text style={styles.followupTitle}>Follow-up Questions</Text>
          
          {/* Suggested Questions */}
          {response.followup_suggest && response.followup_suggest.length > 0 && (
            <View style={styles.suggestedQuestions}>
              <Text style={styles.suggestedTitle}>Suggested:</Text>
              <View style={styles.followupChips}>
                {response.followup_suggest.map((suggestion: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.followupChip}
                    onPress={() => handleFollowupChip(suggestion)}
                    disabled={isProcessingFollowup}
                  >
                    <Text style={styles.followupChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Text Input */}
          <View style={styles.textInputSection}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your follow-up question..."
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

          {/* Voice Input */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecordingFollowup && styles.voiceButtonActive
            ]}
            onPress={isRecordingFollowup ? stopVoiceFollowup : startVoiceFollowup}
            disabled={isProcessingFollowup}
          >
            {isRecordingFollowup ? (
              <View style={styles.recordingContainer}>
                <ActivityIndicator size="small" color={theme.colors.text} />
                <Text style={styles.voiceButtonText}>🔴 Recording... Tap to stop</Text>
              </View>
            ) : (
              <Text style={styles.voiceButtonText}>🎤 Ask with Voice</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing(1),
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  title: {
    ...theme.typography.h2,
  },
  newCaptureButton: {
    padding: theme.spacing(1),
  },
  newCaptureButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
    padding: theme.spacing(2),
  },
  responseContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  responseHeader: {
    marginBottom: theme.spacing(2),
  },
  responseText: {
    ...theme.typography.body,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: theme.spacing(1),
  },
  ttsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ttsIndicatorText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginLeft: theme.spacing(1),
  },
  replayButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.md,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing(2),
  },
  replayButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  moreButton: {
    alignSelf: 'flex-start',
  },
  moreButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  detailsContainer: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    marginBottom: theme.spacing(1),
  },
  followupSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
  },
  followupTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing(2),
  },
  suggestedQuestions: {
    marginBottom: theme.spacing(3),
  },
  suggestedTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: theme.spacing(1),
  },
  followupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  followupChip: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing(1),
  },
  followupChipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
  },
  textInputSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing(2),
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(2),
    marginRight: theme.spacing(1),
    maxHeight: 100,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  voiceButton: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: theme.colors.error,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginLeft: theme.spacing(1),
  },
});
