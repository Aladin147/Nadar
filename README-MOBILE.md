# Nadar Mobile Testing Guide

## 🚀 Quick Start for Mobile Development

The development workflow has been streamlined. You can now start both the server and the app with a single command from the root of the project.

### Prerequisites
1. **Install Expo Go** on your mobile device.
2. **Ensure your computer and mobile device are on the same WiFi network.**

### Single-Command Development
In a terminal at the project root, run:
```bash
npm run dev
```
This command starts both the backend server and the Expo development server for the mobile app.

### Connecting the App
1. **Scan the QR code** from the terminal using the Expo Go app on your phone.
2. The app will load and automatically discover the server running on your local network.
3. If the server is not found, the app will guide you through a quick manual setup, providing helpful hints based on your network.

---

## 🔧 Mobile-Specific Features

### Smart Server Discovery
The app's server discovery is now much more robust:
- **Intelligent Scan:** The app gets its own IP address and intelligently scans the entire local subnet to find the server almost instantly.
- **Reliable Connection:** This new method is significantly more reliable than the previous version and should work on most network configurations without manual setup.
- **Helpful Fallbacks:** In the rare case that auto-discovery fails, the manual setup screen provides improved instructions to help you connect.

### Consolidated Onboarding
- A single landing screen explains all modes.
- One-click setup requests all necessary permissions.
- Direct transition to the main capture screen.

---

## 📱 Testing Checklist

### Core Flow
- [ ] Landing screen shows properly on mobile.
- [ ] "Start Using Nadar" button works.
- [ ] Permissions are requested correctly.
- [ ] Transitions to capture screen.
- [ ] Camera view loads properly.
- [ ] Image capture and analysis works.
- [ ] Results screen displays correctly.
- [ ] Audio playback works.

### Mobile-Specific
- [ ] **Auto-discovery finds the server quickly and reliably.**
- [ ] Manual IP configuration works if needed.
- [ ] Connection testing provides clear feedback.
- [ ] The app works correctly on the local network.

---

## 🐛 Common Issues & Solutions

### "Cannot reach server"
- **Ensure the server is running:** The `npm run dev` command should be running in your terminal.
- **Check WiFi:** Verify that both your computer and mobile device are on the same WiFi network.
- **Firewall:** Check that your computer's firewall isn't blocking incoming connections on port 4000.

### "Camera not working"
- Grant camera permissions when prompted in the app.
- Check camera permissions in your device's system settings.

---

## 📊 Performance Notes

- **Local Network**: The `npm run dev` command sets up a direct, fast connection. This is the recommended way for development and testing.
- **Tunnel Mode**: For testing on external networks, you can still use `cd app && npm run mobile`. This is slower but does not require being on the same WiFi.
- **Server Response**: Should be under 3-5 seconds for most operations.
