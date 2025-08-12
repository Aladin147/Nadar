import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

function guessLocalBase() {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // For mobile, return null to indicate no default server
  // Users will need to configure this in Settings or use discovery
  return null;
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();

// Debug logging for tunnel mode
if (process.env.EXPO_PUBLIC_API_BASE) {
  console.log('🌐 Using tunnel API base:', process.env.EXPO_PUBLIC_API_BASE);
} else {
  console.log('🏠 Using local API base:', API_BASE);
}

// Helper to check if API base is configured
export const isApiConfigured = () => {
  return API_BASE !== null;
};

// Async version that checks actual stored settings
export const isApiConfiguredAsync = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return API_BASE !== null;
  }

  // Check environment variable first (for tunnel mode)
  if (process.env.EXPO_PUBLIC_API_BASE) {
    return true;
  }

  try {
    const settingsRaw = await AsyncStorage.getItem('nadar.settings.v1');
    if (!settingsRaw) return false;

    const settings = JSON.parse(settingsRaw);
    return settings.apiBase && settings.apiBase.trim() !== '';
  } catch {
    return false;
  }
};
