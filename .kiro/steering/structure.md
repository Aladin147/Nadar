# Project Structure

## Repository Layout

```
nadar/
├── app/                    # React Native (Expo) mobile client
│   ├── src/
│   │   ├── screens/       # Landing, Capture, Results, History, Settings, MobileSetup
│   │   ├── app/           # UI kit, theme, state management, navigation
│   │   ├── api/           # API client (fetch wrappers, base URL resolution)
│   │   └── utils/         # Audio helpers, image downscale, network discovery
│   ├── assets/            # Images, fonts, static resources
│   └── package.json       # App dependencies and scripts
├── server/                 # Node.js TypeScript API server
│   ├── src/
│   │   ├── routes/        # /describe, /ocr, /qa, /tts endpoints
│   │   ├── providers/     # GeminiProvider, ElevenLabsProvider, HybridProvider
│   │   └── middleware/    # Rate limiting, logging, shared middleware
│   ├── dist/              # Compiled JavaScript output
│   └── package.json       # Server dependencies and scripts
├── api/                    # Vercel serverless functions
│   ├── *.ts               # Individual endpoint handlers
│   └── package.json       # Serverless function dependencies
├── docs/                   # Documentation and guides
│   ├── architecture.md    # System architecture overview
│   ├── mvp-scope.md      # MVP requirements and acceptance criteria
│   └── *.md              # Additional documentation
└── monitoring/            # Prometheus/Grafana configuration
```

## Key Conventions

### File Organization
- **Screens**: One file per screen in `app/src/screens/`
- **Components**: Reusable UI components in `app/src/app/components/`
- **Routes**: One file per endpoint in `server/src/routes/`
- **Providers**: AI service implementations in `server/src/providers/`

### Naming Patterns
- **React Components**: PascalCase (e.g., `CaptureScreen.tsx`)
- **API Routes**: kebab-case endpoints (e.g., `/describe`, `/tts`)
- **Utilities**: camelCase functions (e.g., `imageDownscale`, `resolveApiBase`)
- **Types/Interfaces**: PascalCase with descriptive names

### Import Structure
- **Relative imports**: For local files within same package
- **Absolute imports**: For cross-package dependencies
- **Provider interface**: All AI providers implement `IAIProvider`

### Configuration Files
- **Environment**: `.env` files for secrets (not committed)
- **TypeScript**: Strict mode enabled in both app and server
- **Package management**: npm with committed lockfiles
- **Testing**: Jest configuration in each package

### Deployment Structure
- **Server**: Can deploy to Fly.io, Railway, or VPS
- **API**: Vercel serverless functions as alternative
- **App**: Expo build system for mobile deployment
- **Docker**: Multi-stage builds with development/production configs