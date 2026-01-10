function isReplyTrigger(element) {
  if (!element || !element.matches) {
    return false;
  }

  if (SEND_COMMENT_SELECTORS.some((selector) => element.closest(selector))) {
    return false;
  }

  if (
    REPLY_BUTTON_SELECTORS.some((selector) => element.matches(selector)) ||
    REPLY_BUTTON_SELECTORS.some((selector) => element.closest(selector))
  ) {
    return true;
  }

  const text = normalizeText(element.textContent);
  if (!text) {
    return false;
  }
  return REPLY_TEXT_HINTS.some((hint) => text.includes(hint));
}

function isSendTrigger(element) {
  if (!element || !element.matches) {
    return false;
  }

  if (
    SEND_COMMENT_SELECTORS.some((selector) => element.matches(selector)) ||
    SEND_COMMENT_SELECTORS.some((selector) => element.closest(selector))
  ) {
    return true;
  }

  const text = normalizeText(element.textContent);
  if (!text) {
    return false;
  }
  return SEND_TEXT_HINTS.some((hint) => text.includes(hint));
}

function handleReplyClick(event) {
  const clickable = findClickableAncestor(event.target);
  if (!clickable) {
    return;
  }
  if (isSendTrigger(clickable)) {
    const root =
      findClosestCommentRoot(clickable) ||
      findCommentRoot() ||
      findGradingRoot() ||
      document.body ||
      document.documentElement;
    if (root && !hasNonEmptyComment(root)) {
      event.preventDefault();
      event.stopPropagation();
      autoCommentFromQuestion({ autoSend: true, root });
    }
    return;
  }
  if (!isReplyTrigger(clickable)) {
    return;
  }
  autoCommentFromQuestion({
    autoSend: false,
    root:
      findClosestCommentRoot(clickable) ||
      findCommentRoot() ||
      findGradingRoot() ||
      document.body ||
      document.documentElement
  });
}

function handleSendPointerDown(event) {
  if (!event.isTrusted) {
    return;
  }
  const clickable = findClickableAncestor(event.target);
  if (!clickable) {
    return;
  }
  if (!isSendTrigger(clickable)) {
    return;
  }
  const root =
    findClosestCommentRoot(clickable) ||
    findCommentRoot() ||
    findGradingRoot() ||
    document.body ||
    document.documentElement;
  if (root && !hasNonEmptyComment(root)) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    autoCommentFromQuestion({ autoSend: true, root });
  }
}
