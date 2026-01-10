import { DEFAULT_RATING } from "./constants.js";
import { sendAutoAction, sendAutoGrade } from "./actions.js";
import { handleAiGenerate } from "./gemini.js";

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
