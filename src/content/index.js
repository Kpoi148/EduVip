// AbortController for cleanup
const abortController = new AbortController();
const { signal } = abortController;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "AUTO_GRADE") {
    autoGrade(msg.rating || DEFAULT_RATING, { force: true });
    sendResponse({ status: "ok" });
  }
  if (msg?.type === "AUTO_COMMENT") {
    autoComment(msg.comment || DEFAULT_COMMENT, { force: true, autoSend: true });
    sendResponse({ status: "ok" });
  }
  return true;
});

document.addEventListener("click", handleReplyClick, { capture: true, signal });
document.addEventListener("pointerdown", handleSendPointerDown, { capture: true, signal });

startAutoDetect();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  abortController.abort();
  stopAutoDetect();
}, { once: true });
