import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./storage.js";
import { bindPasswordToggle, setStatus } from "./ui.js";

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
    await saveSettings(getCurrentSettings());
    setStatus(statusEl, "Saved rating", "ok");
  });

  commentEl.addEventListener("input", async () => {
    await saveSettings(getCurrentSettings());
    setStatus(statusEl, "Saved comment", "ok");
  });

  saveBtn.addEventListener("click", async () => {
    await saveSettings(getCurrentSettings());
    setStatus(statusEl, "Saved Gemini settings", "ok");
  });

  gradeBtn.addEventListener("click", async () => {
    setStatus(statusEl, "Sending auto grade...");
    const { rating } = getCurrentSettings();
    const response = await sendPopupAction("AUTO_GRADE", { rating });
    if (response.status === "ok") {
      setStatus(statusEl, "Auto grade sent", "ok");
      return;
    }
    setStatus(statusEl, response.error || "Auto grade failed", "error");
  });

  commentBtn.addEventListener("click", async () => {
    const { comment } = getCurrentSettings();
    if (!comment.trim()) {
      setStatus(statusEl, "Comment is empty", "error");
      return;
    }
    setStatus(statusEl, "Sending auto comment...");
    const response = await sendPopupAction("AUTO_COMMENT", { comment });
    if (response.status === "ok") {
      setStatus(statusEl, "Auto comment sent", "ok");
      return;
    }
    setStatus(statusEl, response.error || "Auto comment failed", "error");
  });
});
