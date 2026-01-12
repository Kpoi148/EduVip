import { encrypt, decrypt } from '../shared/crypto.js';
import { logger, StorageError } from '../shared/errors.js';

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
      if (chrome.runtime.lastError) {
        logger.error('Failed to load settings', new StorageError(chrome.runtime.lastError.message));
        resolve(DEFAULT_SETTINGS);
        return;
      }

      const settings = { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY] || {}) };

      // Decrypt API key if present
      if (settings.geminiApiKey) {
        try {
          settings.geminiApiKey = decrypt(settings.geminiApiKey);
        } catch (error) {
          logger.warn('Failed to decrypt API key, treating as plaintext', error);
          // Will be re-encrypted on next save
        }
      }

      resolve(settings);
    });
  });
}

export function saveSettings(settings) {
  return new Promise((resolve) => {
    const toSave = { ...settings };

    // Encrypt API key before saving
    if (toSave.geminiApiKey) {
      try {
        toSave.geminiApiKey = encrypt(toSave.geminiApiKey);
      } catch (error) {
        logger.error('Failed to encrypt API key', error);
        // Save as-is if encryption fails (shouldn't happen)
      }
    }

    chrome.storage.local.set({ [STORAGE_KEY]: toSave }, () => {
      if (chrome.runtime.lastError) {
        logger.error('Failed to save settings', new StorageError(chrome.runtime.lastError.message));
        resolve(false);
        return;
      }
      logger.info('Settings saved successfully');
      resolve(true);
    });
  });
}
