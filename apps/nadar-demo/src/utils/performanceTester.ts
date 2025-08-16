import { API_BASE } from '../config';

interface PerformanceTestResult {
  testType: string;
  networkLatencyMs: number;
  serverProcessingMs: number;
  totalRoundTripMs: number;
  payloadSizeBytes?: number;
  success: boolean;
  error?: string;
}

// Test network latency with simple echo
export async function testNetworkLatency(): Promise<PerformanceTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/performance-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'echo',
        payload: { timestamp: startTime }
      })
    });
    
    const endTime = Date.now();
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Test failed');
    }
    
    return {
      testType: 'network-latency',
      networkLatencyMs: endTime - startTime,
      serverProcessingMs: result.serverProcessingMs,
      totalRoundTripMs: endTime - startTime,
      success: true
    };
    
  } catch (error: any) {
    return {
      testType: 'network-latency',
      networkLatencyMs: Date.now() - startTime,
      serverProcessingMs: 0,
      totalRoundTripMs: Date.now() - startTime,
      success: false,
      error: error.message
    };
  }
}

// Test image processing overhead
export async function testImageProcessing(imageBase64: string): Promise<PerformanceTestResult> {
  const startTime = Date.now();
  const payloadSize = imageBase64.length;
  
  try {
    const response = await fetch(`${API_BASE}/api/performance-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'image-processing',
        payload: { imageBase64 }
      })
    });
    
    const endTime = Date.now();
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Test failed');
    }
    
    return {
      testType: 'image-processing',
      networkLatencyMs: endTime - startTime - result.imageProcessingMs,
      serverProcessingMs: result.imageProcessingMs,
      totalRoundTripMs: endTime - startTime,
      payloadSizeBytes: payloadSize,
      success: true
    };
    
  } catch (error: any) {
    return {
      testType: 'image-processing',
      networkLatencyMs: Date.now() - startTime,
      serverProcessingMs: 0,
      totalRoundTripMs: Date.now() - startTime,
      payloadSizeBytes: payloadSize,
      success: false,
      error: error.message
    };
  }
}

// Test AI simulation
export async function testAISimulation(): Promise<PerformanceTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE}/api/performance-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testType: 'ai-simulation',
        payload: {}
      })
    });
    
    const endTime = Date.now();
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Test failed');
    }
    
    return {
      testType: 'ai-simulation',
      networkLatencyMs: endTime - startTime - result.actualProcessingMs,
      serverProcessingMs: result.actualProcessingMs,
      totalRoundTripMs: endTime - startTime,
      success: true
    };
    
  } catch (error: any) {
    return {
      testType: 'ai-simulation',
      networkLatencyMs: Date.now() - startTime,
      serverProcessingMs: 0,
      totalRoundTripMs: Date.now() - startTime,
      success: false,
      error: error.message
    };
  }
}

// Run comprehensive performance test suite
export async function runPerformanceTestSuite(sampleImageBase64?: string): Promise<{
  networkLatency: PerformanceTestResult;
  imageProcessing?: PerformanceTestResult;
  aiSimulation: PerformanceTestResult;
  summary: {
    averageNetworkMs: number;
    averageServerMs: number;
    averageTotalMs: number;
    bottleneckAnalysis: string;
  };
}> {
  console.log('🧪 Running performance test suite...');
  
  // Test 1: Network latency
  const networkTest = await testNetworkLatency();
  console.log('📡 Network latency test:', networkTest);
  
  // Test 2: Image processing (if sample provided)
  let imageTest: PerformanceTestResult | undefined;
  if (sampleImageBase64) {
    imageTest = await testImageProcessing(sampleImageBase64);
    console.log('🖼️ Image processing test:', imageTest);
  }
  
  // Test 3: AI simulation
  const aiTest = await testAISimulation();
  console.log('🤖 AI simulation test:', aiTest);
  
  // Calculate averages and identify bottlenecks
  const tests = [networkTest, imageTest, aiTest].filter(Boolean) as PerformanceTestResult[];
  const avgNetwork = tests.reduce((sum, t) => sum + t.networkLatencyMs, 0) / tests.length;
  const avgServer = tests.reduce((sum, t) => sum + t.serverProcessingMs, 0) / tests.length;
  const avgTotal = tests.reduce((sum, t) => sum + t.totalRoundTripMs, 0) / tests.length;
  
  // Bottleneck analysis
  let bottleneck = 'unknown';
  if (avgNetwork > avgServer * 2) {
    bottleneck = 'network';
  } else if (avgServer > avgNetwork * 2) {
    bottleneck = 'server';
  } else {
    bottleneck = 'balanced';
  }
  
  const summary = {
    averageNetworkMs: Math.round(avgNetwork),
    averageServerMs: Math.round(avgServer),
    averageTotalMs: Math.round(avgTotal),
    bottleneckAnalysis: bottleneck
  };
  
  console.log('📊 Performance summary:', summary);
  
  return {
    networkLatency: networkTest,
    imageProcessing: imageTest,
    aiSimulation: aiTest,
    summary
  };
}

// Quick performance check for debugging
export async function quickPerformanceCheck(): Promise<string> {
  try {
    const start = Date.now();
    const result = await testNetworkLatency();
    const total = Date.now() - start;
    
    if (!result.success) {
      return `❌ Connection failed: ${result.error}`;
    }
    
    if (total > 2000) {
      return `🐌 Slow connection: ${total}ms total`;
    } else if (total > 1000) {
      return `⚠️ Moderate latency: ${total}ms total`;
    } else {
      return `✅ Good connection: ${total}ms total`;
    }
    
  } catch (error: any) {
    return `❌ Test failed: ${error.message}`;
  }
}
