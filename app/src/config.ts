import { Platform } from 'react-native';

function guessLocalBase() {
  if (Platform.OS === 'web') return 'http://localhost:4000';
  // For mobile, use demo mode to bypass network issues
  return 'DEMO_MODE';
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();
export const DEMO_MODE = API_BASE === 'DEMO_MODE';

// Debug logging
console.log('API_BASE configured as:', API_BASE);

