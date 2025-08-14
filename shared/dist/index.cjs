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

// index.ts
var index_exports = {};
__export(index_exports, {
  ConsoleTelemetryLogger: () => ConsoleTelemetryLogger,
  GeminiProvider: () => GeminiProvider,
  GlobalImageStore: () => GlobalImageStore,
  MemoryImageStore: () => MemoryImageStore,
  RingBufferTelemetryLogger: () => RingBufferTelemetryLogger,
  VercelBlobImageStore: () => VercelBlobImageStore,
  createExpressAssistHandler: () => createExpressAssistHandler,
  createVercelAssistHandler: () => createVercelAssistHandler,
  handleAssist: () => handleAssist
});
module.exports = __toCommonJS(index_exports);

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
        return {
          ok: false,
          error: {
            message: `No cached image found for imageRef: ${request.imageRef}`,
            err_code: "IMAGE_NOT_FOUND"
          }
        };
      }
      image = cachedImage;
    } else {
      return {
        ok: false,
        error: {
          message: "No valid image provided",
          err_code: "INVALID_IMAGE"
        }
      };
    }
    const inspectionStart = deps.now();
    const signalsResult = await deps.providers.inspectImage(image, "image/jpeg");
    if (!signalsResult.ok) {
      return { ok: false, error: signalsResult.error };
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
      return { ok: false, error: responseResult.error };
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
      if (result.ok) {
        res.status(200).json(result.data);
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

// providers/geminiProvider.ts
var import_generative_ai = require("@google/generative-ai");
var GeminiProvider = class {
  genAI;
  constructor(apiKey) {
    this.genAI = new import_generative_ai.GoogleGenerativeAI(apiKey);
  }
  async inspectImage(image, mimeType) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const prompt = `Analyze this image quickly and return ONLY a JSON object with these exact fields:
{
  "has_text": boolean (true if any readable text is visible),
  "hazards": string[] (list of safety hazards like "moving vehicle", "stairs", "obstacle", max 3),
  "people_count": number (count of people visible, 0-10+),
  "lighting_ok": boolean (true if lighting is adequate for clear vision),
  "confidence": number (0.0-1.0, overall confidence in analysis)
}

Be concise and accurate. Return only valid JSON.`;
      const imageBase64 = Buffer.from(image).toString("base64");
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
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const imageBase64 = Buffer.from(image).toString("base64");
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
      return {
        ok: true,
        data: text
      };
    } catch (error) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConsoleTelemetryLogger,
  GeminiProvider,
  GlobalImageStore,
  MemoryImageStore,
  RingBufferTelemetryLogger,
  VercelBlobImageStore,
  createExpressAssistHandler,
  createVercelAssistHandler,
  handleAssist
});
//# sourceMappingURL=index.cjs.map