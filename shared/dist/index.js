// core/assistCore.ts
function createSystemPrompt(language, signals, question) {
  const langDir = language === "ar" ? "\u0627\u0643\u062A\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649" : language === "darija" ? "\u0627\u0643\u062A\u0628 \u0628\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629" : "Write in English";
  return `${langDir} You are \u0646\u0638\u0631 (Nadar), helping blind users navigate safely.

Format your response as a JSON object with exactly these fields:
{
  "paragraph": "One short ${language === "darija" ? "Darija" : language} paragraph (\u22642 sentences) with safety/next-step first",
  "details": ["Additional detail 1", "Additional detail 2", "Additional detail 3"],
  "has_text_content": ${signals?.has_text ? "true" : "false"}
}

For the paragraph:
- Start with safety information or immediate next steps
- Keep to maximum 2 sentences in ${language === "darija" ? "Darija" : language}
- Be actionable and concise
${question ? "- Answer the specific question first, then provide context" : ""}
${signals?.has_text ? "- IMPORTANT: Since text was detected, mention the visible text content prominently in your response" : "- Focus on scene description and navigation guidance"}

For details array:
- Provide 2-4 additional bullet points for "More" expansion
- Include objects, navigation guidance, environmental context
${signals?.has_text ? "- Include text-related details since text was detected" : ""}
- Keep each detail concise but informative

Don't identify people; avoid reading private screens; express uncertainty when unsure. Never use phrases like "as you can see" or "if you look".`;
}
function parseResponse(responseText) {
  try {
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(cleanedResponse);
    if (parsed.paragraph && Array.isArray(parsed.details)) {
      return {
        paragraph: parsed.paragraph,
        details: parsed.details
      };
    }
  } catch (parseError) {
    console.warn("Failed to parse single-paragraph JSON response, using fallback:", responseText);
  }
  return {
    paragraph: responseText,
    details: []
  };
}
function createFollowupSuggestions(language) {
  return language === "darija" ? [
    "\u0646\u0642\u0631\u0627 \u0627\u0644\u0646\u0635 \u0643\u0627\u0645\u0644\u061F",
    "\u0641\u064A\u0646 \u0627\u0644\u0645\u0645\u0631 \u0627\u0644\u062E\u0627\u0644\u064A\u061F",
    "\u0634\u0646\u0648 \u0643\u0627\u064A\u0646 \u062D\u062F\u0627\u064A\u061F"
  ] : [
    "Read all text?",
    "Where is the clear path?",
    "What is next to me?"
  ];
}
async function handleAssist(request, deps) {
  const startTime = deps.now();
  try {
    let image;
    if (request.image) {
      image = request.image;
    } else if (request.imageRef) {
      const cachedImage = await deps.imageStore.get(request.imageRef);
      if (!cachedImage) {
        const error = {
          message: `No cached image found for imageRef: ${request.imageRef}`,
          err_code: "IMAGE_NOT_FOUND"
        };
        deps.telemetry.log({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          mode: "assist",
          engine: "gemini",
          route_path: "/assist",
          image_bytes: 0,
          audio_bytes_in: 0,
          total_ms: deps.now() - startTime,
          model_ms: 0,
          tts_ms: 0,
          chars_out: 0,
          ok: false,
          err_code: error.err_code,
          request_id: request.sessionId
        });
        return { ok: false, error };
      }
      image = cachedImage;
    } else {
      const error = {
        message: "No valid image provided",
        err_code: "INVALID_IMAGE"
      };
      deps.telemetry.log({
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        mode: "assist",
        engine: "gemini",
        route_path: "/assist",
        image_bytes: 0,
        audio_bytes_in: 0,
        total_ms: deps.now() - startTime,
        model_ms: 0,
        tts_ms: 0,
        chars_out: 0,
        ok: false,
        err_code: error.err_code,
        request_id: request.sessionId
      });
      return { ok: false, error };
    }
    const inspectionStart = deps.now();
    const signalsResult = await deps.providers.inspectImage(image, "image/jpeg");
    if (!signalsResult.ok) {
      const errorResult = signalsResult;
      return { ok: false, error: errorResult.error };
    }
    const signals = signalsResult.data;
    const inspectionTime = deps.now() - inspectionStart;
    const processingStart = deps.now();
    const language = request.language || "darija";
    const systemPrompt = createSystemPrompt(language, signals, request.question);
    const defaultPrompt = request.question || (language === "darija" ? "\u0633\u0627\u0639\u062F\u0646\u064A \u0646\u0641\u0647\u0645 \u0634\u0646\u0648 \u0643\u0627\u064A\u0646 \u0641\u0647\u0627\u062F \u0627\u0644\u0635\u0648\u0631\u0629" : "Help me understand what is in this image");
    const responseResult = await deps.providers.generateResponse(
      image,
      "image/jpeg",
      `${systemPrompt}

User: ${defaultPrompt}`
    );
    if (!responseResult.ok) {
      const errorResult = responseResult;
      return { ok: false, error: errorResult.error };
    }
    const processingTime = deps.now() - processingStart;
    const { paragraph, details } = parseResponse(responseResult.data);
    const followup_suggest = createFollowupSuggestions(language);
    const followupToken = await deps.imageStore.save(image, 5);
    const totalTime = deps.now() - startTime;
    deps.telemetry.log({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: request.question ? "qa" : "describe",
      engine: "gemini",
      route_path: "/assist",
      image_bytes: image.length,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: processingTime,
      tts_ms: 0,
      chars_out: paragraph.length + details.join("").length,
      signals,
      ok: true,
      request_id: request.sessionId
    });
    return {
      ok: true,
      data: {
        speak: paragraph,
        details,
        signals,
        followup_suggest,
        followupToken,
        timing: {
          inspection_ms: inspectionTime,
          processing_ms: processingTime,
          total_ms: totalTime
        }
      }
    };
  } catch (error) {
    const totalTime = deps.now() - startTime;
    deps.telemetry.log({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: "assist",
      engine: "gemini",
      route_path: "/assist",
      image_bytes: 0,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: 0,
      tts_ms: 0,
      chars_out: 0,
      ok: false,
      err_code: error.err_code || "UNKNOWN",
      request_id: request.sessionId
    });
    return {
      ok: false,
      error: {
        message: error.message || "Internal server error",
        err_code: error.err_code || "UNKNOWN",
        details: error.details
      }
    };
  }
}

// adapters/expressAdapter.ts
function mapExpressRequest(req) {
  const body = req.body;
  let image;
  if (body.imageBase64) {
    image = new Uint8Array(Buffer.from(body.imageBase64, "base64"));
  }
  return {
    sessionId: body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    image,
    imageRef: body.imageRef,
    question: body.question,
    language: body.options?.language || body.language || "darija",
    verbosity: body.options?.verbosity || body.verbosity || "normal"
  };
}
function createExpressAssistHandler(deps) {
  return async (req, res) => {
    try {
      const coreRequest = mapExpressRequest(req);
      const result = await handleAssist(coreRequest, deps);
      if (result.ok) {
        res.json(result.data);
      } else {
        const statusCode = result.error.err_code === "VALIDATION_ERROR" ? 400 : 500;
        res.status(statusCode).json({
          error: result.error.message,
          err_code: result.error.err_code,
          details: result.error.details
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error.message || "Internal server error",
        err_code: "UNKNOWN"
      });
    }
  };
}

// adapters/vercelAdapter.ts
function handleResult(result, res) {
  if (result.ok) {
    res.status(200).json(result.data);
  } else {
    const errorResult = result;
    const statusCode = errorResult.error.err_code === "VALIDATION_ERROR" ? 400 : 500;
    res.status(statusCode).json({
      error: errorResult.error.message,
      err_code: errorResult.error.err_code,
      details: errorResult.error.details
    });
  }
}
function mapVercelRequest(req) {
  const body = req.body;
  let image;
  if (body.imageBase64) {
    image = new Uint8Array(Buffer.from(body.imageBase64, "base64"));
  }
  return {
    sessionId: body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    image,
    imageRef: body.imageRef,
    question: body.question,
    language: body.options?.language || body.language || "darija",
    verbosity: body.options?.verbosity || body.verbosity || "normal"
  };
}
function createVercelAssistHandler(deps) {
  return async (req, res) => {
    res.setHeader("cache-control", "no-store");
    res.setHeader("x-handler", "shared-core");
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
        err_code: "METHOD_NOT_ALLOWED"
      });
    }
    try {
      const coreRequest = mapVercelRequest(req);
      const result = await handleAssist(coreRequest, deps);
      handleResult(result, res);
    } catch (error) {
      res.status(500).json({
        error: error.message || "Internal server error",
        err_code: "UNKNOWN"
      });
    }
  };
}

// providers/geminiProvider.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// utils/performance.ts
var DEFAULT_PERFORMANCE_CONFIG = {
  fastModel: "gemini-2.5-flash-lite",
  // Fastest for inspection
  qualityModel: "gemini-2.5-flash",
  // Balanced for main response
  maxPromptLength: 1e3,
  // Shorter prompts = faster
  useCompactPrompts: true,
  // Use optimized prompt templates
  maxImageSize: 1024 * 1024,
  // 1MB max before compression
  compressionQuality: 0.8,
  // Good quality/speed balance
  enableParallelInspection: false,
  // Keep sequential for now
  enableResponseCache: true,
  // Cache similar requests
  cacheKeyFields: ["image_hash", "language", "question_type"]
};
function optimizeImageForAI(imageBuffer, config) {
  if (imageBuffer.length <= config.maxImageSize) {
    return imageBuffer;
  }
  console.log(`\u26A1 Image size ${imageBuffer.length} bytes exceeds ${config.maxImageSize}, compression needed`);
  return imageBuffer;
}
var ResponseCache = class {
  cache = /* @__PURE__ */ new Map();
  defaultTTL = 5 * 60 * 1e3;
  // 5 minutes
  generateKey(imageHash, language, question) {
    const questionType = question ? "qa" : "describe";
    return `${imageHash}-${language}-${questionType}`;
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }
  set(key, response, ttl) {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  clear() {
    this.cache.clear();
  }
  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
};
var globalResponseCache = new ResponseCache();
var PerformanceMonitor = class {
  metrics = [];
  cacheHits = 0;
  cacheMisses = 0;
  errors = 0;
  maxSamples = 1e3;
  recordRequest(responseTimeMs, wasCacheHit, wasError) {
    this.metrics.push(responseTimeMs);
    if (this.metrics.length > this.maxSamples) {
      this.metrics.shift();
    }
    if (wasCacheHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    if (wasError) {
      this.errors++;
    }
  }
  getMetrics() {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        lastUpdated: Date.now()
      };
    }
    const sorted = [...this.metrics].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const totalRequests = this.metrics.length;
    return {
      totalRequests,
      averageResponseTime: this.metrics.reduce((a, b) => a + b, 0) / this.metrics.length,
      p95ResponseTime: sorted[p95Index] || 0,
      cacheHitRate: totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0,
      errorRate: totalRequests > 0 ? this.errors / totalRequests : 0,
      lastUpdated: Date.now()
    };
  }
  reset() {
    this.metrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
  }
};
var globalPerformanceMonitor = new PerformanceMonitor();
function simpleHash(data) {
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 1e3); i++) {
    hash = (hash << 5) - hash + data[i] & 4294967295;
  }
  return hash.toString(36);
}

// utils/reliability.ts
var DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1e3,
  // Start with 1s delay
  maxDelayMs: 1e4,
  // Max 10s delay
  backoffMultiplier: 2,
  // Exponential backoff
  retryableErrors: [
    "RATE_LIMIT",
    "TIMEOUT",
    "NETWORK_ERROR",
    "SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR"
  ],
  timeoutMs: 3e4
  // 30s timeout per attempt
};
var DEFAULT_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  // Open after 5 failures
  recoveryTimeoutMs: 6e4,
  // Try recovery after 1 minute
  successThreshold: 2,
  // Close after 2 successes
  monitoringWindowMs: 3e5
  // 5-minute monitoring window
};
async function withRetry(operation, config = DEFAULT_RETRY_CONFIG, context = "operation") {
  let lastError = null;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`\u{1F504} ${context}: Attempt ${attempt}/${config.maxAttempts}`);
      const result = await Promise.race([
        operation(),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Operation timeout")), config.timeoutMs)
        )
      ]);
      if (result.ok) {
        if (attempt > 1) {
          console.log(`\u2705 ${context}: Succeeded on attempt ${attempt}`);
        }
        return result;
      }
      const errorResult = result;
      const enhancedError = enhanceError(errorResult.error, config);
      lastError = enhancedError;
      if (!enhancedError.isRetryable || attempt === config.maxAttempts) {
        console.log(`\u274C ${context}: Non-retryable error or max attempts reached`);
        return { ok: false, error: enhancedError };
      }
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      console.log(`\u23F3 ${context}: Retrying in ${delay}ms (attempt ${attempt + 1})`);
      await sleep(delay);
    } catch (error) {
      const enhancedError = enhanceError({
        message: error.message || "Unknown error",
        err_code: "UNKNOWN"
      }, config);
      lastError = enhancedError;
      if (attempt === config.maxAttempts) {
        console.log(`\u274C ${context}: Max attempts reached with exception`);
        return { ok: false, error: enhancedError };
      }
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      console.log(`\u23F3 ${context}: Exception, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  return { ok: false, error: lastError };
}
var CircuitBreaker = class {
  state = "CLOSED" /* CLOSED */;
  failures = [];
  successes = 0;
  lastFailureTime = 0;
  config;
  name;
  constructor(name, config = DEFAULT_CIRCUIT_CONFIG) {
    this.name = name;
    this.config = config;
  }
  async execute(operation) {
    if (this.state === "OPEN" /* OPEN */) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeoutMs) {
        console.log(`\u{1F6AB} Circuit breaker ${this.name} is OPEN, rejecting request`);
        return {
          ok: false,
          error: {
            message: `Service ${this.name} is temporarily unavailable`,
            err_code: "CIRCUIT_OPEN"
          }
        };
      } else {
        this.state = "HALF_OPEN" /* HALF_OPEN */;
        this.successes = 0;
        console.log(`\u{1F504} Circuit breaker ${this.name} trying HALF_OPEN`);
      }
    }
    try {
      const result = await operation();
      if (result.ok) {
        this.onSuccess();
        return result;
      } else {
        this.onFailure();
        return result;
      }
    } catch (error) {
      this.onFailure();
      return {
        ok: false,
        error: {
          message: error.message || "Circuit breaker caught exception",
          err_code: "CIRCUIT_ERROR"
        }
      };
    }
  }
  onSuccess() {
    this.successes++;
    if (this.state === "HALF_OPEN" /* HALF_OPEN */) {
      if (this.successes >= this.config.successThreshold) {
        this.state = "CLOSED" /* CLOSED */;
        this.failures = [];
        console.log(`\u2705 Circuit breaker ${this.name} is now CLOSED`);
      }
    }
  }
  onFailure() {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures = this.failures.filter(
      (time) => now - time < this.config.monitoringWindowMs
    );
    this.failures.push(now);
    if (this.failures.length >= this.config.failureThreshold) {
      this.state = "OPEN" /* OPEN */;
      this.successes = 0;
      console.log(`\u{1F6AB} Circuit breaker ${this.name} is now OPEN`);
    }
  }
  getState() {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes
    };
  }
  reset() {
    this.state = "CLOSED" /* CLOSED */;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = 0;
    console.log(`\u{1F504} Circuit breaker ${this.name} manually reset`);
  }
};
var geminiCircuitBreaker = new CircuitBreaker("Gemini");
var elevenLabsCircuitBreaker = new CircuitBreaker("ElevenLabs");
function enhanceError(error, config) {
  const isRetryable = config.retryableErrors.includes(error.err_code);
  let suggestedAction = "Contact support if problem persists";
  let isTemporary = false;
  switch (error.err_code) {
    case "RATE_LIMIT":
      suggestedAction = "Reduce request frequency or upgrade API plan";
      isTemporary = true;
      break;
    case "TIMEOUT":
      suggestedAction = "Check network connection and try again";
      isTemporary = true;
      break;
    case "NETWORK_ERROR":
      suggestedAction = "Check internet connection";
      isTemporary = true;
      break;
    case "SERVICE_UNAVAILABLE":
      suggestedAction = "Service is temporarily down, try again later";
      isTemporary = true;
      break;
    case "INVALID_IMAGE":
      suggestedAction = "Use a different image or check image format";
      isTemporary = false;
      break;
    case "MISSING_API_KEY":
      suggestedAction = "Configure API key in environment variables";
      isTemporary = false;
      break;
  }
  return {
    ...error,
    isRetryable,
    isTemporary,
    suggestedAction
  };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function checkServiceHealth(serviceName, healthCheck, circuitBreaker) {
  const startTime = Date.now();
  try {
    const isHealthy = await Promise.race([
      healthCheck(),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Health check timeout")), 5e3)
      )
    ]);
    const responseTime = Date.now() - startTime;
    return {
      service: serviceName,
      status: isHealthy ? "healthy" : "unhealthy",
      responseTime,
      lastCheck: (/* @__PURE__ */ new Date()).toISOString(),
      circuitState: circuitBreaker?.getState().state,
      details: isHealthy ? "Service responding normally" : "Service check failed"
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: serviceName,
      status: "unhealthy",
      responseTime,
      lastCheck: (/* @__PURE__ */ new Date()).toISOString(),
      circuitState: circuitBreaker?.getState().state,
      details: error.message || "Health check failed"
    };
  }
}

// providers/geminiProvider.ts
var GeminiProvider = class {
  genAI;
  config;
  retryConfig;
  constructor(apiKey, config, retryConfig) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }
  async inspectImage(image, mimeType) {
    return await geminiCircuitBreaker.execute(async () => {
      return await withRetry(async () => {
        return await this.performInspection(image, mimeType);
      }, this.retryConfig, "Gemini Image Inspection");
    });
  }
  async performInspection(image, mimeType) {
    const startTime = Date.now();
    try {
      const model = this.genAI.getGenerativeModel({ model: this.config.fastModel });
      const prompt = `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean (true if any readable text is visible),
  "hazards": string[] (list of safety hazards like "moving vehicle", "stairs", "obstacle", max 3),
  "people_count": number (count of people visible, 0-10+),
  "lighting_ok": boolean (true if lighting is adequate for clear vision),
  "confidence": number (0.0-1.0, overall confidence in analysis)
}

Be concise and accurate. Return only valid JSON.`;
      const optimizedImage = optimizeImageForAI(image, this.config);
      const imageBase64 = Buffer.from(optimizedImage).toString("base64");
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType
          }
        }
      ]);
      const responseText = result.response.text().trim();
      try {
        const signals = JSON.parse(responseText);
        const responseTime = Date.now() - startTime;
        globalPerformanceMonitor.recordRequest(responseTime, false, false);
        console.log(`\u26A1 Fast inspection completed in ${responseTime}ms`);
        return {
          ok: true,
          data: {
            has_text: Boolean(signals.has_text),
            hazards: Array.isArray(signals.hazards) ? signals.hazards.slice(0, 3).map(String) : [],
            people_count: Math.max(0, Math.min(10, Number(signals.people_count) || 0)),
            lighting_ok: Boolean(signals.lighting_ok),
            confidence: Math.max(0, Math.min(1, Number(signals.confidence) || 0))
          }
        };
      } catch (parseError) {
        console.warn("Failed to parse image inspector JSON:", responseText);
        return {
          ok: true,
          data: {
            has_text: responseText.toLowerCase().includes("text"),
            hazards: [],
            people_count: 0,
            lighting_ok: true,
            confidence: 0.5
          }
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      globalPerformanceMonitor.recordRequest(responseTime, false, true);
      console.error("Image inspection failed:", error);
      let errorCode = "INSPECTION_ERROR";
      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        errorCode = "RATE_LIMIT";
      } else if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        errorCode = "TIMEOUT";
      } else if (error.message?.includes("network") || error.code === "ENOTFOUND") {
        errorCode = "NETWORK_ERROR";
      } else if (error.status >= 500) {
        errorCode = "SERVICE_UNAVAILABLE";
      }
      return {
        ok: false,
        error: {
          message: error.message || "Image inspection failed",
          err_code: errorCode,
          details: error.toString()
        }
      };
    }
  }
  async generateResponse(image, mimeType, prompt) {
    return await geminiCircuitBreaker.execute(async () => {
      return await withRetry(async () => {
        return await this.performGeneration(image, mimeType, prompt);
      }, this.retryConfig, "Gemini Response Generation");
    });
  }
  async performGeneration(image, mimeType, prompt) {
    const startTime = Date.now();
    try {
      const imageHash = simpleHash(image);
      const cacheKey = globalResponseCache.generateKey(imageHash, "darija", prompt.includes("question") ? "qa" : void 0);
      if (this.config.enableResponseCache) {
        const cachedResponse = globalResponseCache.get(cacheKey);
        if (cachedResponse) {
          const responseTime2 = Date.now() - startTime;
          globalPerformanceMonitor.recordRequest(responseTime2, true, false);
          console.log(`\u26A1 Cache hit! Response served in ${responseTime2}ms`);
          return { ok: true, data: cachedResponse };
        }
      }
      const model = this.genAI.getGenerativeModel({ model: this.config.qualityModel });
      const optimizedImage = optimizeImageForAI(image, this.config);
      const imageBase64 = Buffer.from(optimizedImage).toString("base64");
      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBase64,
            mimeType
          }
        },
        { text: prompt }
      ]);
      const response = await result.response;
      const text = response.text();
      if (this.config.enableResponseCache) {
        globalResponseCache.set(cacheKey, text);
      }
      const responseTime = Date.now() - startTime;
      globalPerformanceMonitor.recordRequest(responseTime, false, false);
      console.log(`\u26A1 Response generated in ${responseTime}ms`);
      return {
        ok: true,
        data: text
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      globalPerformanceMonitor.recordRequest(responseTime, false, true);
      console.error("Response generation failed:", error);
      let errorCode = "GENERATION_ERROR";
      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        errorCode = "RATE_LIMIT";
      } else if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        errorCode = "TIMEOUT";
      } else if (error.message?.includes("network") || error.code === "ENOTFOUND") {
        errorCode = "NETWORK_ERROR";
      } else if (error.status >= 500) {
        errorCode = "SERVICE_UNAVAILABLE";
      } else if (error.message?.includes("API key")) {
        errorCode = "MISSING_API_KEY";
      }
      return {
        ok: false,
        error: {
          message: error.message || "Response generation failed",
          err_code: errorCode,
          details: error.toString()
        }
      };
    }
  }
  // Health check method
  async checkHealth() {
    return await checkServiceHealth(
      "Gemini",
      async () => {
        try {
          const testImage = new Uint8Array([137, 80, 78, 71]);
          const result = await this.performInspection(testImage, "image/png");
          return true;
        } catch (error) {
          return false;
        }
      },
      geminiCircuitBreaker
    );
  }
  // Get circuit breaker status
  getCircuitBreakerStatus() {
    return geminiCircuitBreaker.getState();
  }
  // Reset circuit breaker (for admin/debugging)
  resetCircuitBreaker() {
    geminiCircuitBreaker.reset();
  }
};

// providers/telemetryProvider.ts
var ConsoleTelemetryLogger = class {
  log(data) {
    console.log(JSON.stringify(data));
  }
};
var RingBufferTelemetryLogger = class {
  buffer = [];
  maxSize;
  constructor(maxSize = 1e3) {
    this.maxSize = maxSize;
  }
  log(data) {
    this.buffer.push(data);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
    console.log(JSON.stringify(data));
  }
  getRecentEntries(count = 100) {
    return this.buffer.slice(-count);
  }
  getMetrics() {
    if (this.buffer.length === 0) {
      return {
        total_calls: 0,
        success_rate: 0,
        avg_latency_ms: 0,
        p95_latency_ms: 0,
        error_breakdown: {}
      };
    }
    const totalCalls = this.buffer.length;
    const successfulCalls = this.buffer.filter((entry) => entry.ok).length;
    const successRate = successfulCalls / totalCalls;
    const latencies = this.buffer.map((entry) => entry.total_ms).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;
    const errorBreakdown = {};
    this.buffer.filter((entry) => !entry.ok && entry.err_code).forEach((entry) => {
      const errCode = entry.err_code;
      errorBreakdown[errCode] = (errorBreakdown[errCode] || 0) + 1;
    });
    return {
      total_calls: totalCalls,
      success_rate: successRate,
      avg_latency_ms: avgLatency,
      p95_latency_ms: p95Latency,
      error_breakdown: errorBreakdown
    };
  }
};

// stores/imageStore.ts
var MemoryImageStore = class {
  cache = /* @__PURE__ */ new Map();
  cleanupInterval;
  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [token, entry] of this.cache.entries()) {
        if (entry.expires < now) {
          this.cache.delete(token);
        }
      }
    }, 6e4);
  }
  async save(buffer, ttlMinutes = 5) {
    const token = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + ttlMinutes * 60 * 1e3;
    this.cache.set(token, { buffer, expires });
    return token;
  }
  async get(token) {
    const entry = this.cache.get(token);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.cache.delete(token);
      return null;
    }
    return entry.buffer;
  }
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
};
var GlobalImageStore = class _GlobalImageStore {
  static cache = /* @__PURE__ */ new Map();
  async save(buffer, ttlMinutes = 5) {
    const token = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expires = Date.now() + ttlMinutes * 60 * 1e3;
    _GlobalImageStore.cache.set(token, { buffer, expires });
    return token;
  }
  async get(token) {
    const entry = _GlobalImageStore.cache.get(token);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      _GlobalImageStore.cache.delete(token);
      return null;
    }
    return entry.buffer;
  }
};
var VercelBlobImageStore = class {
  constructor(blobToken) {
    this.blobToken = blobToken;
  }
  async save(buffer, ttlMinutes = 5) {
    const fallback = new GlobalImageStore();
    return fallback.save(buffer, ttlMinutes);
  }
  async get(token) {
    const fallback = new GlobalImageStore();
    return fallback.get(token);
  }
};
export {
  ConsoleTelemetryLogger,
  GeminiProvider,
  GlobalImageStore,
  MemoryImageStore,
  RingBufferTelemetryLogger,
  VercelBlobImageStore,
  createExpressAssistHandler,
  createVercelAssistHandler,
  handleAssist
};
//# sourceMappingURL=index.js.map