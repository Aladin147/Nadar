# Nadar Mobile Setup Guide

## 🚀 Recommended Development Setup

The easiest and most reliable way to develop for mobile is to run the unified `dev` command from the project root.

1. **Connect to WiFi**: Ensure your computer and mobile device are on the **same WiFi network**.
2. **Start Everything**: Open a terminal in the project's root directory and run:
   ```bash
   npm run dev
   ```
3. **Scan the QR Code**: Use the Expo Go app on your mobile device to scan the QR code that appears in your terminal.

The mobile app will load and automatically discover the server on your network. Manual configuration is generally not needed anymore due to the improved discovery mechanism.

---

## Troubleshooting

### "Cannot reach server"
- **Is the server running?** Make sure the `npm run dev` command is still active in your terminal.
- **Are you on the same WiFi?** This is the most common issue. Double-check the network on both your computer and your mobile device.
- **Is a firewall blocking the connection?** Check your computer's firewall settings to ensure that connections to port 4000 are not being blocked.

### Camera / Audio Issues
- **Permissions:** Ensure you have granted camera and microphone permissions to the Expo Go app, both when prompted and in your phone's system settings.

---

## Alternative: Tunnel Mode

If you cannot be on the same WiFi network, you can use Expo's tunnel service. This is slower but works from anywhere.

1. **Start the server**: `cd server && npm run dev`
2. **Start the app with tunnel**: `cd app && npm run mobile`
3. **Scan the QR code**. The app will connect through an Expo relay service.
