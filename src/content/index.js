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

document.addEventListener("click", handleReplyClick, true);
document.addEventListener("pointerdown", handleSendPointerDown, true);

startAutoDetect();
