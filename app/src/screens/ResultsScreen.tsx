// File: src/screens/ResultsScreen.tsx (drop-in refactor)
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Share, ScrollView, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { theme } from '../app/theme';
import { ScreenWrapper } from '../app/components/ScreenWrapper';
import { StyledText } from '../app/components/StyledText';
import { useAppState } from '../app/state/AppContext';
import { useSettings } from '../app/state/useSettings';
import { tts, followUp } from '../api/client';
import { AudioPlayer, AudioPlayerRef } from '../utils/audioPlayer';


import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { ResultSection } from '../app/components/ResultSection';
import { TimingsGroup } from '../app/components/TimingsBadge';
import { Card } from '../app/components/Card';

export default function ResultsScreen() {
  const { state, dispatch } = useAppState();
  const { settings } = useSettings();
  const result = state.currentCapture;

  // All hooks must be called before any conditional logic
  const soundRef = useRef<AudioPlayerRef['current']>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const chunkedTTSQueue = useRef<string[]>([]);
  const isChunkedPlaying = useRef(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpResponse, setFollowUpResponse] = useState<string | null>(null);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioPlayerRef.current?.cleanup().catch(() => {});
    };
  }, []);

  // Autospeak first section (brief) - temporarily disabled to prevent quota exhaustion
  useEffect(() => {
    // TODO: Re-enable auto-play once TTS quota issues are resolved
    // try {
    //   const first = sections[0]?.content || result.result;
    //   const brief = first.slice(0, 200);
    //   speak(brief, settings.voice);
    // } catch {}
    // run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Early return after all hooks
  if (!result) {
    return (
      <ScreenWrapper style={styles.emptyContainer}>
        <StyledText variant="title" style={styles.emptyTitle}>
          No Results
        </StyledText>
        <StyledText style={styles.emptyText}>Your latest analysis will appear here.</StyledText>
        <PrimaryButton
          title="Take Photo"
          onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })}
        />
      </ScreenWrapper>
    );
  }

  // Initialize audio player
  if (!audioPlayerRef.current) {
    audioPlayerRef.current = new AudioPlayer(soundRef);
  }

  // Stop audio playback
  const stopAudio = async () => {
    try {
      setIsPlaying(false);
      isChunkedPlaying.current = false;
      chunkedTTSQueue.current = []; // Clear queue

      if (audioPlayerRef.current) {
        await audioPlayerRef.current.cleanup();
      }

      // Audio playback stopped
    } catch {
      // Ignore stop audio errors
    }
  };

  // Cross-platform TTS function
  const speak = async (text: string, voice?: string) => {
    try {
      setIsPlaying(true);
      // Starting TTS

      const res = await tts(text, voice || settings.voice, settings.ttsProvider, settings.ttsRate);

      if (!res.audioBase64) {
        setIsPlaying(false);
        return;
      }

      await audioPlayerRef.current!.playAudio(res.audioBase64, res.mimeType);
      setIsPlaying(false);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleFollowUp = async () => {
    console.log('🔄 Follow-up button pressed');
    console.log('📝 Question:', followUpQuestion.trim());
    console.log('🆔 Session ID:', result?.sessionId);

    if (!followUpQuestion.trim()) {
      console.log('❌ No question provided');
      dispatch({
        type: 'SHOW_TOAST',
        message: 'Please enter a question',
        toastType: 'error'
      });
      return;
    }

    if (!result?.sessionId) {
      console.log('❌ No session ID found');
      dispatch({
        type: 'SHOW_TOAST',
        message: 'No session found. Please take a new photo first.',
        toastType: 'error'
      });
      return;
    }

    setIsFollowUpLoading(true);
    try {
      console.log('🚀 Sending follow-up request...');
      const response = await followUp(
        result.sessionId,
        followUpQuestion.trim(),
        { verbosity: settings.verbosity, language: settings.language }
      );

      console.log('✅ Follow-up response received:', response.speak);
      setFollowUpResponse(response.speak);
      setFollowUpQuestion(''); // Clear the input

      // Auto-play the follow-up response
      if (response.speak) {
        speak(response.speak, settings.voice);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error: any) {
      console.error('❌ Follow-up failed:', error);
      dispatch({
        type: 'SHOW_TOAST',
        message: error?.message || 'Failed to get follow-up response',
        toastType: 'error'
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  function parseAssistResult(result: any) {
    const sections: { title: string; content: string }[] = [];

    // Handle new assist format
    if (result.mode === 'assist') {
      // Main response (for TTS)
      sections.push({
        title: 'نظر يقول', // "Nadar says"
        content: result.result || 'No response available'
      });

      // Additional details if available
      if (result.details && result.details.length > 0) {
        sections.push({
          title: 'تفاصيل إضافية', // "Additional details"
          content: result.details.join('\n• ')
        });
      }

      // Note: Follow-up suggestions removed per user feedback

      return sections;
    }

    // Fallback to old format parsing for backward compatibility
    return parseStructuredResult(result.result || '');
  }

  function parseStructuredResult(text: string) {
    const sections: { title: string; content: string }[] = [];

    // Handle undefined or null text
    if (!text || typeof text !== 'string') {
      return [{ title: 'Result', content: 'No description available' }];
    }

    const lines = text.split('\n').filter(line => line.trim());
    let currentSection = { title: '', content: '' };

    for (const line of lines) {
      if (
        line.toUpperCase().startsWith('IMMEDIATE:') ||
        line.toUpperCase().startsWith('OBJECTS:') ||
        line.toUpperCase().startsWith('NAVIGATION:')
      ) {
        if (currentSection.title) sections.push(currentSection as any);
        const [title, ...contentParts] = line.split(':');
        currentSection = {
          title: title.trim(),
          content: contentParts.join(':').trim(),
        };
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        currentSection.content += `\n${line}`;
      } else if (currentSection.title) {
        currentSection.content += ` ${line}`;
      } else {
        sections.push({ title: 'Result', content: line });
      }
    }

    if (currentSection.title) sections.push(currentSection as any);
    return sections.length > 0 ? sections : [{ title: 'Result', content: text }];
  }

  function sectionsFromStructured() {
    const s = (result as any).structured;
    const arr: { title: string; content: string }[] = [];
    if (!s) return null;
    if (s.immediate) arr.push({ title: 'IMMEDIATE', content: s.immediate });
    if (s.objects && s.objects.length)
      arr.push({ title: 'OBJECTS', content: s.objects.map((o: string) => `• ${o}`).join('\n') });
    if (s.navigation) arr.push({ title: 'NAVIGATION', content: s.navigation });
    return arr.length ? arr : null;
  }

  const sections = sectionsFromStructured() || parseAssistResult(result);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: result.imageUri }} style={styles.image} />
            <View style={styles.modeTag}>
              <StyledText style={styles.modeText}>
                {result.mode === 'assist' ? 'ASSIST' : result.mode.toUpperCase()}
              </StyledText>
            </View>
          </View>

          {result.question && (
            <Card style={styles.questionCard}>
              <StyledText variant="meta" color="textMut">
                Question:
              </StyledText>
              <StyledText variant="body">{result.question}</StyledText>
            </Card>
          )}
        </View>

        <View style={styles.resultsContainer}>
          {sections.map((section, index) => (
            <ResultSection
              key={index}
              title={section.title}
              content={section.content}
              variant={section.title?.toUpperCase() === 'IMMEDIATE' ? 'boldLight' : 'default'}
              onPlayPress={() => speak(section.content, settings.voice)}
            />
          ))}
        </View>

        {result.timings && (
          <Card style={styles.timingsContainer}>
            <StyledText variant="meta" color="textMut" style={{ marginBottom: theme.spacing(1) }}>
              Performance
            </StyledText>
            <TimingsGroup
              timings={[
                { label: 'Prep', value: result.timings.prep ?? '—' },
                { label: 'Model', value: result.timings.model ?? '—' },
                { label: 'Total', value: result.timings.total ?? '—' },
              ]}
            />
          </Card>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            title={isPlaying ? 'Stop' : 'Play Full Audio'}
            onPress={isPlaying ? stopAudio : () => speak(result.result, settings.voice)}
          />
          <View style={styles.secondaryActions}>
            <SecondaryButton
              title="Copy"
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(result.result);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
                    // Ignore haptics errors
                  });
                } catch {
                  // Ignore clipboard errors
                }
              }}
            />
            <SecondaryButton
              title="Share"
              onPress={async () => {
                try {
                  await Share.share({ message: result.result });
                } catch {
                  // Ignore share errors
                }
              }}
            />
            <SecondaryButton
              title="New"
              onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })}
            />
          </View>
        </View>

        {/* Follow-up Questions Section */}
        <Card style={styles.followUpContainer}>
          <StyledText variant="meta" color="textMut" style={{ marginBottom: theme.spacing(1) }}>
            سؤال إضافي
          </StyledText>
          <View style={styles.followUpInputRow}>
            <TextInput
              value={followUpQuestion}
              onChangeText={setFollowUpQuestion}
              placeholder="اسأل سؤال إضافي عن الصورة..."
              placeholderTextColor={theme.colors.textMut}
              style={styles.followUpInput}
              returnKeyType="send"
              onSubmitEditing={handleFollowUp}
              editable={!isFollowUpLoading}
            />
            <SecondaryButton
              title={isFollowUpLoading ? '...' : 'سأل'}
              onPress={() => {
                console.log('🔘 Follow-up button pressed!');
                handleFollowUp();
              }}
              disabled={isFollowUpLoading}
              style={styles.followUpButton}
            />
          </View>

          {followUpResponse && (
            <View style={styles.followUpResponse}>
              <StyledText variant="meta" color="textMut" style={{ marginBottom: theme.spacing(0.5) }}>
                الجواب:
              </StyledText>
              <StyledText>{followUpResponse}</StyledText>
              <SecondaryButton
                title="🔊"
                onPress={() => speak(followUpResponse, settings.voice)}
                style={styles.followUpPlayButton}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing(2),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  emptyTitle: {
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  imageContainer: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing(2),
    ...theme.shadows.elev1,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.surface,
  },
  modeTag: {
    position: 'absolute',
    top: theme.spacing(1.5),
    right: theme.spacing(1.5),
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.sm,
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  questionCard: {
    padding: theme.spacing(2),
  },
  resultsContainer: {
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  timingsContainer: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
  },
  actions: {
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(4),
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: theme.spacing(2),
  },
  followUpContainer: {
    marginTop: theme.spacing(2),
  },
  followUpInputRow: {
    flexDirection: 'row',
    gap: theme.spacing(1),
    alignItems: 'center',
  },
  followUpInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
  },
  followUpButton: {
    minWidth: 60,
    paddingHorizontal: theme.spacing(1),
  },
  followUpResponse: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    position: 'relative',
  },
  followUpPlayButton: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    minWidth: 40,
    paddingHorizontal: theme.spacing(0.5),
  },
});
