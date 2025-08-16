# Nadar Mobile Testing Guide

**For complete setup and troubleshooting, see [docs/mobile-setup.md](docs/mobile-setup.md).**

## Quick Start

1. **Install Expo Go** on your mobile device
2. **Connect to same WiFi** as your development machine
3. **Run from project root:**

```bash
npm run dev
```

1. **Scan QR code** with Expo Go app

The app will automatically discover the server on your network.

## Key Features

- **Smart server discovery** - automatically finds local development server
- **Unified development** - single command starts both server and app
- **Robust connection** - works on most network configurations
- **Auto-permissions** - guided setup for camera and audio access

## Common Issues

- **"Cannot reach server"** → Check WiFi connection and firewall settings
- **"Camera not working"** → Grant permissions in Expo Go and system settings

For detailed troubleshooting, testing checklists, and alternative connection methods, see the complete guide at [docs/mobile-setup.md](docs/mobile-setup.md).
