// File: src/screens/ResultsScreen.tsx (drop-in refactor)
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, SafeAreaView, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { theme, typography } from '../app/theme';
import { useAppState } from '../app/state/AppContext';
import { useSettings } from '../app/state/useSettings';
import { tts } from '../api/client';
import { AudioPlayer, AudioPlayerRef } from '../utils/audioPlayer';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { ResultSection } from '../app/components/ResultSection';
import { TimingsGroup } from '../app/components/TimingsBadge';


export default function ResultsScreen() {
  const { state, dispatch } = useAppState();
  const { settings } = useSettings();
  const result = state.currentCapture;
  const soundRef = useRef<AudioPlayerRef['current']>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Initialize audio player
  if (!audioPlayerRef.current) {
    audioPlayerRef.current = new AudioPlayer(soundRef);
  }

  // Cross-platform TTS function
  const speak = async (text: string, voice?: string) => {
    try {
      console.log('🔊 Starting TTS for text:', text.substring(0, 50) + '...');

      const res = await tts(text, voice || settings.voice, settings.ttsProvider);

      if (!res.audioBase64) {
        console.error('❌ No audio data received from TTS');
        return;
      }

      console.log('🔊 Playing audio with cross-platform player...');
      await audioPlayerRef.current!.playAudio(res.audioBase64, res.mimeType);

      console.log('✅ Audio playback started');
    } catch (error) {
      console.error('❌ TTS error:', error);
    }
  };

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No results to display</Text>
          <Text style={styles.emptyText}>Your latest analysis will appear here.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function parseStructuredResult(text: string) {
    const sections: { title: string; content: string }[] = [];
    const lines = text.split('\n').filter((line) => line.trim());
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
        currentSection.content += '\n' + line;
      } else if (currentSection.title) {
        currentSection.content += ' ' + line;
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
    if (s.objects && s.objects.length) arr.push({ title: 'OBJECTS', content: s.objects.map((o: string) => `• ${o}`).join('\n') });
    if (s.navigation) arr.push({ title: 'NAVIGATION', content: s.navigation });
    return arr.length ? arr : null;
  }

  const sections = sectionsFromStructured() || parseStructuredResult(result.result);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: result.imageUri }} style={styles.image} />
            <View style={styles.modeTag}>
              <Text style={styles.modeText}>{result.mode.toUpperCase()}</Text>
            </View>
          </View>

          {result.question && (
            <View style={styles.questionCard}>
              <Text style={styles.questionLabel}>Question:</Text>
              <Text style={styles.questionText}>{result.question}</Text>
            </View>
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
              style={styles.resultSection}
            />
          ))}
        </View>

        {result.timings && (
          <View style={styles.timingsContainer}>
            <Text style={styles.timingsTitle}>Performance</Text>
            <TimingsGroup
              timings={[
                { label: 'Prep', value: result.timings.prep ?? '—' },
                { label: 'Model', value: result.timings.model ?? '—' },
                { label: 'Total', value: result.timings.total ?? '—' },
              ]}
            />
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            title="🔊 Play Full Audio"
            onPress={() => speak(result.result, settings.voice)}
            style={styles.audioButton}
          />

          <View style={styles.secondaryActions}>
            <SecondaryButton title="📷 Take Another" onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })} />
            <SecondaryButton
              title="📋 Copy"
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(result.result);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                } catch {}
              }}
            />
            <SecondaryButton
              title="📤 Share"
              onPress={async () => {
                try {
                  await Share.share({ message: result.result });
                } catch {}
              }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: theme.spacing(2)
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3)
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.spacing(2),
    textAlign: 'center'
  },
  emptyText: {
    color: theme.colors.textMut,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: theme.spacing(3)
  },

  // Button styles
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: theme.colors.hairline,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },

  header: { marginBottom: theme.spacing(3) },
  imageContainer: {
    position: 'relative',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing(2),
  },
  image: { width: '100%', height: 200, backgroundColor: theme.colors.surface },
  modeTag: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.sm,
    ...theme.shadows.elev1,
  },
  modeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  questionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  questionLabel: { color: theme.colors.textMut, fontSize: 12, fontWeight: '600', marginBottom: theme.spacing(0.5) },
  questionText: { color: theme.colors.text, fontSize: 16 },
  resultsContainer: { gap: theme.spacing(2), marginBottom: theme.spacing(3) },
  resultSection: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    borderWidth: 1,
  },
  resultSectionDefault: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  resultSectionBoldLight: {},
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  resultTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.section.fontSize,
    fontWeight: theme.typography.section.fontWeight,
    letterSpacing: theme.typography.section.letterSpacing,
    flex: 1,
  },
  playButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1),
    marginLeft: theme.spacing(1),
  },
  playButtonText: {
    fontSize: 16,
  },
  resultContent: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  timingsContainer: {
    marginBottom: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timingsTitle: { color: theme.colors.textMut, fontSize: 14, fontWeight: '600', marginBottom: theme.spacing(1) },
  timingsBadge: {
    backgroundColor: '#262626',
    borderRadius: theme.radius.md,
    padding: theme.spacing(1),
  },
  timingsText: {
    color: theme.colors.textMut,
    fontSize: 12,
    fontWeight: '500',
  },
  actions: { gap: theme.spacing(2) },
  audioButton: { width: '100%' },
  secondaryActions: { flexDirection: 'row', gap: theme.spacing(2) },
});
