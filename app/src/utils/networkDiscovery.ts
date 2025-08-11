import { Platform } from 'react-native';
import * as Network from 'expo-network';

const PORT = 4000;
const MAX_CONCURRENT_CHECKS = 10; // Limit concurrent requests to reduce battery drain
const CHECK_TIMEOUT_MS = 300; // Reduced timeout for faster scanning

async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.ok === true;
    }
  } catch {
    // Ignore network errors, timeouts, etc.
  }
  return false;
}

/**
 * Scan IPs with bounded concurrency and early termination
 */
async function scanIpsWithConcurrency(ips: string[]): Promise<string | null> {
  let foundUrl: string | null = null;
  let index = 0;
  const activePromises = new Set<Promise<void>>();

  const processNext = async (): Promise<void> => {
    if (foundUrl || index >= ips.length) return;

    const currentIndex = index++;
    const ip = ips[currentIndex];
    const url = `http://${ip}:${PORT}`;

    try {
      const isValid = await checkUrl(url);
      if (isValid && !foundUrl) {
        foundUrl = url;
      }
    } catch {
      // Ignore individual failures
    }
  };

  // Start initial batch of concurrent checks
  while (activePromises.size < MAX_CONCURRENT_CHECKS && index < ips.length && !foundUrl) {
    const promise = processNext().finally(() => activePromises.delete(promise));
    activePromises.add(promise);
  }

  // Continue processing until all IPs are checked or server is found
  while (activePromises.size > 0 && !foundUrl) {
    await Promise.race(activePromises);

    // Start new checks to maintain concurrency level
    while (activePromises.size < MAX_CONCURRENT_CHECKS && index < ips.length && !foundUrl) {
      const promise = processNext().finally(() => activePromises.delete(promise));
      activePromises.add(promise);
    }
  }

  // Wait for remaining promises to complete
  await Promise.all(activePromises);

  return foundUrl;
}

/**
 * Generate prioritized list of IPs to scan
 */
function generatePrioritizedIps(deviceSubnet?: string): string[] {
  const ips: string[] = [];

  // Common development IPs (highest priority)
  const commonDevIps = [
    '192.168.1.1',
    '192.168.1.2',
    '192.168.1.10',
    '192.168.1.100',
    '192.168.0.1',
    '192.168.0.2',
    '192.168.0.10',
    '192.168.0.100',
    '10.0.0.1',
    '10.0.0.2',
    '10.0.0.10',
    '10.0.0.100',
    '172.16.0.1',
    '172.16.0.2',
    '172.16.0.10',
    '172.16.0.100',
  ];

  if (deviceSubnet) {
    // Add device subnet common IPs first
    const subnetCommon = [
      `${deviceSubnet}.1`,
      `${deviceSubnet}.2`,
      `${deviceSubnet}.10`,
      `${deviceSubnet}.100`,
      `${deviceSubnet}.101`,
      `${deviceSubnet}.102`,
    ];
    ips.push(...subnetCommon);

    // Add remaining device subnet IPs
    for (let i = 1; i < 255; i++) {
      const ip = `${deviceSubnet}.${i}`;
      if (!subnetCommon.includes(ip)) {
        ips.push(ip);
      }
    }
  }

  // Add common dev IPs (excluding device subnet ones already added)
  const deviceSubnetIps = deviceSubnet ? ips : [];
  for (const ip of commonDevIps) {
    if (!deviceSubnetIps.includes(ip)) {
      ips.push(ip);
    }
  }

  // Add remaining common subnets
  const commonRanges = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
  for (const range of commonRanges) {
    if (range !== deviceSubnet) {
      for (let i = 1; i < 255; i++) {
        const ip = `${range}.${i}`;
        if (!ips.includes(ip)) {
          ips.push(ip);
        }
      }
    }
  }

  return ips;
}

/**
 * Attempts to discover the correct API base for mobile devices
 * by scanning the local network with optimized strategy and bounded concurrency.
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

  const ipAddress = await Network.getIpAddressAsync();
  const subnet = ipAddress?.split('.').slice(0, 3).join('.');

  // Generate prioritized IP list
  const prioritizedIps = generatePrioritizedIps(subnet);

  // Scan with bounded concurrency and early termination
  const foundUrl = await scanIpsWithConcurrency(prioritizedIps);

  if (foundUrl) {
    return foundUrl;
  }

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
      helpText = `Your phone's IP is ${ipAddress}.\nYour computer's IP address likely starts with "${subnet}".\n\n${
        helpText
      }`;
    }
  } catch {
    // Ignore error, just show generic help
  }

  return helpText;
}
