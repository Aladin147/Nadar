import { Platform } from 'react-native';

/**
 * Attempts to discover the correct API base for mobile devices
 * by testing common local network IP ranges
 */
export async function discoverApiBase(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  // Common local network IP ranges to test
  const commonRanges = [
    '192.168.1',
    '192.168.0', 
    '10.0.0',
    '172.16.0',
    '192.168.100'
  ];

  // Common host IPs to try within each range
  const hostIPs = [100, 101, 102, 103, 104, 105, 1, 2, 3, 4, 5];

  console.log('🔍 Starting network discovery for Nadar server...');

  for (const range of commonRanges) {
    for (const hostIP of hostIPs) {
      const testUrl = `http://${range}.${hostIP}:4000`;
      
      try {
        console.log(`Testing: ${testUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(`${testUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            console.log(`✅ Found Nadar server at: ${testUrl}`);
            return testUrl;
          }
        }
      } catch (error) {
        // Continue to next IP
        continue;
      }
    }
  }

  console.log('❌ Could not discover Nadar server on local network');
  return null;
}

/**
 * Get the current machine's likely IP address for mobile configuration
 */
export function getConfigurationHelp(): string {
  if (Platform.OS === 'web') {
    return 'Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux) to find your IP address, then enter http://YOUR_IP:4000';
  }
  
  return `To connect from mobile:
1. Find your computer's IP address:
   • Windows: Open Command Prompt, type "ipconfig"
   • Mac/Linux: Open Terminal, type "ifconfig"
2. Look for "IPv4 Address" or "inet" (usually starts with 192.168 or 10.0)
3. Enter http://YOUR_IP:4000 in the Server IP field
4. Make sure the Nadar server is running on your computer`;
}
