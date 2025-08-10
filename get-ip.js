#!/usr/bin/env node

/**
 * Simple script to help users find their IP address for Nadar mobile setup
 */

const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return null;
}

function main() {
  console.log('🔍 Finding your IP address for Nadar mobile setup...\n');
  
  const ip = getLocalIPAddress();
  
  if (ip) {
    console.log(`✅ Found your IP address: ${ip}`);
    console.log(`📱 Use this in Nadar mobile settings: http://${ip}:4000`);
    console.log('\n📋 Setup steps:');
    console.log('1. Start the server: cd server && npm run dev');
    console.log('2. Start the app: cd app && npm start');
    console.log('3. Scan QR code with Expo Go on your mobile device');
    console.log(`4. In Nadar Settings, enter: http://${ip}:4000`);
    console.log('5. Tap "Test Connection" to verify');
  } else {
    console.log('❌ Could not automatically detect IP address');
    console.log('\n🔧 Manual steps:');
    console.log('Windows: Run "ipconfig" and look for IPv4 Address');
    console.log('Mac/Linux: Run "ifconfig" and look for inet address');
    console.log('Look for addresses starting with 192.168 or 10.0');
  }
  
  console.log('\n💡 Alternative: Use tunnel mode for easier setup:');
  console.log('   cd app && npm run mobile');
}

if (require.main === module) {
  main();
}
