import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { theme } from '../theme';
import { testConnection } from '../api/client';

type RootStackParamList = {
  Welcome: undefined;
  Capture: undefined;
  Results: { response: any };
};

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export default function WelcomeScreen({ navigation }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
    checkAudioPermissions();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const result = await testConnection();
      setIsConnected(result.ok);
    } catch (error) {
      console.error('Connection check failed:', error);
      setIsConnected(false);
    }
  };

  const checkAudioPermissions = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      setAudioPermission(status === 'granted');
    } catch (error) {
      console.error('Audio permission check failed:', error);
      setAudioPermission(false);
    }
  };

  const requestAllPermissions = async () => {
    setIsCheckingPermissions(true);
    
    try {
      // Request camera permission
      if (!cameraPermission?.granted) {
        const cameraResult = await requestCameraPermission();
        if (!cameraResult.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Nadar needs camera access to analyze your surroundings.',
            [{ text: 'OK' }]
          );
          setIsCheckingPermissions(false);
          return;
        }
      }

      // Request audio permission
      if (!audioPermission) {
        const audioResult = await Audio.requestPermissionsAsync();
        if (audioResult.status !== 'granted') {
          Alert.alert(
            'Audio Permission Required',
            'Nadar needs microphone access for voice input.',
            [{ text: 'OK' }]
          );
          setIsCheckingPermissions(false);
          return;
        }
        setAudioPermission(true);
      }

      // All permissions granted, navigate to capture screen
      navigation.navigate('Capture');
    } catch (error) {
      console.error('Permission request failed:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const allPermissionsGranted = cameraPermission?.granted && audioPermission;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>نظر</Text>
          <Text style={styles.subtitle}>Nadar AI Assistant</Text>
          <View style={[
            styles.statusDot, 
            { backgroundColor: isConnected ? theme.colors.success : theme.colors.error }
          ]} />
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to Nadar</Text>
          <Text style={styles.welcomeText}>
            Your intelligent AI assistant for visual understanding. 
            Nadar can analyze images and respond to your voice questions 
            in Moroccan Darija.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📷</Text>
            <Text style={styles.featureText}>Image Analysis</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎤</Text>
            <Text style={styles.featureText}>Voice Input</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔊</Text>
            <Text style={styles.featureText}>Audio Response</Text>
          </View>
        </View>

        {/* Permissions Status */}
        <View style={styles.permissionsSection}>
          <Text style={styles.permissionsTitle}>Required Permissions:</Text>
          
          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>
              {cameraPermission?.granted ? '✅' : '❌'}
            </Text>
            <Text style={styles.permissionText}>Camera Access</Text>
          </View>
          
          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>
              {audioPermission ? '✅' : '❌'}
            </Text>
            <Text style={styles.permissionText}>Microphone Access</Text>
          </View>
          
          <View style={styles.permissionItem}>
            <Text style={styles.permissionIcon}>
              {isConnected ? '✅' : '❌'}
            </Text>
            <Text style={styles.permissionText}>Server Connection</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.startButton,
            allPermissionsGranted && isConnected && styles.startButtonEnabled
          ]}
          onPress={allPermissionsGranted ? () => navigation.navigate('Capture') : requestAllPermissions}
          disabled={isCheckingPermissions}
        >
          {isCheckingPermissions ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.startButtonText}>
              {allPermissionsGranted ? 'Start Using Nadar' : 'Grant Permissions'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing(3),
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    ...theme.typography.h2,
    color: theme.colors.textMut,
    marginBottom: theme.spacing(2),
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  welcomeTitle: {
    ...theme.typography.h2,
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
  welcomeText: {
    ...theme.typography.body,
    color: theme.colors.textMut,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing(4),
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: theme.spacing(1),
  },
  featureText: {
    ...theme.typography.caption,
    textAlign: 'center',
  },
  permissionsSection: {
    marginBottom: theme.spacing(4),
  },
  permissionsTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: theme.spacing(2),
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  permissionIcon: {
    fontSize: 16,
    marginRight: theme.spacing(2),
    width: 20,
  },
  permissionText: {
    ...theme.typography.body,
    color: theme.colors.textMut,
  },
  startButton: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    opacity: 0.6,
  },
  startButtonEnabled: {
    backgroundColor: theme.colors.primary,
    opacity: 1,
  },
  startButtonText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
});
