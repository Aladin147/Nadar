import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';

export default function LandingScreen({ onStart, onDemo, onSettings }: { onStart: () => void; onDemo: () => void; onSettings: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#0a0a0a","#111827","#0a0a0a"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.inner}>
        <Text style={styles.logo}>Nadar</Text>
        <Text style={styles.tagline}>See through sound. Understand the world.</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Instant Scene</Text>
          <Text style={styles.heroText}>Immediate, concise guidance: what’s around you and how to move.</Text>
        </View>

        <View style={styles.features}>
          <Feature title="Read Anything" desc="OCR built for real life: signs, menus, labels." />
          <Feature title="Ask & Clarify" desc="Ask questions about what you see; get precise answers." />
          <Feature title="Voice Output" desc="Fast, clear TTS for timely assistance." />
        </View>

        <View style={styles.ctas}>
          <PrimaryButton title="Start Capture" onPress={onStart} />
          <TouchableOpacity onPress={onDemo} accessibilityRole="button" accessibilityLabel="Try demo">
            <Text style={styles.demo}>Try a quick demo →</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.settings} onPress={onSettings} accessibilityRole="button" accessibilityLabel="Settings">
          <Text style={styles.settingsText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { padding: theme.spacing(3), flex: 1, alignItems: 'center' },
  logo: { ...theme.typography.title, fontSize: 40, color: '#fff', marginTop: theme.spacing(2) },
  tagline: { color: theme.colors.textMut, marginTop: theme.spacing(1), marginBottom: theme.spacing(3), textAlign: 'center' },
  heroCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.lg, padding: theme.spacing(2), width: '100%', maxWidth: 520, marginBottom: theme.spacing(2) },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 6 },
  heroText: { color: theme.colors.textMut },
  features: { width: '100%', maxWidth: 520, gap: theme.spacing(1), marginTop: theme.spacing(1) },
  feature: { backgroundColor: '#111316', borderColor: '#1f2937', borderWidth: 1, borderRadius: theme.radius.md, padding: theme.spacing(2) },
  featureTitle: { color: '#e5e7eb', fontWeight: '700' },
  featureDesc: { color: '#9ca3af', marginTop: 2 },
  ctas: { marginTop: theme.spacing(4), alignItems: 'center', gap: theme.spacing(1) },
  demo: { color: theme.colors.textMut, marginTop: theme.spacing(1) },
  settings: { position: 'absolute', bottom: theme.spacing(2), alignSelf: 'center' },
  settingsText: { color: theme.colors.textMut, textDecorationLine: 'underline' },
});

