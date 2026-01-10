const DEFAULT_RATING = 5;
const STORAGE_KEY = "eduvip_settings";
const GEMINI_FALLBACK_MODELS = [
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.0-pro",
  "gemini-pro"
];
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/";

function buildGeminiRequest(prompt, input) {
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

async function callGemini(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

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

function getStoredGeminiSettings(callback) {
  chrome.storage.local.get(
    [STORAGE_KEY, "geminiApiKey", "customPrompt", "systemPrompt"],
    (data) => {
      const settings = data[STORAGE_KEY] || {};
      const geminiApiKey = (
        settings.geminiApiKey ||
        data.geminiApiKey ||
        ""
      ).trim();
      const customPrompt = (
        settings.customPrompt ||
        settings.systemPrompt ||
        data.customPrompt ||
        data.systemPrompt ||
        ""
      ).trim();

      callback({ geminiApiKey, customPrompt });
    }
  );
}

function handleAiGenerate(msg, sendResponse) {
  const input = (msg?.input || msg?.text || msg?.question || "")
    .toString()
    .trim();
  if (!input) {
    sendResponse({ status: "error", error: "Missing input" });
    return;
  }

  getStoredGeminiSettings(({ geminiApiKey, customPrompt }) => {
    if (!geminiApiKey) {
      sendResponse({ status: "error", error: "Missing Gemini API key" });
      return;
    }

    const requestedModel = (msg?.model || msg?.geminiModel || "")
      .toString()
      .trim();
    const models = buildModelList(requestedModel);
    const body = buildGeminiRequest(customPrompt, input);

    void (async () => {
      try {
        let lastError = null;
        let hadModelNotFound = false;
        for (const model of models) {
          const url =
            buildGeminiEndpoint(model) +
            "?key=" +
            encodeURIComponent(geminiApiKey);
          const result = await callGemini(url, body);
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
            const result = await callGemini(url, body);
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

function sendAutoAction(tabId, message, done) {
  chrome.tabs.sendMessage(tabId, message, () => {
    if (!chrome.runtime.lastError) {
      if (done) {
        done({ status: "ok" });
      }
      return;
    }

    // If content script isn't ready, inject it and retry.
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"]
      },
      () => {
        chrome.tabs.sendMessage(tabId, message, () => {
          if (done) {
            if (chrome.runtime.lastError) {
              done({
                status: "error",
                error: chrome.runtime.lastError.message
              });
              return;
            }
            done({ status: "ok" });
          }
        });
      }
    );
  });
}

function sendAutoGrade(tabId, rating = DEFAULT_RATING) {
  sendAutoAction(tabId, { type: "AUTO_GRADE", rating });
}

function sendAutoComment(tabId, comment) {
  sendAutoAction(tabId, { type: "AUTO_COMMENT", comment });
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) {
    return;
  }
  sendAutoGrade(tab.id);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "auto-grade") {
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      return;
    }
    sendAutoGrade(tab.id);
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "AI_GENERATE" || msg?.type === "AI_GENERATE") {
    handleAiGenerate(msg, sendResponse);
    return true;
  }
  if (msg?.type !== "POPUP_ACTION") {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      sendResponse({ status: "error", error: "No active tab" });
      return;
    }

    if (msg.action === "AUTO_GRADE") {
      sendAutoAction(
        tab.id,
        { type: "AUTO_GRADE", rating: msg.rating ?? DEFAULT_RATING },
        sendResponse
      );
      return;
    }

    if (msg.action === "AUTO_COMMENT") {
      sendAutoAction(
        tab.id,
        { type: "AUTO_COMMENT", comment: msg.comment || "" },
        sendResponse
      );
      return;
    }

    sendResponse({ status: "error", error: "Unknown action" });
  });

  return true;
});
