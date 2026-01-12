import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./storage.js";
import { bindPasswordToggle, setStatus, toggleLoading } from "./ui.js";
import { validateApiKey, validateRating, validateComment } from "../shared/validation.js";
import { ValidationError, getUserFriendlyMessage } from "../shared/errors.js";

const ratingEl = document.getElementById("rating");
const commentEl = document.getElementById("comment");
const keyEl = document.getElementById("gemini-key");
const promptEl = document.getElementById("system-prompt");
const toggleKeyBtn = document.getElementById("toggle-key");
const saveBtn = document.getElementById("btn-save");
const statusEl = document.getElementById("status");
const gradeBtn = document.getElementById("btn-grade");
const commentBtn = document.getElementById("btn-comment");

function getCurrentSettings() {
  const rating = Number.parseInt(ratingEl.value, 10) || DEFAULT_SETTINGS.rating;
  const comment = commentEl.value || "";
  const geminiApiKey = (keyEl.value || "").trim();
  const systemPrompt = promptEl.value || "";
  return { rating, comment, geminiApiKey, systemPrompt };
}

function sendPopupAction(action, payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "POPUP_ACTION", action, ...payload },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ status: "error", error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { status: "error", error: "No response" });
      }
    );
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  ratingEl.value = String(settings.rating || DEFAULT_SETTINGS.rating);
  commentEl.value = settings.comment || DEFAULT_SETTINGS.comment;
  keyEl.value = settings.geminiApiKey || DEFAULT_SETTINGS.geminiApiKey;
  promptEl.value = settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt;

  bindPasswordToggle(keyEl, toggleKeyBtn);

  ratingEl.addEventListener("change", async () => {
    try {
      const settings = getCurrentSettings();
      validateRating(settings.rating);
      const success = await saveSettings(settings);
      if (success) {
        setStatus(statusEl, "Saved rating", "ok");
      } else {
        setStatus(statusEl, "Failed to save rating", "error");
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setStatus(statusEl, error.message, "error");
      }
    }
  });

  commentEl.addEventListener("input", async () => {
    const settings = getCurrentSettings();
    await saveSettings(settings);
  });

  saveBtn.addEventListener("click", async () => {
    try {
      toggleLoading(saveBtn, true);
      const settings = getCurrentSettings();

      // Validate API key if provided
      if (settings.geminiApiKey) {
        validateApiKey(settings.geminiApiKey);
      }

      const success = await saveSettings(settings);
      if (success) {
        setStatus(statusEl, "Saved Gemini settings", "ok");
      } else {
        setStatus(statusEl, "Failed to save settings", "error");
      }
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      setStatus(statusEl, message, "error");
    } finally {
      toggleLoading(saveBtn, false);
    }
  });

  gradeBtn.addEventListener("click", async () => {
    try {
      toggleLoading(gradeBtn, true);
      gradeBtn.disabled = true;

      setStatus(statusEl, "Sending auto grade...");
      const { rating } = getCurrentSettings();

      validateRating(rating);

      const response = await sendPopupAction("AUTO_GRADE", { rating });
      if (response.status === "ok") {
        setStatus(statusEl, "Auto grade sent", "ok");
        return;
      }
      setStatus(statusEl, response.error || "Auto grade failed", "error");
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      setStatus(statusEl, message, "error");
    } finally {
      toggleLoading(gradeBtn, false);
      gradeBtn.disabled = false;
    }
  });

  commentBtn.addEventListener("click", async () => {
    try {
      toggleLoading(commentBtn, true);
      commentBtn.disabled = true;

      const { comment } = getCurrentSettings();

      validateComment(comment);

      setStatus(statusEl, "Sending auto comment...");
      const response = await sendPopupAction("AUTO_COMMENT", { comment });
      if (response.status === "ok") {
        setStatus(statusEl, "Auto comment sent", "ok");
        return;
      }
      setStatus(statusEl, response.error || "Auto comment failed", "error");
    } catch (error) {
      const message = getUserFriendlyMessage(error);
      setStatus(statusEl, message, "error");
    } finally {
      toggleLoading(commentBtn, false);
      commentBtn.disabled = false;
    }
  });
});
