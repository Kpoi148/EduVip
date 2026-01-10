import {
  GEMINI_BASE_URL,
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODELS,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_REQUEST_TIMEOUT_MS,
  GEMINI_TEMPERATURE
} from "./constants.js";
import { getStoredGeminiSettings, savePreferredModel } from "./storage.js";

function buildGeminiRequest(prompt, input, generationConfig) {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: input }]
      }
    ]
  };

  if (prompt && prompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: prompt.trim() }]
    };
  }

  if (generationConfig && Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }

  return body;
}

function buildGeminiEndpoint(model) {
  return GEMINI_BASE_URL + model + ":generateContent";
}

function extractGeminiText(payload) {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((part) => part.text || "").join("").trim();
  }
  if (typeof candidate?.content?.text === "string") {
    return candidate.content.text.trim();
  }
  if (typeof payload?.text === "string") {
    return payload.text.trim();
  }
  return "";
}

function extractGeminiError(payload, fallback) {
  return (
    payload?.error?.message ||
    payload?.message ||
    fallback ||
    "Request failed"
  );
}

function shouldTryNextModel(status, errorMessage) {
  if (status === 404) {
    return true;
  }
  const text = (errorMessage || "").toLowerCase();
  return text.includes("not found") || text.includes("not supported");
}

function buildModelList(requestedModel) {
  const list = [];
  if (requestedModel) {
    list.push(requestedModel);
  }
  GEMINI_FALLBACK_MODELS.forEach((model) => {
    if (!list.includes(model)) {
      list.push(model);
    }
  });
  if (!list.includes(GEMINI_DEFAULT_MODEL)) {
    list.unshift(GEMINI_DEFAULT_MODEL);
  }
  return list;
}

function normalizeModelName(name) {
  if (!name) {
    return "";
  }
  return name.startsWith("models/") ? name.slice("models/".length) : name;
}

async function listGeminiModels(apiKey) {
  const url = GEMINI_BASE_URL + "?key=" + encodeURIComponent(apiKey);
  const response = await fetch(url);
  let responseText = "";
  let payload = null;
  try {
    responseText = await response.text();
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: extractGeminiError(payload, response.statusText)
    };
  }

  const models = Array.isArray(payload?.models) ? payload.models : [];
  const supported = [];
  models.forEach((model) => {
    const name = normalizeModelName(model?.name || "");
    if (!name) {
      return;
    }
    const methods = model?.supportedGenerationMethods;
    if (Array.isArray(methods) && !methods.includes("generateContent")) {
      return;
    }
    supported.push(name);
  });

  return { ok: true, status: response.status, models: supported };
}

async function callGemini(url, body, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === "AbortError") {
      return {
        ok: false,
        status: 408,
        error: "Request timed out"
      };
    }
    throw error;
  }
  clearTimeout(timeoutId);

  let responseText = "";
  let payload = null;
  try {
    responseText = await response.text();
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: extractGeminiError(payload, response.statusText),
      payload,
      responseText
    };
  }

  return { ok: true, status: response.status, payload, responseText };
}

function buildGenerationConfig(msg) {
  const config = {};
  const maxOutputTokens = Number.parseInt(msg?.maxOutputTokens, 10);
  if (Number.isFinite(maxOutputTokens) && maxOutputTokens > 0) {
    config.maxOutputTokens = maxOutputTokens;
  } else {
    config.maxOutputTokens = GEMINI_MAX_OUTPUT_TOKENS;
  }

  const temperature = Number(msg?.temperature);
  if (!Number.isNaN(temperature)) {
    config.temperature = temperature;
  } else {
    config.temperature = GEMINI_TEMPERATURE;
  }

  const topP = Number(msg?.topP);
  if (!Number.isNaN(topP)) {
    config.topP = topP;
  }

  return config;
}

export function handleAiGenerate(msg, sendResponse) {
  const input = (msg?.input || msg?.text || msg?.question || "")
    .toString()
    .trim();
  if (!input) {
    sendResponse({ status: "error", error: "Missing input" });
    return;
  }

  getStoredGeminiSettings(({ geminiApiKey, customPrompt, preferredModel }) => {
    if (!geminiApiKey) {
      sendResponse({ status: "error", error: "Missing Gemini API key" });
      return;
    }

    const fastMode = msg?.mode === "fast" || msg?.fast === true;
    const requestedModel = (
      msg?.model ||
      msg?.geminiModel ||
      (fastMode ? GEMINI_DEFAULT_MODEL : preferredModel || GEMINI_DEFAULT_MODEL) ||
      ""
    )
      .toString()
      .trim();
    const models = buildModelList(requestedModel);
    if (preferredModel && !models.includes(preferredModel)) {
      models.push(preferredModel);
    }
    const generationConfig = buildGenerationConfig(msg);
    const body = buildGeminiRequest(customPrompt, input, generationConfig);

    void (async () => {
      try {
        let lastError = null;
        let hadModelNotFound = false;
        for (const model of models) {
          const url =
            buildGeminiEndpoint(model) +
            "?key=" +
            encodeURIComponent(geminiApiKey);
          const result = await callGemini(url, body, GEMINI_REQUEST_TIMEOUT_MS);
          if (!result.ok) {
            lastError = { error: result.error, code: result.status, model };
            if (result.status === 401 || result.status === 403) {
              sendResponse({
                status: "error",
                error: result.error,
                code: result.status
              });
              return;
            }
            if (shouldTryNextModel(result.status, result.error)) {
              hadModelNotFound = true;
              continue;
            }
            sendResponse({
              status: "error",
              error: result.error,
              code: result.status
            });
            return;
          }

          const text =
            extractGeminiText(result.payload) ||
            (result.responseText || "").trim();
          if (!text) {
            sendResponse({ status: "error", error: "Empty response" });
            return;
          }

          savePreferredModel(model);
          sendResponse({ status: "ok", text, raw: result.payload, model });
          return;
        }

        if (hadModelNotFound) {
          const listResult = await listGeminiModels(geminiApiKey);
          if (!listResult.ok) {
            sendResponse({
              status: "error",
              error: listResult.error,
              code: listResult.status
            });
            return;
          }

          const extraModels = listResult.models || [];
          for (const model of extraModels) {
            if (models.includes(model)) {
              continue;
            }
            const url =
              buildGeminiEndpoint(model) +
              "?key=" +
              encodeURIComponent(geminiApiKey);
            const result = await callGemini(
              url,
              body,
              GEMINI_REQUEST_TIMEOUT_MS
            );
            if (!result.ok) {
              lastError = { error: result.error, code: result.status, model };
              if (result.status === 401 || result.status === 403) {
                sendResponse({
                  status: "error",
                  error: result.error,
                  code: result.status
                });
                return;
              }
              if (shouldTryNextModel(result.status, result.error)) {
                continue;
              }
              sendResponse({
                status: "error",
                error: result.error,
                code: result.status
              });
              return;
            }

            const text =
              extractGeminiText(result.payload) ||
              (result.responseText || "").trim();
            if (!text) {
              sendResponse({ status: "error", error: "Empty response" });
              return;
            }

            savePreferredModel(model);
            sendResponse({ status: "ok", text, raw: result.payload, model });
            return;
          }

          if (extraModels.length === 0) {
            sendResponse({
              status: "error",
              error: "No available models support generateContent"
            });
            return;
          }
        }

        if (lastError) {
          sendResponse({
            status: "error",
            error: lastError.error,
            code: lastError.code,
            model: lastError.model
          });
          return;
        }

        sendResponse({ status: "error", error: "Request failed" });
      } catch (error) {
        sendResponse({
          status: "error",
          error: error?.message || "Network error"
        });
      }
    })();
  });
}
