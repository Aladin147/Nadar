import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { theme, ui } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { SecondaryButton } from '../app/components/SecondaryButton';
import { Card } from '../app/components/Card';
import { useAppState } from '../app/state/AppContext';
import { testConnection } from '../api/client';
import { getConfigurationHelp } from '../utils/networkDiscovery';

export default function LandingScreen({ onSettings }: { onSettings: () => void }) {
  const { dispatch } = useAppState();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  async function handleStartNadar() {
    setIsRequestingPermissions(true);

    try {
      // For mobile, check server connectivity first
      if (Platform.OS !== 'web') {
        const isConnected = await testConnection();
        if (!isConnected) {
          setIsRequestingPermissions(false);
          Alert.alert(
            'Server Not Found',
            'Cannot connect to the Nadar server. Please configure the server IP address in Settings first.',
            [
              { text: 'Go to Settings', onPress: () => dispatch({ type: 'NAVIGATE', route: 'settings' }) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      }

      // Request camera permission
      if (!cameraPermission?.granted) {
        const cameraResult = await requestCameraPermission();
        if (!cameraResult.granted) {
          setIsRequestingPermissions(false);
          Alert.alert('Camera Access Required', 'Nadar needs camera access to analyze your surroundings.');
          return;
        }
      }

      // Request media library permission
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaResult.granted) {
        setIsRequestingPermissions(false);
        Alert.alert('Photo Library Access Required', 'Nadar needs photo library access to analyze existing images.');
        return;
      }

      // Mark onboarding as complete and navigate to capture
      dispatch({ type: 'COMPLETE_ONBOARDING' });
      dispatch({ type: 'NAVIGATE', route: 'capture' });
    } catch (error) {
      console.error('Setup failed:', error);
      Alert.alert('Setup Failed', 'There was an error setting up Nadar. Please try again.');
    } finally {
      setIsRequestingPermissions(false);
    }
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
          <Text style={styles.tagline}>AI-powered visual assistance for everyone</Text>
        </View>

        <View style={styles.modesSection}>
          <Card variant="boldLight" style={styles.modesCard}>
            <Text style={styles.modesTitle}>Three Ways to See</Text>

            <View style={styles.modesList}>
              <View style={styles.modeItem}>
                <Text style={styles.modeIcon}>📷</Text>
                <View style={styles.modeContent}>
                  <Text style={styles.modeLabel}>Scene</Text>
                  <Text style={styles.modeDesc}>Instant description of your surroundings</Text>
                </View>
              </View>

              <View style={styles.modeItem}>
                <Text style={styles.modeIcon}>📖</Text>
                <View style={styles.modeContent}>
                  <Text style={styles.modeLabel}>Read</Text>
                  <Text style={styles.modeDesc}>Text recognition for signs and documents</Text>
                </View>
              </View>

              <View style={styles.modeItem}>
                <Text style={styles.modeIcon}>❓</Text>
                <View style={styles.modeContent}>
                  <Text style={styles.modeLabel}>Ask</Text>
                  <Text style={styles.modeDesc}>Get answers about what you're looking at</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.ctas}>
          <PrimaryButton
            title={isRequestingPermissions ? "Setting up..." : "Start Using Nadar"}
            onPress={handleStartNadar}
            disabled={isRequestingPermissions}
          />
          <Text style={styles.permissionNote}>
            {Platform.OS === 'web'
              ? 'We\'ll request camera and photo access to get started'
              : 'Make sure the Nadar server is running on your computer first'
            }
          </Text>
        </View>

        <View style={styles.bottomActions}>
          {Platform.OS !== 'web' && (
            <SecondaryButton
              title="📡 Setup Server Connection"
              onPress={onSettings}
              style={styles.setupButton}
            />
          )}

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={styles.settingsText}>
              {Platform.OS === 'web' ? 'Settings' : 'Advanced Settings'}
            </Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing(8),
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
    color: theme.colors.textMut,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  modesSection: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: theme.spacing(4),
  },
  modesCard: {
    marginHorizontal: theme.spacing(2),
  },
  modesTitle: {
    ...theme.typography.section,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  modesList: {
    gap: theme.spacing(3),
  },
  modeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  modeIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  modeContent: {
    flex: 1,
  },
  modeLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  modeDesc: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    fontSize: 13,
    lineHeight: 18,
  },
  ctas: {
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  permissionNote: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    textAlign: 'center',
    marginTop: theme.spacing(2),
    fontSize: 12,
    lineHeight: 16,
  },
  bottomActions: {
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  setupButton: {
    minWidth: 200,
  },
  settingsButton: {
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
  },
  settingsText: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    textAlign: 'center',
    fontSize: 13,
  },
});

