import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { Segmented } from '../app/components/Segmented';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { theme } from '../app/theme';
import { loadSettings, saveSettings, Language, Verbosity } from '../app/state/settings';

export default function SettingsScreen() {
  const [language, setLanguage] = useState<Language>('darija');
  const [verbosity, setVerbosity] = useState<Verbosity>('brief');
  const [voice, setVoice] = useState<string>('');
  const [apiBase, setApiBase] = useState<string>('');

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setLanguage(s.language);
      setVerbosity(s.verbosity);
      setVoice(s.voice || '');
      setApiBase(s.apiBase || '');
    })();
  }, []);

  async function save() {
    await saveSettings({ language, verbosity, voice: voice || undefined, apiBase: apiBase || undefined });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.label}>Language</Text>
        <Segmented options={['darija','ar','en']} value={language} onChange={(v)=>setLanguage(v as Language)} />

        <Text style={styles.label}>Verbosity</Text>
        <Segmented options={['brief','normal','detailed']} value={verbosity} onChange={(v)=>setVerbosity(v as Verbosity)} />

        <Text style={styles.label}>TTS Voice</Text>
        <TextInput style={styles.input} placeholder="Kore" placeholderTextColor={theme.colors.textMut} value={voice} onChangeText={setVoice} />

        <Text style={styles.label}>API Base (override)</Text>
        <TextInput style={styles.input} placeholder="http://192.168.1.10:4000" placeholderTextColor={theme.colors.textMut} value={apiBase} onChangeText={setApiBase} autoCapitalize="none" />

        <PrimaryButton title="Save" onPress={save} style={{ marginTop: theme.spacing(2) }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { padding: theme.spacing(2) },
  title: { ...theme.typography.title, color: theme.colors.text, marginBottom: theme.spacing(2) },
  label: { color: theme.colors.textMut, marginTop: theme.spacing(2), marginBottom: theme.spacing(1) },
  input: { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.md, padding: theme.spacing(1) },
});

