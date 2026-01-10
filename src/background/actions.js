import { CONTENT_SCRIPT_FILES, DEFAULT_RATING } from "./constants.js";

export function sendAutoAction(tabId, message, done) {
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
        files: CONTENT_SCRIPT_FILES
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

export function sendAutoGrade(tabId, rating = DEFAULT_RATING) {
  sendAutoAction(tabId, { type: "AUTO_GRADE", rating });
}

export function sendAutoComment(tabId, comment) {
  sendAutoAction(tabId, { type: "AUTO_COMMENT", comment });
}
