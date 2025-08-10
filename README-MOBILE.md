# Nadar Mobile Testing Guide

## 🚀 Quick Start for Mobile Testing

### Prerequisites
1. **Install Expo Go** on your mobile device:
   - [Android: Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS: App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Ensure both devices are connected** to the same WiFi network

### Method 1: Tunnel Mode (Recommended for Testing)

```bash
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Start the app with tunnel
cd app  
npm run mobile
```

1. **Scan the QR code** with Expo Go app on your mobile device
2. **App will load** - no additional configuration needed!
3. **Test the flow**: Landing → Start Using Nadar → Capture Screen

### Method 2: Local Network (Faster Performance)

```bash
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Start the app normally
cd app
npm start
```

1. **Find your computer's IP address**:
   - Windows: Open Command Prompt, run `ipconfig`
   - Mac: Open Terminal, run `ifconfig`
   - Look for IPv4/inet address (usually starts with 192.168 or 10.0)

2. **Scan QR code** with Expo Go app

3. **Configure server in app**:
   - App will show "Mobile Setup Required" screen
   - Tap "Auto-Discover Server" (tries to find server automatically)
   - OR tap "Manual Setup" and enter `http://YOUR_IP:4000`

## 🔧 Mobile-Specific Features

### Consolidated Onboarding
- **Single landing screen** explains all three modes
- **One-click setup** requests all permissions at once
- **Direct transition** to capture screen (no multi-step onboarding)

### Smart Server Discovery
- **Auto-discovery** scans common IP ranges to find the server
- **Manual configuration** with helpful IP suggestions
- **Connection testing** before allowing app usage

### Mobile-Optimized Settings
- **Server IP configuration** with common address suggestions
- **Auto-discovery button** for easy setup
- **Clear instructions** for finding computer's IP address

## 📱 Testing Checklist

### Core Flow
- [ ] Landing screen shows properly on mobile
- [ ] "Start Using Nadar" button works
- [ ] Permissions are requested correctly
- [ ] Transitions to capture screen
- [ ] Camera view loads properly
- [ ] Mode switching (Scene/OCR/QA) works
- [ ] Image capture and analysis works
- [ ] Results screen displays correctly
- [ ] Audio playback works
- [ ] Navigation between screens works

### Mobile-Specific
- [ ] Server connectivity check works
- [ ] Auto-discovery finds the server
- [ ] Manual IP configuration works
- [ ] Connection testing provides clear feedback
- [ ] Error messages are helpful
- [ ] App works without tunnel mode (local network)

## 🐛 Common Issues & Solutions

### "Cannot reach server"
- Ensure server is running: `cd server && npm run dev`
- Check both devices are on same WiFi
- Try auto-discovery in Settings
- Verify IP address is correct

### "Camera not working"
- Grant camera permissions when prompted
- Check device camera permissions in system settings
- Restart the app if needed

### "App won't load"
- Check Expo Go app is updated
- Ensure QR code is scanned correctly
- Try refreshing the app in Expo Go

## 📊 Performance Notes

- **Tunnel Mode**: Slower but works anywhere (good for testing)
- **Local Network**: Faster, direct connection (better for development)
- **Server Response**: Should be under 3-5 seconds for most operations
