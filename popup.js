const STORAGE_KEY = "eduvip_settings";
const DEFAULT_SETTINGS = {
  rating: 5,
  comment: "Nhan xet: Tot",
  geminiApiKey: "",
  systemPrompt: ""
};

const ratingEl = document.getElementById("rating");
const commentEl = document.getElementById("comment");
const keyEl = document.getElementById("gemini-key");
const promptEl = document.getElementById("system-prompt");
const toggleKeyBtn = document.getElementById("toggle-key");
const saveBtn = document.getElementById("btn-save");
const statusEl = document.getElementById("status");
const gradeBtn = document.getElementById("btn-grade");
const commentBtn = document.getElementById("btn-comment");
let statusTimer = null;

function setStatus(message, type) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message || "";
  statusEl.classList.remove("ok", "error");
  if (type) {
    statusEl.classList.add(type);
  }
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  if (message) {
    statusTimer = setTimeout(() => {
      statusEl.textContent = "";
      statusEl.classList.remove("ok", "error");
      statusTimer = null;
    }, 1800);
  }
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      resolve({ ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY] || {}) });
    });
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
      resolve();
    });
  });
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

function getCurrentSettings() {
  const rating = Number.parseInt(ratingEl.value, 10) || DEFAULT_SETTINGS.rating;
  const comment = commentEl.value || "";
  const geminiApiKey = (keyEl.value || "").trim();
  const systemPrompt = promptEl.value || "";
  return { rating, comment, geminiApiKey, systemPrompt };
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  ratingEl.value = String(settings.rating || DEFAULT_SETTINGS.rating);
  commentEl.value = settings.comment || DEFAULT_SETTINGS.comment;
  keyEl.value = settings.geminiApiKey || DEFAULT_SETTINGS.geminiApiKey;
  promptEl.value = settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt;

  ratingEl.addEventListener("change", async () => {
    await saveSettings(getCurrentSettings());
    setStatus("Saved rating", "ok");
  });

  commentEl.addEventListener("input", async () => {
    await saveSettings(getCurrentSettings());
    setStatus("Saved comment", "ok");
  });

  toggleKeyBtn.addEventListener("click", () => {
    if (keyEl.type === "password") {
      keyEl.type = "text";
      toggleKeyBtn.textContent = "Hide";
      return;
    }
    keyEl.type = "password";
    toggleKeyBtn.textContent = "Show";
  });

  saveBtn.addEventListener("click", async () => {
    await saveSettings(getCurrentSettings());
    setStatus("Saved Gemini settings", "ok");
  });

  gradeBtn.addEventListener("click", async () => {
    setStatus("Sending auto grade...");
    const { rating } = getCurrentSettings();
    const response = await sendPopupAction("AUTO_GRADE", { rating });
    if (response.status === "ok") {
      setStatus("Auto grade sent", "ok");
      return;
    }
    setStatus(response.error || "Auto grade failed", "error");
  });

  commentBtn.addEventListener("click", async () => {
    const { comment } = getCurrentSettings();
    if (!comment.trim()) {
      setStatus("Comment is empty", "error");
      return;
    }
    setStatus("Sending auto comment...");
    const response = await sendPopupAction("AUTO_COMMENT", { comment });
    if (response.status === "ok") {
      setStatus("Auto comment sent", "ok");
      return;
    }
    setStatus(response.error || "Auto comment failed", "error");
  });
});
