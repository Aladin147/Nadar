import { Platform } from 'react-native';

function guessLocalBase() {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // For mobile, return null to indicate no default server
  // Users will need to configure this in Settings or use discovery
  return null;
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();

// Helper to check if API base is configured
export const isApiConfigured = () => {
  return API_BASE !== null;
};
