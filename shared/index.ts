// Main exports for @nadar/shared package

// Core handlers
export { handleAssist } from './core/assistCore';

// Adapters
export { createExpressAssistHandler } from './adapters/expressAdapter';
export { createVercelAssistHandler } from './adapters/vercelAdapter';

// Providers
export { GeminiProvider } from './providers/geminiProvider';
export { ConsoleTelemetryLogger, RingBufferTelemetryLogger } from './providers/telemetryProvider';

// Stores
export { MemoryImageStore, GlobalImageStore, VercelBlobImageStore } from './stores/imageStore';

// Types
export type {
  Result,
  ProviderError,
  ImageSignals,
  AssistRequest,
  AssistResponse,
  AssistDeps,
  AIProvider,
  TelemetryLogger,
  ImageStore,
  RequestContext,
  TelemetryData
} from './types/api';
