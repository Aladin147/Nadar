import { Platform } from 'react-native';
import * as Network from 'expo-network';

const PORT = 4000;

async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout for LAN is generous

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.ok === true;
    }
  } catch (error) {
    // Ignore network errors, timeouts, etc.
  }
  return false;
}

/**
 * Attempts to discover the correct API base for mobile devices
 * by scanning the local network. It prioritizes the device's own
 * subnet for a much faster and more reliable discovery.
 */
export async function discoverApiBase(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // On web, we can usually assume localhost.
    const url = `http://localhost:${PORT}`;
    if (await checkUrl(url)) {
      return url;
    }
    // Fallback for dev environments where localhost isn't the server
    const webUrl = `http://127.0.0.1:${PORT}`;
    if (await checkUrl(webUrl)) {
      return webUrl;
    }
    return null;
  }

  console.log('🔍 Starting network discovery for Nadar server...');

  const ipAddress = await Network.getIpAddressAsync();
  const subnet = ipAddress?.split('.').slice(0, 3).join('.');

  if (subnet) {
    console.log(`📱 Device IP detected: ${ipAddress}. Prioritizing subnet: ${subnet}.*`);

    const promises = [];
    for (let i = 1; i < 255; i++) {
      const testIp = `${subnet}.${i}`;
      const url = `http://${testIp}:${PORT}`;
      promises.push(checkUrl(url).then(ok => (ok ? url : null)));
    }

    const results = await Promise.all(promises);
    const foundUrl = results.find(url => url !== null);

    if (foundUrl) {
      console.log(`✅ Found Nadar server at: ${foundUrl}`);
      return foundUrl;
    }
    console.log(`🟡 No server found on primary subnet. Checking common fallbacks...`);
  } else {
    console.log(`🟡 Could not determine device subnet. Checking common fallbacks...`);
  }

  // Fallback to common subnets if primary scan fails
  const commonRanges = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
  // Filter out the subnet we already checked
  const rangesToScan = commonRanges.filter(r => r !== subnet);

  for (const range of rangesToScan) {
    const promises = [];
    for (let i = 1; i < 255; i++) {
      const testIp = `${range}.${i}`;
      const url = `http://${testIp}:${PORT}`;
      promises.push(checkUrl(url).then(ok => (ok ? url : null)));
    }
    const results = await Promise.all(promises);
    const foundUrl = results.find(url => url !== null);

    if (foundUrl) {
      console.log(`✅ Found Nadar server at: ${foundUrl} (fallback)`);
      return foundUrl;
    }
  }

  console.log('❌ Could not discover Nadar server on local network.');
  return null;
}

/**
 * Get the current machine's likely IP address for mobile configuration
 */
export async function getConfigurationHelp(): Promise<string> {
  let helpText = `To connect from mobile:
1. Find your computer's IP address:
   • Windows: Open Command Prompt, type "ipconfig"
   • Mac/Linux: Open Terminal, type "ifconfig"
2. Look for "IPv4 Address" or "inet".
3. Enter http://YOUR_IP:${PORT} in the Server IP field.
4. Make sure the Nadar server is running on your computer.`;

  try {
    const ipAddress = await Network.getIpAddressAsync();
    if (ipAddress) {
      const subnet = ipAddress.split('.').slice(0, 3).join('.');
      helpText = `Your phone's IP is ${ipAddress}.\nYour computer's IP address likely starts with "${subnet}".\n\n` + helpText;
    }
  } catch (e) {
    // Ignore error, just show generic help
  }

  return helpText;
}
