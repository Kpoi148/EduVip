export const STORAGE_KEY = "eduvip_settings";
export const DEFAULT_SETTINGS = {
  rating: 5,
  comment: "Nhan xet: Tot",
  geminiApiKey: "",
  systemPrompt: ""
};

export function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      resolve({ ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY] || {}) });
    });
  });
}

export function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
      resolve();
    });
  });
}
