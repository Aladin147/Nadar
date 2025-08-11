import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Segmented } from '../app/components/Segmented';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { Card } from '../app/components/Card';
import { theme } from '../app/theme';
import { ScreenWrapper } from '../app/components/ScreenWrapper';
import { StyledText } from '../app/components/StyledText';
import { Header } from '../app/components/Header';
import {
  loadSettings,
  saveSettings,
  Language,
  Verbosity,
  TTSProvider,
  TTSRate,
} from '../app/state/settings';
import { testConnection, setTTSProvider } from '../api/client';
import { discoverApiBase, getConfigurationHelp } from '../utils/networkDiscovery';
import { useAppState } from '../app/state/AppContext';

export default function SettingsScreen() {
  const { dispatch } = useAppState();
  const [language, setLanguage] = useState<Language>('darija');
  const [verbosity, setVerbosity] = useState<Verbosity>('brief');
  const [voice, setVoice] = useState<string>('');
  const [apiBase, setApiBase] = useState<string>('');
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('elevenlabs');
  const [ttsRate, setTtsRate] = useState<TTSRate>(1.0);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Common IP address suggestions for mobile
  const commonIPs = [
    'http://192.168.1.100:4000',
    'http://192.168.0.100:4000',
    'http://10.0.0.100:4000',
    'http://172.16.0.100:4000',
  ];

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setLanguage(s.language);
      setVerbosity(s.verbosity);
      setVoice(s.voice || '');
      setApiBase(s.apiBase || '');
      setTtsProvider(s.ttsProvider || 'elevenlabs');
      setTtsRate(s.ttsRate || 1.0);
    })();
  }, []);

  async function save() {
    await saveSettings({
      language,
      verbosity,
      voice: voice || undefined,
      apiBase: apiBase || undefined,
      ttsProvider,
      ttsRate,
    });

    // Also update server-side provider if API is available
    try {
      await setTTSProvider(ttsProvider);
      console.log(`✅ Server TTS provider updated to: ${ttsProvider}`);
    } catch (error) {
      console.log('⚠️ Could not update server TTS provider:', error);
    }
  }

  return (
    <ScreenWrapper>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <StyledText variant="section" style={styles.cardTitle}>
            Assistant
          </StyledText>
          <View style={styles.field}>
            <StyledText variant="meta" color="textMut" style={styles.label}>
              Language
            </StyledText>
            <Segmented
              options={['darija', 'ar', 'en']}
              value={language}
              onChange={v => setLanguage(v as Language)}
            />
          </View>
          <View style={styles.field}>
            <StyledText variant="meta" color="textMut" style={styles.label}>
              Verbosity
            </StyledText>
            <Segmented
              options={['brief', 'normal', 'detailed']}
              value={verbosity}
              onChange={v => setVerbosity(v as Verbosity)}
            />
          </View>
        </Card>

        <Card>
          <StyledText variant="section" style={styles.cardTitle}>
            Text-to-Speech (TTS)
          </StyledText>
          <View style={styles.field}>
            <StyledText variant="meta" color="textMut" style={styles.label}>
              TTS Provider
            </StyledText>
            <Segmented
              options={['gemini', 'elevenlabs']}
              value={ttsProvider}
              onChange={v => setTtsProvider(v as TTSProvider)}
            />
            <StyledText style={styles.helperText}>
              Gemini is free with a daily limit. ElevenLabs offers higher quality and quota.
            </StyledText>
          </View>
          <View style={styles.field}>
            <StyledText variant="meta" color="textMut" style={styles.label}>
              TTS Voice
            </StyledText>
            <TextInput
              style={styles.input}
              placeholder="Enter voice name"
              placeholderTextColor={theme.colors.textMut}
              value={voice}
              onChangeText={setVoice}
            />
            <StyledText style={styles.helperText}>
              {ttsProvider === 'gemini'
                ? 'Voices: Kore, Charon, etc.'
                : 'Voices: alloy, echo, etc.'}
            </StyledText>
          </View>
          <View style={styles.field}>
            <StyledText variant="meta" color="textMut" style={styles.label}>
              TTS Rate
            </StyledText>
            <Segmented
              options={['0.9×', '1.0×', '1.2×']}
              value={ttsRate === 0.9 ? '0.9×' : ttsRate === 1.2 ? '1.2×' : '1.0×'}
              onChange={v => {
                const rate = v === '0.9×' ? 0.9 : v === '1.2×' ? 1.2 : 1.0;
                setTtsRate(rate);
              }}
            />
          </View>
        </Card>

        <Card>
          <StyledText variant="section" style={styles.cardTitle}>
            Server
          </StyledText>
          <View style={styles.field}>
            <StyledText variant="meta" color="textMut" style={styles.label}>
              {Platform.OS === 'web' ? 'API Base (override)' : 'Server IP Address'}
            </StyledText>
            <TextInput
              style={styles.input}
              placeholder={'http://192.168.1.100:4000'}
              placeholderTextColor={theme.colors.textMut}
              value={apiBase}
              onChangeText={setApiBase}
              autoCapitalize="none"
              keyboardType={Platform.OS === 'web' ? 'default' : 'url'}
            />
          </View>
          {Platform.OS !== 'web' && (
            <View style={styles.field}>
              <SecondaryButton
                title={isDiscovering ? 'Searching...' : 'Auto-Discover Server'}
                disabled={isDiscovering}
                onPress={async () => {
                  setIsDiscovering(true);
                  const discovered = await discoverApiBase();
                  setIsDiscovering(false);
                  if (discovered) {
                    setApiBase(discovered);
                    Alert.alert('Server Found!', `Set server address to: ${discovered}`);
                  } else {
                    const helpText = await getConfigurationHelp();
                    Alert.alert('Server Not Found', helpText);
                  }
                }}
              />
            </View>
          )}
          <View>
            <SecondaryButton
              title={isTestingConnection ? 'Testing...' : 'Test Connection'}
              disabled={isTestingConnection}
              onPress={async () => {
                setIsTestingConnection(true);
                await save();
                const ok = await testConnection();
                setIsTestingConnection(false);
                Alert.alert(
                  ok ? 'Connection Successful' : 'Connection Failed',
                  ok
                    ? 'The app can connect to the server.'
                    : 'Please check the IP address and your network connection.'
                );
              }}
            />
          </View>
        </Card>

        <Card>
          <StyledText variant="section" style={styles.cardTitle}>
            Developer Tools
          </StyledText>
          <View style={styles.field}>
            <SecondaryButton
              title="Accessibility Test Mode"
              onPress={() => dispatch({ type: 'NAVIGATE', route: 'accessibility-test' })}
            />
            <StyledText variant="meta" color="textMut" style={styles.helperText}>
              Test screen reader functionality, focus order, and TTS announcements
            </StyledText>
          </View>
        </Card>

        <PrimaryButton
          title="Save Settings"
          onPress={save}
          style={{ marginTop: theme.spacing(2) }}
        />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(2),
    gap: theme.spacing(3),
  },
  cardTitle: {
    marginBottom: theme.spacing(2),
  },
  field: {
    marginBottom: theme.spacing(3),
  },
  label: {
    marginBottom: theme.spacing(1),
  },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    color: theme.colors.text,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    fontSize: 16,
  },
  helperText: {
    fontSize: 13,
    color: theme.colors.textMut,
    marginTop: theme.spacing(1),
    lineHeight: 18,
  },
});
