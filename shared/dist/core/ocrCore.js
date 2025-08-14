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
      return responseResult;
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
export {
  handleOCR
};
//# sourceMappingURL=ocrCore.js.map