import { GEMINI_MODEL_KEY, STORAGE_KEY } from "./constants.js";

export function getStoredGeminiSettings(callback) {
  chrome.storage.local.get(
    [
      STORAGE_KEY,
      GEMINI_MODEL_KEY,
      "geminiApiKey",
      "customPrompt",
      "systemPrompt"
    ],
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
      const preferredModel = (
        settings.geminiPreferredModel ||
        data[GEMINI_MODEL_KEY] ||
        ""
      ).trim();

      callback({ geminiApiKey, customPrompt, preferredModel });
    }
  );
}

export function savePreferredModel(model) {
  const name = (model || "").trim();
  if (!name) {
    return;
  }
  chrome.storage.local.set({ [GEMINI_MODEL_KEY]: name });
}
