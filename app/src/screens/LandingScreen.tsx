import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../app/theme';
import { PrimaryButton } from '../app/components/PrimaryButton';
import { useAppState } from '../app/state/AppContext';
import { testConnection } from '../api/client';

interface LandingScreenProps {
  onSettings: () => void;
}

export default function LandingScreen({ onSettings: _onSettings }: LandingScreenProps) {
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
              {
                text: 'Go to Settings',
                onPress: () => dispatch({ type: 'NAVIGATE', route: 'settings' }),
              },
              { text: 'Cancel', style: 'cancel' },
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
          Alert.alert(
            'Camera Access Required',
            'Nadar needs camera access to analyze your surroundings.'
          );
          return;
        }
      }

      // Request media library permission
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaResult.granted) {
        setIsRequestingPermissions(false);
        Alert.alert(
          'Photo Library Access Required',
          'Nadar needs photo library access to analyze existing images.'
        );
        return;
      }

      // Mark onboarding as complete and navigate to capture
      dispatch({ type: 'COMPLETE_ONBOARDING' });
      dispatch({ type: 'NAVIGATE', route: 'capture' });
    } catch {
      // Setup failed - error will be shown to user via Alert
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
        <View style={styles.content}>
          <Text style={styles.logo}>نظر</Text>
          <Text style={styles.subtitle}>Nadar</Text>
          <Text style={styles.tagline}>AI-powered visual assistance.</Text>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title={isRequestingPermissions ? 'Checking permissions...' : 'Start'}
            onPress={handleStartNadar}
            disabled={isRequestingPermissions}
          />
          <Text style={styles.permissionNote}>
            We&apos;ll request camera and photo library access to begin.
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
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    ...theme.typography.display,
    color: theme.colors.text,
    fontSize: 48,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontSize: 28,
    textAlign: 'center',
    marginTop: theme.spacing(1),
  },
  tagline: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    textAlign: 'center',
    fontSize: 18,
    marginTop: theme.spacing(1.5),
  },
  footer: {
    paddingBottom: theme.spacing(4),
  },
  permissionNote: {
    ...theme.typography.meta,
    color: theme.colors.textMut,
    textAlign: 'center',
    marginTop: theme.spacing(2),
    fontSize: 13,
    lineHeight: 18,
  },
});
