import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { theme } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { useAppState } from '../app/state/AppContext';
import { tts } from '../api/client';
import { base64ToUint8Array, pcm16ToWavBytes } from '../utils/pcmToWav';
import { useSettings } from '../app/state/useSettings';

export default function ResultsScreen() {
  const { state, dispatch } = useAppState();
  const { settings } = useSettings();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const result = state.currentCapture;
  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No results to display</Text>
          <PrimaryButton title="Take Photo" onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })} />
        </View>
      </SafeAreaView>
    );
  }

  async function playAudio() {
    if (isPlayingAudio) return;
    
    setIsPlayingAudio(true);
    try {
      const response = await tts(result.result, settings.voice);
      const pcm = base64ToUint8Array(response.audioBase64);
      const wav = pcm16ToWavBytes(pcm);
      const wavPath = FileSystem.cacheDirectory + 'result_tts.wav';
      
      await FileSystem.writeAsStringAsync(
        wavPath, 
        Buffer.from(wav).toString('base64'), 
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      const { sound } = await Audio.Sound.createAsync({ uri: wavPath });
      soundRef.current = sound;
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingAudio(false);
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.error('TTS Error:', error);
      setIsPlayingAudio(false);
    }
  }

  function parseStructuredResult(text: string) {
    const sections = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection = { title: '', content: '' };
    
    for (const line of lines) {
      if (line.includes('IMMEDIATE:') || line.includes('OBJECTS:') || line.includes('NAVIGATION:')) {
        if (currentSection.title) {
          sections.push(currentSection);
        }
        const [title, ...contentParts] = line.split(':');
        currentSection = {
          title: title.trim(),
          content: contentParts.join(':').trim()
        };
      } else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        currentSection.content += '\n' + line;
      } else if (currentSection.title) {
        currentSection.content += ' ' + line;
      } else {
        // No structured format, treat as general content
        sections.push({ title: 'Analysis', content: line });
      }
    }
    
    if (currentSection.title) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{ title: 'Result', content: text }];
  }

  const sections = parseStructuredResult(result.result);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <TouchableOpacity 
                  style={styles.sectionPlayButton}
                  onPress={() => playAudio()}
                  accessibilityLabel={`Play ${section.title}`}
                >
                  <Text style={styles.playIcon}>🔊</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionContent} selectable>
                {section.content}
              </Text>
            </View>
          ))}
        </View>

        {result.timings && (
          <View style={styles.timingsContainer}>
            <Text style={styles.timingsTitle}>Performance</Text>
            <View style={styles.timings}>
              <View style={styles.timing}>
                <Text style={styles.timingLabel}>Prep</Text>
                <Text style={styles.timingValue}>{result.timings.prep}ms</Text>
              </View>
              <View style={styles.timing}>
                <Text style={styles.timingLabel}>Model</Text>
                <Text style={styles.timingValue}>{result.timings.model}ms</Text>
              </View>
              <View style={styles.timing}>
                <Text style={styles.timingLabel}>Total</Text>
                <Text style={styles.timingValue}>{result.timings.total}ms</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton 
            title={isPlayingAudio ? "🔊 Playing..." : "🔊 Play Full Audio"} 
            onPress={playAudio}
            disabled={isPlayingAudio}
            style={styles.audioButton}
          />
          
          <View style={styles.secondaryActions}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => dispatch({ type: 'NAVIGATE', route: 'capture' })}
            >
              <Text style={styles.secondaryButtonText}>📷 Take Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {
                // TODO: Implement share functionality
              }}
            >
              <Text style={styles.secondaryButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scrollView: { flex: 1 },
  content: { padding: theme.spacing(2) },
  header: { marginBottom: theme.spacing(3) },
  imageContainer: { 
    position: 'relative',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing(2),
  },
  image: { 
    width: '100%', 
    height: 200, 
    backgroundColor: theme.colors.surface,
  },
  modeTag: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.sm,
  },
  modeText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700',
  },
  questionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
  },
  questionLabel: { 
    color: theme.colors.textMut, 
    fontSize: 12, 
    fontWeight: '600',
    marginBottom: theme.spacing(0.5),
  },
  questionText: { 
    color: theme.colors.text, 
    fontSize: 16,
  },
  resultsContainer: { 
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionPlayButton: {
    padding: theme.spacing(0.5),
  },
  playIcon: { fontSize: 16 },
  sectionContent: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  timingsContainer: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  timingsTitle: {
    color: theme.colors.textMut,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing(1),
  },
  timings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timing: { alignItems: 'center' },
  timingLabel: {
    color: theme.colors.textMut,
    fontSize: 12,
  },
  timingValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: { gap: theme.spacing(2) },
  audioButton: { width: '100%' },
  secondaryActions: {
    flexDirection: 'row',
    gap: theme.spacing(2),
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(2),
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  emptyText: {
    color: theme.colors.textMut,
    fontSize: 18,
    marginBottom: theme.spacing(3),
  },
});
