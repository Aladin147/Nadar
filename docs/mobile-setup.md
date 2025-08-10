# Nadar Mobile Setup Guide

## Quick Start (Recommended)

### Option 1: Tunnel Mode (Easiest)
1. **Start the server**: `cd server && npm run dev`
2. **Start the app with tunnel**: `cd app && npm run mobile`
3. **Scan QR code** with Expo Go app on your mobile device
4. **Use Nadar** - no additional configuration needed!

### Option 2: Local Network (Faster)
1. **Start the server**: `cd server && npm run dev`
2. **Find your computer's IP address**:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` (look for inet address)
3. **Start the app**: `cd app && npm start`
4. **Scan QR code** with Expo Go app
5. **Configure server** in Nadar Settings:
   - Go to Settings → Server IP Address
   - Enter `http://YOUR_IP:4000` (e.g., `http://192.168.1.100:4000`)
   - Tap "Test Connection" to verify

## Troubleshooting

### "Cannot reach server" error
- Make sure the Nadar server is running (`npm run dev` in server folder)
- Check your IP address is correct
- Ensure your mobile device and computer are on the same WiFi network
- Try the auto-discovery feature in Settings

### Camera not working
- Grant camera permissions when prompted
- Check device camera permissions in system settings

### Audio not playing
- Check device volume
- Ensure audio permissions are granted
- Try different TTS providers in Settings

## Network Requirements

- **Same WiFi Network**: Mobile device and computer must be connected to the same network
- **Firewall**: Ensure port 4000 is not blocked by firewall
- **Server Binding**: Server runs on 0.0.0.0:4000 (accessible from network)

## Development Notes

- **Tunnel Mode**: Uses Expo's tunnel service, slower but works anywhere
- **Local Network**: Direct connection, faster but requires network configuration
- **Demo Mode**: Removed - all functionality now works on mobile with proper server connection
