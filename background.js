const DEFAULT_RATING = 5;

function sendAutoGrade(tabId, rating = DEFAULT_RATING) {
  chrome.tabs.sendMessage(tabId, { type: "AUTO_GRADE", rating }, () => {
    if (!chrome.runtime.lastError) {
      return;
    }

    // If content script isn't ready, inject it and retry.
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"]
      },
      () => {
        chrome.tabs.sendMessage(tabId, { type: "AUTO_GRADE", rating });
      }
    );
  });
}

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
