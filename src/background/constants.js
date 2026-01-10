export const DEFAULT_RATING = 5;
export const STORAGE_KEY = "eduvip_settings";
export const GEMINI_DEFAULT_MODEL = "gemini-1.5-flash";
export const GEMINI_MAX_OUTPUT_TOKENS = 3000;
export const GEMINI_TEMPERATURE = 0.6;
export const GEMINI_REQUEST_TIMEOUT_MS = 12000;
export const GEMINI_MODEL_KEY = "geminiPreferredModel";
export const GEMINI_FALLBACK_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro"
];
export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/";
export const CONTENT_SCRIPT_FILES = [
  "src/content/constants.js",
  "src/content/dom.js",
  "src/content/rating.js",
  "src/content/comment.js",
  "src/content/ai.js",
  "src/content/handlers.js",
  "src/content/index.js"
];
