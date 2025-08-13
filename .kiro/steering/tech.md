# Technology Stack

## Frontend (Mobile App)
- **Framework**: React Native with Expo (~53.0.20)
- **Language**: TypeScript (strict mode enabled)
- **Navigation**: React Navigation with bottom tabs
- **State Management**: Lightweight React Context
- **Camera**: Expo Camera for capture, Expo Image Picker for gallery
- **Audio**: Expo AV for TTS playback
- **Storage**: AsyncStorage for settings persistence

## Backend (Server)
- **Runtime**: Node.js 20+ with Express 5.x
- **Language**: TypeScript (strict, ES2020 target)
- **AI Provider**: Google Gemini 2.5 Flash for vision and TTS
- **Validation**: Zod schemas for request/response validation
- **Middleware**: Morgan logging, express-rate-limit, CORS

## API Layer (Vercel Functions)
- **Runtime**: Vercel Node.js functions
- **Same providers**: Gemini integration for serverless deployment

## Development Tools
- **Package Manager**: npm (lockfiles committed)
- **Testing**: Jest with ts-jest (server), jest-expo (app)
- **Linting**: ESLint + Prettier (app has quality script)
- **Build**: TypeScript compiler, Expo build system

## Common Commands

### Server Development
```bash
cd server
npm install
npm run dev          # Development with nodemon + ts-node
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled JavaScript
npm test            # Run Jest test suite
```

### App Development  
```bash
cd app
npm install
npm run web         # Web development
npm run mobile      # Expo tunnel for device testing
npm start           # Standard Expo start
npm run quality     # Type check + lint + format check
npm test           # Run Jest tests
```

### Root Level
```bash
npm run dev         # Concurrent server + app development
npm run dev:tunnel  # Development with tunnel setup
```

## Architecture Patterns
- **Provider Interface**: IAIProvider abstraction for AI services
- **Hybrid Provider**: Orchestrates provider selection and fallback
- **Error Handling**: ProviderError preservation across client-server
- **Telemetry**: Consistent error codes and debugging info
- **Rate Limiting**: Express middleware for API protection