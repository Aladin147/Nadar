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

// core/ocrCore.ts
function createOCRPrompt(language, full) {
  const langDir = language === "ar" ? "\u0627\u0643\u062A\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649" : language === "darija" ? "\u0627\u0643\u062A\u0628 \u0628\u0627\u0644\u062F\u0627\u0631\u062C\u0629 \u0627\u0644\u0645\u063A\u0631\u0628\u064A\u0629" : "Write in English";
  if (full) {
    return `${langDir} Extract ALL text from this image. Include:
- All readable text, signs, labels, captions
- Text in any language or script
- Numbers, dates, times
- Menu items, prices, addresses
- Any other textual content

Return only the extracted text, preserving the original structure and formatting where possible.`;
  } else {
    return `${langDir} Extract the main text content from this image. Focus on:
- Primary text, headlines, main content
- Important signs or labels
- Key information that would be most relevant

Return only the extracted text in a clear, readable format.`;
  }
}
async function handleOCR(request, deps) {
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
          mode: "ocr",
          engine: "gemini",
          route_path: "/ocr",
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
        mode: "ocr",
        engine: "gemini",
        route_path: "/ocr",
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
    const processingStart = deps.now();
    const language = request.language || "darija";
    const prompt = createOCRPrompt(language, request.full || false);
    const responseResult = await deps.providers.generateResponse(
      image,
      "image/jpeg",
      prompt
    );
    if (!responseResult.ok) {
      const errorResult = responseResult;
      return { ok: false, error: errorResult.error };
    }
    const processingTime = deps.now() - processingStart;
    const totalTime = deps.now() - startTime;
    const extractedText = responseResult.data.trim();
    deps.telemetry.log({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: "ocr",
      engine: "gemini",
      route_path: "/ocr",
      image_bytes: image.length,
      audio_bytes_in: 0,
      total_ms: totalTime,
      model_ms: processingTime,
      tts_ms: 0,
      chars_out: extractedText.length,
      ok: true,
      request_id: request.sessionId
    });
    return {
      ok: true,
      data: {
        text: extractedText,
        timing: {
          processing_ms: processingTime,
          total_ms: totalTime
        }
      }
    };
  } catch (error) {
    const totalTime = deps.now() - startTime;
    deps.telemetry.log({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: "ocr",
      engine: "gemini",
      route_path: "/ocr",
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

// core/ttsCore.ts
async function handleTTS(request, deps) {
  const startTime = deps.now();
  try {
    if (!request.text || request.text.trim().length === 0) {
      const error = {
        message: "Text is required for TTS generation",
        err_code: "INVALID_TEXT"
      };
      deps.telemetry.log({
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        mode: "tts",
        engine: request.provider || "gemini",
        route_path: "/tts",
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
    const processingStart = deps.now();
    const provider = request.provider || "gemini";
    let audioBase64;
    let mimeType;
    if (provider === "gemini") {
      const result = await generateGeminiTTS(request.text, deps.geminiApiKey);
      if (!result.ok) {
        return result;
      }
      audioBase64 = result.data.audioBase64;
      mimeType = result.data.mimeType;
    } else if (provider === "elevenlabs") {
      const result = await generateElevenLabsTTS(request.text, request.voice, deps.elevenLabsApiKey);
      if (!result.ok) {
        return result;
      }
      audioBase64 = result.data.audioBase64;
      mimeType = result.data.mimeType;
    } else {
      const error = {
        message: `Unsupported TTS provider: ${provider}`,
        err_code: "INVALID_PROVIDER"
      };
      deps.telemetry.log({
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        mode: "tts",
        engine: provider,
        route_path: "/tts",
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
    const processingTime = deps.now() - processingStart;
    const totalTime = deps.now() - startTime;
    const audioBytes = Math.floor(audioBase64.length * 0.75);
    deps.telemetry.log({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: "tts",
      engine: provider,
      route_path: "/tts",
      image_bytes: 0,
      audio_bytes_in: audioBytes,
      total_ms: totalTime,
      model_ms: 0,
      tts_ms: processingTime,
      chars_out: request.text.length,
      ok: true,
      request_id: request.sessionId
    });
    return {
      ok: true,
      data: {
        audioBase64,
        mimeType,
        timing: {
          processing_ms: processingTime,
          total_ms: totalTime
        }
      }
    };
  } catch (error) {
    const totalTime = deps.now() - startTime;
    deps.telemetry.log({
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      mode: "tts",
      engine: request.provider || "gemini",
      route_path: "/tts",
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
async function generateGeminiTTS(text, apiKey) {
  try {
    if (!apiKey) {
      return {
        ok: false,
        error: {
          message: "Gemini API key not configured",
          err_code: "MISSING_API_KEY"
        }
      };
    }
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";
    const requestBody = {
      contents: [{
        parts: [{
          text
        }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore"
            }
          }
        }
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        error: {
          message: `Gemini TTS API error: ${response.status} ${response.statusText} - ${errorText}`,
          err_code: "GEMINI_TTS_API_ERROR"
        }
      };
    }
    const result = await response.json();
    const audioBase64 = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      return {
        ok: false,
        error: {
          message: "No audio data received from Gemini TTS API",
          err_code: "NO_AUDIO_DATA"
        }
      };
    }
    return {
      ok: true,
      data: {
        audioBase64,
        mimeType: "audio/wav"
        // Gemini TTS returns PCM data, which we'll treat as WAV
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error.message || "Gemini TTS generation failed",
        err_code: "GEMINI_TTS_ERROR"
      }
    };
  }
}
async function generateElevenLabsTTS(text, voice, apiKey) {
  try {
    if (!apiKey) {
      return {
        ok: false,
        error: {
          message: "ElevenLabs API key not configured",
          err_code: "MISSING_API_KEY"
        }
      };
    }
    const voiceId = voice || "pNInz6obpgDQGcFmaJgB";
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    if (!response.ok) {
      return {
        ok: false,
        error: {
          message: `ElevenLabs API error: ${response.status} ${response.statusText}`,
          err_code: "ELEVENLABS_API_ERROR"
        }
      };
    }
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    return {
      ok: true,
      data: {
        audioBase64,
        mimeType: "audio/mpeg"
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error.message || "ElevenLabs TTS generation failed",
        err_code: "ELEVENLABS_TTS_ERROR"
      }
    };
  }
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
function mapVercelOCRRequest(req) {
  const body = req.body;
  let image;
  if (body.imageBase64) {
    image = new Uint8Array(Buffer.from(body.imageBase64, "base64"));
  }
  return {
    sessionId: body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    image,
    imageRef: body.imageRef,
    full: body.full || false,
    language: body.options?.language || body.language || "darija"
  };
}
function mapVercelTTSRequest(req) {
  const body = req.body;
  return {
    sessionId: body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: body.text,
    voice: body.voice,
    provider: body.provider || "gemini",
    rate: body.rate
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
function createVercelOCRHandler(deps) {
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
      const coreRequest = mapVercelOCRRequest(req);
      const result = await handleOCR(coreRequest, deps);
      handleResult(result, res);
    } catch (error) {
      res.status(500).json({
        error: error.message || "Internal server error",
        err_code: "UNKNOWN"
      });
    }
  };
}
function createVercelTTSHandler(deps) {
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
      const coreRequest = mapVercelTTSRequest(req);
      const result = await handleTTS(coreRequest, deps);
      handleResult(result, res);
    } catch (error) {
      res.status(500).json({
        error: error.message || "Internal server error",
        err_code: "UNKNOWN"
      });
    }
  };
}
export {
  createVercelAssistHandler,
  createVercelOCRHandler,
  createVercelTTSHandler
};
//# sourceMappingURL=vercelAdapter.js.map