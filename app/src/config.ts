import { Platform } from 'react-native';

function guessLocalBase() {
  // Use public tunnel for mobile devices to bypass firewall
  return 'https://legal-games-behave.loca.lt';
}

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || guessLocalBase();

// Debug logging
console.log('API_BASE configured as:', API_BASE);

