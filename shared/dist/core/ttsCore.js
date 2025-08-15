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
export {
  handleTTS
};
//# sourceMappingURL=ttsCore.js.map