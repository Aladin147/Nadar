"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// providers/geminiProvider.ts
var geminiProvider_exports = {};
__export(geminiProvider_exports, {
  GeminiProvider: () => GeminiProvider
});
module.exports = __toCommonJS(geminiProvider_exports);
var import_generative_ai = require("@google/generative-ai");

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

// providers/geminiProvider.ts
var GeminiProvider = class {
  genAI;
  config;
  constructor(apiKey, config) {
    this.genAI = new import_generative_ai.GoogleGenerativeAI(apiKey);
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }
  async inspectImage(image, mimeType) {
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
      console.error("Image inspection failed:", error);
      return {
        ok: false,
        error: {
          message: error.message || "Image inspection failed",
          err_code: "INSPECTION_ERROR",
          details: error.toString()
        }
      };
    }
  }
  async generateResponse(image, mimeType, prompt) {
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
      return {
        ok: false,
        error: {
          message: error.message || "Response generation failed",
          err_code: "GENERATION_ERROR",
          details: error.toString()
        }
      };
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GeminiProvider
});
//# sourceMappingURL=geminiProvider.cjs.map