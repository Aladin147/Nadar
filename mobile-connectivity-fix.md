# Mobile Connectivity Troubleshooting Guide

## Current Status
- **Computer IP**: 192.168.100.24
- **Server**: Running on 0.0.0.0:4000 (accessible at 192.168.100.24:4000)
- **Metro Bundler**: Running on 0.0.0.0:8081 (accessible at 192.168.100.24:8081)

## Issue Analysis
1. **App won't load without tunnel**: Network discovery/Metro connection issue
2. **App loads with tunnel but can't reach server**: Server needs direct network access

## Solutions (Try in Order)

### Solution 1: Use Localhost Mode + Manual Server Config
This is often the most reliable approach:

```bash
# Kill current app
# Start app in localhost mode
cd app && npx expo start --localhost

# Then on mobile:
# 1. Scan QR code or manually enter: exp://192.168.100.24:8081
# 2. In app Settings, set API Base to: http://192.168.100.24:4000
# 3. Test connection
```

### Solution 2: Check Network Connectivity
Verify both devices are on the same network:

```bash
# On computer, check what's listening
netstat -an | findstr ":4000\|:8081"

# Test server accessibility
curl http://192.168.100.24:4000/health

# Test Metro bundler accessibility  
curl http://192.168.100.24:8081
```

### Solution 3: Windows Firewall Rule
Create explicit firewall rules:

```cmd
# Run as Administrator
netsh advfirewall firewall add rule name="Nadar Server" dir=in action=allow protocol=TCP localport=4000
netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
```

### Solution 4: Alternative Network Interfaces
Try binding to specific interface:

```bash
# Check all network interfaces
ipconfig

# If you have multiple networks, try:
cd app && EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --lan
```

### Solution 5: Use Tunnel for App + Direct IP for Server
Hybrid approach:

```bash
# Start app with tunnel (for app loading)
cd app && npm run mobile

# In mobile app Settings:
# Set API Base to: http://192.168.100.24:4000
# This uses tunnel for app, direct IP for server
```

### Solution 6: Check Mobile Device Network
On your mobile device:
1. **Verify WiFi**: Same network as computer (192.168.100.x)
2. **Check IP**: Should be 192.168.100.x range
3. **Test browser**: Try opening http://192.168.100.24:4000/health in mobile browser

## Debugging Commands

### Test Server Accessibility
```bash
# From computer
curl http://192.168.100.24:4000/health
curl http://localhost:4000/health

# Expected: {"ok":true}
```

### Test Metro Bundler
```bash
# From computer  
curl -I http://192.168.100.24:8081
curl -I http://localhost:8081

# Expected: HTTP/1.1 200 OK
```

### Check Network Ports
```bash
netstat -an | findstr ":4000\|:8081"

# Expected:
# TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING
# TCP    0.0.0.0:8081           0.0.0.0:0              LISTENING
```

## Common Issues & Fixes

### Issue: "Network request failed"
- **Cause**: Server not accessible from mobile
- **Fix**: Use tunnel mode for app, manual IP for server

### Issue: "App won't load"  
- **Cause**: Metro bundler not accessible
- **Fix**: Try localhost mode + manual QR entry

### Issue: "Connection timeout"
- **Cause**: Firewall or network routing
- **Fix**: Temporarily disable firewall, check network

### Issue: "Different network"
- **Cause**: Mobile on different subnet
- **Fix**: Ensure both devices on same WiFi network

## Recommended Approach

1. **Start with tunnel mode** (known working for app loading)
2. **Use manual server IP** (192.168.100.24:4000) in Settings
3. **Test step by step**: App loading → Server connection → Camera → Vision processing

This hybrid approach often works best for development.
