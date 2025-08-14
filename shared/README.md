# @nadar/shared - Shared Core Architecture

This package contains the shared business logic for Nadar API endpoints, implementing a clean architecture pattern that separates business logic from runtime concerns.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Vercel API    │    │   Express API   │
│   (Serverless)  │    │   (Traditional) │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          │   Thin Adapters      │
          │   (5-20 lines)       │
          │                      │
          └──────────┬───────────┘
                     │
          ┌──────────▼───────────┐
          │   Shared Core Logic  │
          │   (Business Rules)   │
          └──────────┬───────────┘
                     │
          ┌──────────▼───────────┐
          │  Provider Interfaces │
          │  (AI, Storage, etc.) │
          └──────────────────────┘
```

## Key Benefits

- **Single Source of Truth**: One implementation, multiple runtimes
- **Type Safety**: Full TypeScript support with proper error handling
- **Testability**: Dependency injection enables comprehensive testing
- **Maintainability**: Changes in one place propagate everywhere
- **Consistency**: Identical behavior across all deployment targets

## Package Structure

```
shared/
├── core/           # Pure business logic (runtime-agnostic)
│   ├── assistCore.ts    # AI vision assistance
│   ├── ocrCore.ts       # Text extraction
│   └── ttsCore.ts       # Text-to-speech
├── adapters/       # Runtime-specific adapters (thin)
│   ├── vercelAdapter.ts # Serverless functions
│   └── expressAdapter.ts # Traditional servers
├── providers/      # External service integrations
│   ├── geminiProvider.ts    # Google AI
│   └── telemetryProvider.ts # Logging
├── stores/         # Data persistence abstractions
│   └── imageStore.ts        # Image caching
├── types/          # Shared type definitions
│   └── api.ts              # Request/Response types
└── tests/          # Comprehensive test suite
    ├── core/              # Business logic tests
    ├── adapters/          # Contract tests
    └── mocks/             # Test utilities
```

## Core Principles

### 1. Dependency Injection
All core handlers accept a `deps` parameter containing all external dependencies:

```typescript
interface AssistDeps {
  providers: AIProvider;
  telemetry: TelemetryLogger;
  imageStore: ImageStore;
  now: () => number;
}
```

### 2. Result Pattern
All operations return a `Result<T>` type for consistent error handling:

```typescript
type Result<T> = 
  | { ok: true; data: T }
  | { ok: false; error: ProviderError }
```

### 3. Runtime Agnostic
Core business logic has zero dependencies on Express, Vercel, or any runtime.

## Usage Examples

### Creating a New Endpoint

1. **Define Core Handler** (`core/myFeature.ts`):
```typescript
export async function handleMyFeature(
  request: MyFeatureRequest,
  deps: MyFeatureDeps
): Promise<Result<MyFeatureResponse>> {
  // Pure business logic here
}
```

2. **Create Vercel Adapter** (`adapters/vercelAdapter.ts`):
```typescript
export function createVercelMyFeatureHandler(deps: MyFeatureDeps) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const coreRequest = mapVercelRequest(req);
    const result = await handleMyFeature(coreRequest, deps);
    
    if (result.ok) {
      res.status(200).json(result.data);
    } else {
      res.status(500).json({ error: result.error.message });
    }
  };
}
```

3. **Create Endpoint** (`api/my-feature.ts`):
```typescript
import { createVercelMyFeatureHandler } from '../shared/adapters/vercelAdapter';

const deps = { /* configure dependencies */ };
export default createVercelMyFeatureHandler(deps);
```

## Testing

The package includes comprehensive tests with high coverage:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Categories

- **Unit Tests**: Core business logic validation
- **Contract Tests**: Adapter behavior consistency
- **Integration Tests**: End-to-end functionality
- **Mock Providers**: Dependency injection testing

## Deployment

### Build
```bash
npm run build    # Build all outputs (ESM + CJS + Types)
npm run dev      # Watch mode for development
```

### Integration
```bash
# In your API project
npm install ../shared  # Local development
# or
npm install @nadar/shared  # Published package
```

## Migration Guide

### From Legacy Endpoints

1. **Identify Business Logic**: Extract core functionality from existing endpoint
2. **Create Core Handler**: Move logic to `core/` with dependency injection
3. **Create Adapter**: Map runtime requests/responses (5-20 lines)
4. **Add Tests**: Ensure behavior matches original
5. **Deploy & Verify**: Test in production
6. **Remove Legacy**: Clean up old implementation

### Example Migration

**Before** (Legacy):
```typescript
// api/legacy-endpoint.ts (100+ lines)
export default async function handler(req, res) {
  // Mixed business logic + runtime concerns
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  // ... 100 lines of mixed concerns
}
```

**After** (Shared Architecture):
```typescript
// shared/core/feature.ts (Pure business logic)
export async function handleFeature(request, deps) {
  // Clean business logic only
}

// api/feature-shared.ts (5 lines)
import { createVercelHandler } from '../shared/adapters/vercelAdapter';
const deps = { /* config */ };
export default createVercelHandler(deps);
```

## Performance

- **Build Time**: ~3s for full build (ESM + CJS + Types)
- **Bundle Size**: ~20KB per adapter (tree-shakeable)
- **Runtime Overhead**: <1ms per request
- **Test Coverage**: 81% core logic, 74% adapters

## Contributing

1. **Add Feature**: Create core handler + tests
2. **Add Adapter**: Implement runtime mapping
3. **Test**: Ensure contract compliance
4. **Document**: Update this README
5. **Deploy**: Build + test in production

## API Reference

See `types/api.ts` for complete type definitions and interfaces.
