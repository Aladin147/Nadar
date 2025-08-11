import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { Card } from '../app/components/Card';
import { ScreenWrapper } from '../app/components/ScreenWrapper';
import { StyledText } from '../app/components/StyledText';
import { useAppState } from '../app/state/AppContext';
import { discoverApiBase, getConfigurationHelp } from '../utils/networkDiscovery';
import { saveSettings } from '../app/state/settings';

export default function MobileSetupScreen({ onComplete }: { onComplete: () => void }) {
  const { dispatch } = useAppState();
  const [isDiscovering, setIsDiscovering] = useState(false);

  async function handleAutoDiscover() {
    setIsDiscovering(true);

    try {
      const discovered = await discoverApiBase();

      if (discovered) {
        // Save the discovered API base
        const currentSettings = await import('../app/state/settings').then(m => m.loadSettings());
        await saveSettings({
          ...(await currentSettings),
          apiBase: discovered,
        });

        Alert.alert('Server Found!', `Connected to Nadar server at: ${discovered}`, [
          { text: 'Continue', onPress: onComplete },
        ]);
      } else {
        Alert.alert(
          'Server Not Found',
          'Could not find the Nadar server automatically. Please set it up manually in Settings.',
          [
            {
              text: 'Manual Setup',
              onPress: () => dispatch({ type: 'NAVIGATE', route: 'settings' }),
            },
            { text: 'Try Again', onPress: handleAutoDiscover },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Discovery Failed', 'Network discovery failed. Please configure manually.');
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleManualSetup() {
    const helpText = await getConfigurationHelp();
    Alert.alert('Manual Setup Instructions', helpText, [
      { text: 'Open Settings', onPress: () => dispatch({ type: 'NAVIGATE', route: 'settings' }) },
      { text: 'OK' },
    ]);
  }

  return (
    <ScreenWrapper style={styles.container}>
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.bg]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.header}>
        <StyledText variant="display" style={styles.logo}>
          📡
        </StyledText>
        <StyledText variant="title">Connection Required</StyledText>
        <StyledText color="textMut" style={styles.tagline}>
          Nadar needs to connect to the server app on your computer.
        </StyledText>
      </View>

      <Card variant="boldLight" style={styles.setupCard}>
        <StyledText variant="section" style={styles.setupTitle}>
          1. Start the Server
        </StyledText>
        <StyledText color="textMut" style={styles.setupDesc}>
          Open a terminal on your computer, navigate to the project's `server` directory, and run
          `npm run dev`.
        </StyledText>

        <StyledText variant="section" style={styles.setupTitle}>
          2. Connect
        </StyledText>
        <StyledText color="textMut" style={styles.setupDesc}>
          Make sure your phone and computer are on the **same WiFi network**.
        </StyledText>

        <PrimaryButton
          title={isDiscovering ? 'Searching...' : 'Find My Server'}
          onPress={handleAutoDiscover}
          disabled={isDiscovering}
        />
      </Card>

      <View style={styles.footer}>
        <SecondaryButton title="Manual Setup" onPress={handleManualSetup} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing(4),
    textAlign: 'center',
  },
  logo: {
    fontSize: 48,
    marginBottom: theme.spacing(2),
  },
  tagline: {
    marginTop: theme.spacing(1),
    textAlign: 'center',
    maxWidth: '80%',
  },
  setupCard: {
    padding: theme.spacing(3),
  },
  setupTitle: {
    marginBottom: theme.spacing(1),
  },
  setupDesc: {
    lineHeight: 22,
    marginBottom: theme.spacing(3),
  },
  footer: {
    marginTop: theme.spacing(4),
    alignItems: 'center',
  },
});
