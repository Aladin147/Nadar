import { Platform } from 'react-native';

function guessLocalBase() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000'; // Android emulator loopback
  return 'http://localhost:4000';
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();

