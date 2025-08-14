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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GeminiProvider
});
//# sourceMappingURL=geminiProvider.cjs.map