import { Platform } from 'react-native';

function guessLocalBase() {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // For mobile, return null to indicate no default server
  // Users will need to configure this in Settings or use tunnel mode
  return null;
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();
export const DEMO_MODE = false; // Demo mode removed

// Debug logging
console.log('API_BASE configured as:', API_BASE);
console.log('Platform:', Platform.OS);
console.log('Demo mode:', DEMO_MODE);

// Helper to check if API base is configured
export const isApiConfigured = () => {
  return API_BASE !== null && API_BASE !== 'DEMO_MODE';
};

