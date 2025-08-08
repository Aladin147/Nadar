import { Platform } from 'react-native';

function guessLocalBase() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000'; // Android emulator loopback
  if (Platform.OS === 'ios') return 'http://192.168.100.24:4000'; // Actual network IP
  return 'http://192.168.100.24:4000'; // Use network IP for all mobile devices
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();

// Debug logging
console.log('API_BASE configured as:', API_BASE);

