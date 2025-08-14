// Mock providers for testing

import { AIProvider, TelemetryLogger, ImageStore, Result, ImageSignals, TelemetryData } from '../../types/api';

export class MockAIProvider implements AIProvider {
  private inspectionResult: Result<ImageSignals>;
  private responseResult: Result<string>;

  constructor(
    inspectionResult?: Result<ImageSignals>,
    responseResult?: Result<string>
  ) {
    this.inspectionResult = inspectionResult || {
      ok: true,
      data: {
        has_text: false,
        hazards: [],
        people_count: 0,
        lighting_ok: true,
        confidence: 0.85
      }
    };
    
    this.responseResult = responseResult || {
      ok: true,
      data: JSON.stringify({
        paragraph: "Test response paragraph",
        details: ["Detail 1", "Detail 2", "Detail 3"]
      })
    };
  }

  async inspectImage(image: Uint8Array, mimeType: string): Promise<Result<ImageSignals>> {
    return this.inspectionResult;
  }

  async generateResponse(image: Uint8Array, mimeType: string, prompt: string): Promise<Result<string>> {
    return this.responseResult;
  }

  // Test helpers
  setInspectionResult(result: Result<ImageSignals>) {
    this.inspectionResult = result;
  }

  setResponseResult(result: Result<string>) {
    this.responseResult = result;
  }
}

export class MockTelemetryLogger implements TelemetryLogger {
  public logs: TelemetryData[] = [];

  log(data: TelemetryData): void {
    this.logs.push(data);
  }

  // Test helpers
  getLastLog(): TelemetryData | undefined {
    return this.logs[this.logs.length - 1];
  }

  clear(): void {
    this.logs = [];
  }
}

export class MockImageStore implements ImageStore {
  private storage = new Map<string, Uint8Array>();
  private tokenCounter = 0;

  async save(buffer: Uint8Array, ttlMinutes?: number): Promise<string> {
    const token = `test-token-${++this.tokenCounter}`;
    this.storage.set(token, buffer);
    return token;
  }

  async get(token: string): Promise<Uint8Array | null> {
    return this.storage.get(token) || null;
  }

  // Test helpers
  clear(): void {
    this.storage.clear();
    this.tokenCounter = 0;
  }

  has(token: string): boolean {
    return this.storage.has(token);
  }
}
