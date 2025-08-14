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
      return signalsResult;
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
      return responseResult;
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
export {
  handleAssist
};
//# sourceMappingURL=assistCore.js.map