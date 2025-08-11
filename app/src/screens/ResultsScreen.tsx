// File: src/screens/ResultsScreen.tsx (drop-in refactor)
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Share, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { theme } from '../app/theme';
import { ScreenWrapper } from '../app/components/ScreenWrapper';
import { StyledText } from '../app/components/StyledText';
import { useAppState } from '../app/state/AppContext';
import { useSettings } from '../app/state/useSettings';
import { tts } from '../api/client';
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

  function parseStructuredResult(text: string) {
    const sections: { title: string; content: string }[] = [];
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

  const sections = sectionsFromStructured() || parseStructuredResult(result.result);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: result.imageUri }} style={styles.image} />
            <View style={styles.modeTag}>
              <StyledText style={styles.modeText}>{result.mode.toUpperCase()}</StyledText>
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
});
