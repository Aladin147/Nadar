import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Segmented } from '../app/components/Segmented';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { Card } from '../app/components/Card';
import { theme } from '../app/theme';
import { loadSettings, saveSettings, Language, Verbosity, TTSProvider } from '../app/state/settings';
import { testConnection } from '../api/client';
import { discoverApiBase, getConfigurationHelp } from '../utils/networkDiscovery';

export default function SettingsScreen() {
  const [language, setLanguage] = useState<Language>('darija');
  const [verbosity, setVerbosity] = useState<Verbosity>('brief');
  const [voice, setVoice] = useState<string>('');
  const [apiBase, setApiBase] = useState<string>('');
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('gemini');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Common IP address suggestions for mobile
  const commonIPs = [
    'http://192.168.1.100:4000',
    'http://192.168.0.100:4000',
    'http://10.0.0.100:4000',
    'http://172.16.0.100:4000'
  ];

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setLanguage(s.language);
      setVerbosity(s.verbosity);
      setVoice(s.voice || '');
      setApiBase(s.apiBase || '');
      setTtsProvider(s.ttsProvider || 'gemini');
    })();
  }, []);

  async function save() {
    await saveSettings({
      language,
      verbosity,
      voice: voice || undefined,
      apiBase: apiBase || undefined,
      ttsProvider
    });

    // Also update server-side provider if API is available
    try {
      const response = await fetch(`${apiBase || 'http://localhost:4000'}/tts/provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: ttsProvider })
      });
      if (response.ok) {
        console.log(`✅ Server TTS provider updated to: ${ttsProvider}`);
      }
    } catch (error) {
      console.log('⚠️ Could not update server TTS provider:', error);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Settings</Text>

        <Card style={{ marginBottom: theme.spacing(2) }}>
          <Text style={styles.label}>Language</Text>
          <Segmented options={['darija','ar','en']} value={language} onChange={(v)=>setLanguage(v as Language)} />

          <Text style={styles.label}>Verbosity</Text>
          <Segmented options={['brief','normal','detailed']} value={verbosity} onChange={(v)=>setVerbosity(v as Verbosity)} />

          <Text style={styles.label}>TTS Provider</Text>
          <Segmented
            options={['gemini', 'elevenlabs']}
            value={ttsProvider}
            onChange={(v) => setTtsProvider(v as TTSProvider)}
          />
          <Text style={styles.helperText}>
            Gemini: Free tier (15/day), good quality{'\n'}
            ElevenLabs: Higher quota, premium voices
          </Text>

          <Text style={styles.label}>TTS Voice</Text>
          <TextInput style={styles.input} placeholder="Kore" placeholderTextColor={theme.colors.textMut} value={voice} onChangeText={setVoice} />
          <Text style={styles.helperText}>
            {ttsProvider === 'gemini' ? 'Gemini voices: Kore, Charon, Aoede, Fenrir' : 'ElevenLabs: alloy, echo, fable, onyx, nova, shimmer'}
          </Text>
        </Card>

        <Card>
          <Text style={styles.label}>
            {Platform.OS === 'web' ? 'API Base (override)' : 'Server IP Address'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={Platform.OS === 'web' ? 'http://localhost:4000' : 'http://192.168.1.100:4000'}
            placeholderTextColor={theme.colors.textMut}
            value={apiBase}
            onChangeText={setApiBase}
            autoCapitalize="none"
            keyboardType={Platform.OS === 'web' ? 'default' : 'url'}
          />
          <Text style={styles.helperText}>
            {Platform.OS === 'web'
              ? 'Override the default localhost server address'
              : 'Enter your computer\'s IP address where the Nadar server is running. Find it by running "ipconfig" (Windows) or "ifconfig" (Mac/Linux) on your computer.'
            }
          </Text>
        </Card>

        <PrimaryButton title="Save" onPress={save} style={{ marginTop: theme.spacing(2) }} />

        {Platform.OS !== 'web' && (
          <View style={styles.ipSuggestions}>
            <Text style={styles.label}>Mobile Setup</Text>

            <SecondaryButton
              title={isDiscovering ? "Searching..." : "🔍 Auto-Discover Server"}
              style={{ marginBottom: theme.spacing(2) }}
              disabled={isDiscovering}
              onPress={async () => {
                setIsDiscovering(true);
                const discovered = await discoverApiBase();
                setIsDiscovering(false);

                if (discovered) {
                  setApiBase(discovered);
                  Alert.alert('Server Found!', `Found Nadar server at: ${discovered}`);
                } else {
                  Alert.alert('Server Not Found', getConfigurationHelp());
                }
              }}
            />

            <Text style={styles.helperText}>Or try these common addresses:</Text>
            <View style={styles.ipButtons}>
              {commonIPs.map((ip) => (
                <TouchableOpacity
                  key={ip}
                  style={styles.ipButton}
                  onPress={() => setApiBase(ip)}
                >
                  <Text style={styles.ipButtonText}>{ip.replace('http://', '').replace(':4000', '')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <SecondaryButton
          title={isTestingConnection ? "Testing..." : "Test Connection"}
          style={{ marginTop: theme.spacing(2) }}
          disabled={isTestingConnection}
          onPress={async () => {
            setIsTestingConnection(true);
            await save();
            const ok = await testConnection();
            setIsTestingConnection(false);
            Alert.alert(
              ok ? 'Server reachable' : 'Cannot reach server',
              ok
                ? '✅ Connected to API base'
                : '❌ Please check API base/IP and network. Make sure the Nadar server is running on your computer.'
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  inner: { padding: theme.spacing(3) },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing(3),
  },
  label: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    fontSize: 16,
    minHeight: 48,
  },
  helperText: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    fontSize: 12,
    marginTop: theme.spacing(1),
    lineHeight: 16,
  },
  ipSuggestions: {
    marginTop: theme.spacing(2),
  },
  ipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  ipButton: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(1.5),
  },
  ipButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});

