import { GEMINI_MODEL_KEY, STORAGE_KEY } from "./constants.js";
import { logger, StorageError } from "../shared/errors.js";
import { decrypt, encrypt } from "../shared/crypto.js";

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
      if (chrome.runtime.lastError) {
        logger.error('Failed to load Gemini settings', new StorageError(chrome.runtime.lastError.message));
        callback({
          geminiApiKey: '',
          customPrompt: '',
          preferredModel: null
        });
        return;
      }

      const settings = data[STORAGE_KEY] || {};

      // Get API key and decrypt if present
      let geminiApiKey = (
        settings.geminiApiKey ||
        data.geminiApiKey ||
        ""
      ).trim();

      if (geminiApiKey) {
        try {
          // Try to decrypt - if it fails, it might be plaintext
          geminiApiKey = decrypt(geminiApiKey);
        } catch (error) {
          logger.warn('Failed to decrypt API key, treating as plaintext', error);
          // Will be encrypted on next save
        }
      }

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
        null
      );

      callback({ geminiApiKey, customPrompt, preferredModel });
    }
  );
}

export function savePreferredModel(model) {
  const name = (model || "").trim();
  if (!name) {
    logger.warn('Attempted to save empty model name');
    return;
  }

  chrome.storage.local.set({ [GEMINI_MODEL_KEY]: name }, () => {
    if (chrome.runtime.lastError) {
      logger.error('Failed to save preferred model', new StorageError(chrome.runtime.lastError.message));
      return;
    }
    logger.info('Saved preferred model', { model: name });
  });
}

export function getPreferredModel(callback) {
  chrome.storage.local.get(GEMINI_MODEL_KEY, (data) => {
    if (chrome.runtime.lastError) {
      logger.error('Failed to get preferred model', new StorageError(chrome.runtime.lastError.message));
      callback(null);
      return;
    }
    callback(data[GEMINI_MODEL_KEY] || null);
  });
}

// Migrate API key to encrypted format if needed
export function migrateApiKeyEncryption() {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    if (chrome.runtime.lastError) {
      logger.error('Migration check failed', new StorageError(chrome.runtime.lastError.message));
      return;
    }

    const settings = data[STORAGE_KEY] || {};
    const apiKey = settings.geminiApiKey;

    if (!apiKey) {
      return; // No API key to migrate
    }

    // Check if already encrypted by trying to decrypt
    try {
      decrypt(apiKey);
      logger.info('API key is already encrypted');
      return;
    } catch {
      // Likely plaintext, needs encryption
      logger.info('Migrating API key to encrypted format');

      const encryptedKey = encrypt(apiKey);
      settings.geminiApiKey = encryptedKey;

      chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          logger.error('Failed to migrate API key', new StorageError(chrome.runtime.lastError.message));
          return;
        }
        logger.info('API key migration completed');
      });
    }
  });
}

// Run migration on module load
migrateApiKeyEncryption();

