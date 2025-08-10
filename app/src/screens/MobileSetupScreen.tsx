import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { Card } from '../app/components/Card';
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
          ...await currentSettings,
          apiBase: discovered
        });
        
        Alert.alert(
          'Server Found!', 
          `Connected to Nadar server at: ${discovered}`,
          [{ text: 'Continue', onPress: onComplete }]
        );
      } else {
        Alert.alert(
          'Server Not Found',
          'Could not find the Nadar server automatically. Please set it up manually in Settings.',
          [
            { text: 'Manual Setup', onPress: () => dispatch({ type: 'NAVIGATE', route: 'settings' }) },
            { text: 'Try Again', onPress: handleAutoDiscover }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Discovery Failed', 'Network discovery failed. Please configure manually.');
    } finally {
      setIsDiscovering(false);
    }
  }

  function handleManualSetup() {
    Alert.alert(
      'Manual Setup Instructions',
      getConfigurationHelp(),
      [
        { text: 'Open Settings', onPress: () => dispatch({ type: 'NAVIGATE', route: 'settings' }) },
        { text: 'OK' }
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.bg, '#0A1224', theme.colors.bg]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>نظر</Text>
          <Text style={styles.subtitle}>Nadar</Text>
          <Text style={styles.tagline}>Mobile Setup Required</Text>
        </View>

        <Card variant="boldLight" style={styles.setupCard}>
          <Text style={styles.setupTitle}>Connect to Server</Text>
          <Text style={styles.setupDesc}>
            Nadar needs to connect to the server running on your computer to provide AI analysis.
          </Text>
          
          <View style={styles.setupOptions}>
            <PrimaryButton
              title={isDiscovering ? "Searching..." : "🔍 Auto-Discover Server"}
              onPress={handleAutoDiscover}
              disabled={isDiscovering}
              style={styles.setupButton}
            />
            
            <SecondaryButton
              title="⚙️ Manual Setup"
              onPress={handleManualSetup}
              style={styles.setupButton}
            />
          </View>
        </Card>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Quick Setup:</Text>
          <Text style={styles.instructionText}>
            1. Make sure the Nadar server is running on your computer{'\n'}
            2. Ensure both devices are on the same WiFi network{'\n'}
            3. Tap "Auto-Discover Server" to find it automatically
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  inner: {
    padding: theme.spacing(3),
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  logo: {
    ...theme.typography.display,
    color: theme.colors.text,
    fontSize: 42,
    textAlign: 'center',
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    fontSize: 20,
    marginBottom: theme.spacing(1),
    fontWeight: '600',
  },
  tagline: {
    ...theme.typography.body,
    color: theme.colors.warning,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  setupCard: {
    marginBottom: theme.spacing(4),
  },
  setupTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  setupDesc: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing(3),
  },
  setupOptions: {
    gap: theme.spacing(2),
  },
  setupButton: {
    width: '100%',
  },
  instructions: {
    alignItems: 'center',
  },
  instructionTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing(1),
  },
  instructionText: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 13,
  },
});
