const DEFAULT_RATING = 5;
const DEFAULT_COMMENT = "Nhan xet: Tot";
const AUTO_GRADE_ATTR = "data-edu-autograded";
const AUTO_COMMENT_ATTR = "data-edu-autocommented";
const AUTO_GRADE_DEBOUNCE_MS = 250;
const COMMENT_WAIT_MS = 5000;
const COMMENT_CHECK_INTERVAL_MS = 200;
const ROOT_SELECTORS = [
  "[data-edu-grading-root]",
  "#entry-lesson-tabs",
  ".entry-lesson-tabs",
  "#grade-table",
  ".grade-table",
  "#grading-table",
  ".grading-table"
];
const COMMENT_ROOT_SELECTORS = [
  ".comment-form",
  ".comment-section",
  ".comment-editor",
  "#comments-container",
  "#simple-tabpanel1"
];
const QUESTION_SELECTORS = [
  "#main-content-lesson .styled",
  "#main-content-lesson",
  ".wrap-entry-lesson-content .styled",
  ".entry-lesson-content .styled"
];
const RATING_GROUP_SELECTORS = [
  ".MuiRating-root",
  "[role=\"radiogroup\"]",
  ".rating",
  ".rating-group",
  ".star-rating",
  ".stars"
];
const COMMENT_HINTS = [
  "comment",
  "nhan xet",
  "danh gia",
  "feedback",
  "remark",
  "note",
  "ghi chu"
];
const COMMENT_FIELD_SELECTORS = [
  ".w-md-editor-text-input",
  ".comment-editor textarea",
  ".comment-editor [contenteditable=\"true\"]"
];
const SEND_COMMENT_SELECTORS = [
  ".button-send-comment",
  "[data-action=\"send-comment\"]",
  "[data-testid=\"send-comment\"]",
  "button[type=\"submit\"]"
];
const REPLY_BUTTON_SELECTORS = [
  "[data-action=\"reply\"]",
  "[data-reply]",
  ".reply",
  ".reply-button",
  ".btn-reply",
  ".comment-reply",
  ".answer-button"
];
const REPLY_TEXT_HINTS = ["tra loi", "reply", "answer", "phan hoi"];
const SEND_TEXT_HINTS = ["send", "gui", "gửi", "post", "submit"];
const MAX_QUESTION_CHARS = 4000;
let autoGradeTimer = null;
let autoObserverStarted = false;
let aiCommentInFlight = false;

function getRootElement(root) {
  if (!root) {
    return null;
  }
  if (root === document) {
    return document.body || document.documentElement;
  }
  return root;
}

function findNearestRadioGroupContainer(radio, boundary) {
  let node = radio.parentElement;
  while (node && node !== boundary && node !== document.body) {
    const count = node.querySelectorAll('input[type="radio"]').length;
    if (count >= 2) {
      return node;
    }
    node = node.parentElement;
  }
  if (boundary) {
    const count = boundary.querySelectorAll('input[type="radio"]').length;
    if (count >= 2) {
      return boundary;
    }
  }
  return null;
}

function findRatingGroups(root) {
  if (!root || !root.querySelectorAll) {
    return [];
  }
  const groups = [];
  const seen = new Set();
  const addGroup = (element) => {
    if (!element || seen.has(element)) {
      return;
    }
    seen.add(element);
    groups.push(element);
  };

  if (RATING_GROUP_SELECTORS.length > 0) {
    root
      .querySelectorAll(RATING_GROUP_SELECTORS.join(","))
      .forEach(addGroup);
  }

  root.querySelectorAll("fieldset").forEach((element) => {
    const count = element.querySelectorAll('input[type="radio"]').length;
    if (count >= 2) {
      addGroup(element);
    }
  });

  const radioInputs = Array.from(root.querySelectorAll('input[type="radio"]'));
  if (radioInputs.length > 0) {
    const boundary = getRootElement(root);
    radioInputs.forEach((radio) => {
      const container = findNearestRadioGroupContainer(radio, boundary);
      if (container) {
        addGroup(container);
      }
    });
  }

  return groups;
}

function findGradingRoot() {
  let fallbackRoot = null;
  for (const selector of ROOT_SELECTORS) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }
    if (!fallbackRoot) {
      fallbackRoot = element;
    }
    if (findRatingGroups(element).length > 0) {
      return element;
    }
  }

  const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
  for (const dialog of dialogs) {
    if (findRatingGroups(dialog).length > 0) {
      return dialog;
    }
  }

  const tableContainers = Array.from(
    document.querySelectorAll(".MuiTableContainer-root, table")
  );
  let bestContainer = null;
  let bestCount = 0;
  for (const container of tableContainers) {
    const count = findRatingGroups(container).length;
    if (count > bestCount) {
      bestContainer = container;
      bestCount = count;
    }
  }
  if (bestContainer) {
    return bestContainer;
  }

  if (findRatingGroups(document).length > 0) {
    return document.body || document.documentElement;
  }

  if (fallbackRoot) {
    return fallbackRoot;
  }

  return null;
}

function findCommentRoot(root) {
  const scope =
    root && typeof root.querySelector === "function" ? root : document;
  for (const selector of COMMENT_ROOT_SELECTORS) {
    const element = scope.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function findClosestCommentRoot(node) {
  if (node && typeof node.closest === "function") {
    for (const selector of COMMENT_ROOT_SELECTORS) {
      const match = node.closest(selector);
      if (match) {
        return match;
      }
    }
  }

  const rootNode = node && node.getRootNode ? node.getRootNode() : null;
  if (rootNode && typeof rootNode.querySelector === "function") {
    const match = findCommentRoot(rootNode);
    if (match) {
      return match;
    }
  }

  return findCommentRoot();
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasCommentHint(element) {
  if (!element) {
    return false;
  }
  const parts = [
    element.name,
    element.id,
    element.placeholder,
    element.getAttribute("aria-label"),
    element.className
  ];
  const text = normalizeText(parts.filter(Boolean).join(" "));
  if (!text) {
    return false;
  }
  return COMMENT_HINTS.some((hint) => text.includes(hint));
}

function findCommentFields(root) {
  if (!root || !root.querySelectorAll) {
    return [];
  }

  const isGlobalRoot =
    root === document.body || root === document.documentElement;
  const fields = [];
  const seen = new Set();
  const addField = (element) => {
    if (!element || seen.has(element)) {
      return;
    }
    seen.add(element);
    fields.push(element);
  };

  const textareas = Array.from(root.querySelectorAll("textarea"));
  textareas.forEach((element) => {
    if (hasCommentHint(element) || !isGlobalRoot) {
      addField(element);
    }
  });

  const inputs = Array.from(
    root.querySelectorAll(
      'input[type="text"], input[type="search"], input:not([type])'
    )
  );
  inputs.forEach((element) => {
    if (hasCommentHint(element)) {
      addField(element);
    }
  });

  const editables = Array.from(
    root.querySelectorAll('[contenteditable="true"]')
  );
  editables.forEach((element) => {
    if (hasCommentHint(element) || !isGlobalRoot) {
      addField(element);
    }
  });

  return fields;
}

function collectCommentFields(root) {
  if (!root || !root.querySelectorAll) {
    return [];
  }

  const fields = [];
  const seen = new Set();
  const addField = (element) => {
    if (!element || seen.has(element)) {
      return;
    }
    seen.add(element);
    fields.push(element);
  };

  if (COMMENT_FIELD_SELECTORS.length > 0) {
    COMMENT_FIELD_SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach(addField);
    });
  }

  root
    .querySelectorAll('[contenteditable="true"], [role="textbox"]')
    .forEach(addField);

  if (fields.length === 0) {
    findCommentFields(root).forEach(addField);
  }

  root.querySelectorAll("iframe").forEach((frame) => {
    try {
      const doc = frame.contentDocument;
      if (!doc) {
        return;
      }
      const docRoot = doc.body || doc.documentElement;
      if (!docRoot) {
        return;
      }
      if (
        docRoot.isContentEditable ||
        docRoot.getAttribute("contenteditable") === "true"
      ) {
        addField(docRoot);
      }
      docRoot
        .querySelectorAll('[contenteditable="true"], [role="textbox"], textarea')
        .forEach(addField);
    } catch (error) {
      return;
    }
  });

  return fields;
}

function setInputValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
  dispatchInputEvents(element, value);
}

function dispatchInputEvents(element, value) {
  if (!element) {
    return;
  }
  let inputEvent;
  if (typeof InputEvent === "function") {
    inputEvent = new InputEvent("input", {
      bubbles: true,
      data: value,
      inputType: "insertText"
    });
  } else {
    inputEvent = new Event("input", { bubbles: true });
  }
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("keyup", { bubbles: true }));
}

function setEditableValue(element, value) {
  const doc = element.ownerDocument || document;
  try {
    element.focus();
  } catch (error) {
    // Ignore focus errors and still attempt to set content.
  }

  let applied = false;
  if (doc && typeof doc.execCommand === "function") {
    try {
      doc.execCommand("selectAll", false, null);
      doc.execCommand("insertText", false, value);
      applied = true;
    } catch (error) {
      applied = false;
    }
  }

  if (!applied) {
    element.textContent = value;
  }

  dispatchInputEvents(element, value);
}

function fillCommentField(field, comment, force) {
  if (!field || field.getAttribute(AUTO_COMMENT_ATTR) === "true") {
    return false;
  }

  const isEditable =
    field.isContentEditable ||
    field.getAttribute("contenteditable") === "true" ||
    field.getAttribute("role") === "textbox";
  const currentValue = isEditable
    ? (field.textContent || "").trim()
    : (field.value || "").trim();

  if (currentValue && !force) {
    return false;
  }

  if (isEditable) {
    setEditableValue(field, comment);
  } else {
    setInputValue(field, comment);
  }

  field.setAttribute(AUTO_COMMENT_ATTR, "true");
  return true;
}

function getFieldText(field) {
  if (!field) {
    return "";
  }
  const isEditable =
    field.isContentEditable ||
    field.getAttribute("contenteditable") === "true" ||
    field.getAttribute("role") === "textbox";
  if (isEditable) {
    return (field.textContent || "").trim();
  }
  if (typeof field.value === "string") {
    return field.value.trim();
  }
  return "";
}

function findGradeButton(root) {
  const scope = root || document;
  const buttons = Array.from(scope.querySelectorAll("button"));
  const gradeBtn = buttons.find((btn) => {
    const text = (btn.textContent || "").trim();
    return /grade|cham|chấm/i.test(text);
  });
  if (gradeBtn) {
    return gradeBtn;
  }

  return buttons.find((btn) =>
    /grade|cham|chấm/i.test(btn.getAttribute("aria-label") || "")
  );
}

function clickRating(group, rating) {
  if (!group || group.getAttribute(AUTO_GRADE_ATTR) === "true") {
    return false;
  }

  const radios = group.querySelectorAll('input[type="radio"]');
  if (radios.length > 0) {
    const index = Math.min(rating, radios.length) - 1;
    if (index >= 0 && !radios[index].disabled) {
      radios[index].click();
      group.setAttribute(AUTO_GRADE_ATTR, "true");
      return true;
    }
    return false;
  }

  const stars = group.querySelectorAll(".MuiRating-icon, span, svg");
  if (stars.length > 0) {
    const index = Math.min(rating, stars.length) - 1;
    if (index >= 0) {
      stars[index].click();
      group.setAttribute(AUTO_GRADE_ATTR, "true");
      return true;
    }
  }

  return false;
}

function autoGrade(rating = DEFAULT_RATING, options = {}) {
  const { force = false } = options;
  const root = findGradingRoot();
  if (!root) {
    console.log("Không tìm thấy bảng chấm điểm");
    return;
  }

  const ratingGroups = findRatingGroups(root);
  if (ratingGroups.length === 0) {
    console.log("Không tìm thấy ô rating");
    return;
  }

  let gradedCount = 0;
  ratingGroups.forEach((group) => {
    if (clickRating(group, rating)) {
      gradedCount += 1;
    }
  });

  if (gradedCount === 0 && !force) {
    console.log("Không có ô rating mới để chấm");
    return;
  }

  console.log("Đã chấm sao cho các ô rating");

  const gradeBtn = findGradeButton(root) || findGradeButton(document);
  if (gradeBtn) {
    gradeBtn.click();
    console.log("Đã bấm nút Grade");
  } else {
    console.log("Không tìm được nút Grade");
  }
}

function findSendCommentButton(root) {
  if (!root || !root.querySelectorAll) {
    return null;
  }

  for (const selector of SEND_COMMENT_SELECTORS) {
    const element = root.querySelector(selector);
    if (!element) {
      continue;
    }
    if (element.tagName && element.tagName.toLowerCase() === "button") {
      return element;
    }
    const button = element.querySelector("button");
    if (button) {
      return button;
    }
    return element;
  }

  const buttons = Array.from(root.querySelectorAll("button"));
  return buttons.find((btn) => /send|gui|gửi/i.test(btn.textContent || "")) || null;
}

function autoComment(comment = DEFAULT_COMMENT, options = {}) {
  const { force = false, autoSend = true, root: rootOverride } = options;
  const root =
    rootOverride ||
    findCommentRoot() ||
    findGradingRoot() ||
    document.body ||
    document.documentElement;
  if (!root) {
    console.log("Không tìm thấy bảng chấm điểm để comment");
    return;
  }

  const fields = collectCommentFields(root);
  if (fields.length === 0) {
    console.log("Không tìm thấy ô comment");
    return;
  }

  const text = (comment || "").trim();
  if (!text) {
    console.log("Comment trống, bỏ qua");
    return;
  }

  let filledCount = 0;
  fields.forEach((field) => {
    if (fillCommentField(field, text, force)) {
      filledCount += 1;
    }
  });

  if (filledCount === 0 && !force) {
    console.log("Không có ô comment mới để điền");
    return;
  }

  console.log("Đã điền comment");

  if (autoSend) {
    const sendBtn = findSendCommentButton(root);
    if (sendBtn) {
      sendBtn.click();
      console.log("Đã bấm nút gửi comment");
    } else {
      console.log("Không tìm thấy nút gửi comment");
    }
  }
}

function normalizeWhitespace(text) {
  return (text || "").toString().replace(/\s+/g, " ").trim();
}

function extractQuestionText() {
  for (const selector of QUESTION_SELECTORS) {
    const element = document.querySelector(selector);
    if (!element) {
      continue;
    }
    const text = normalizeWhitespace(element.innerText || element.textContent);
    if (text) {
      return text.slice(0, MAX_QUESTION_CHARS);
    }
  }
  return "";
}

function requestAiGenerate(input) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "AI_GENERATE", input },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            status: "error",
            error: chrome.runtime.lastError.message
          });
          return;
        }
        resolve(response || { status: "error", error: "No response" });
      }
    );
  });
}

function waitForCommentField(rootOverride, timeoutMs = COMMENT_WAIT_MS) {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const root =
        rootOverride ||
        findCommentRoot() ||
        findGradingRoot() ||
        document.body ||
        document.documentElement;
      if (root) {
        const fields = collectCommentFields(root);
        if (fields.length > 0) {
          resolve(true);
          return;
        }
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, COMMENT_CHECK_INTERVAL_MS);
    };
    check();
  });
}

function hasNonEmptyComment(root) {
  const scope =
    root ||
    findCommentRoot() ||
    findGradingRoot() ||
    document.body ||
    document.documentElement;
  const fields = collectCommentFields(scope);
  return fields.some((field) => getFieldText(field));
}

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

function findClickableAncestor(target) {
  let node = target;
  while (node && node !== document.body) {
    if (
      node.matches &&
      node.matches("button, a, [role=\"button\"], [tabindex]")
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

async function autoCommentFromQuestion(options = {}) {
  const { autoSend = false, root } = options;
  if (aiCommentInFlight) {
    return;
  }
  aiCommentInFlight = true;

  const question = extractQuestionText();
  if (!question) {
    console.log("Không tìm thấy nội dung câu hỏi");
    aiCommentInFlight = false;
    return;
  }

  const response = await requestAiGenerate(question);
  if (!response || response.status !== "ok") {
    console.log(
      "AI generate failed:",
      response?.error || "Unknown error"
    );
    aiCommentInFlight = false;
    return;
  }

  const comment = (response.text || "").trim();
  if (!comment) {
    console.log("AI trả về comment trống");
    aiCommentInFlight = false;
    return;
  }

  const hasField = await waitForCommentField(root);
  if (!hasField) {
    console.log("Không tìm thấy ô comment để điền");
    aiCommentInFlight = false;
    return;
  }

  autoComment(comment, { force: true, autoSend, root });
  aiCommentInFlight = false;
}

function handleReplyClick(event) {
  const clickable = findClickableAncestor(event.target);
  if (!clickable) {
    return;
  }
  if (isSendTrigger(clickable)) {
    const root = findClosestCommentRoot(clickable);
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
  autoCommentFromQuestion({ autoSend: false, root: findClosestCommentRoot(clickable) });
}

function scheduleAutoGrade(rating = DEFAULT_RATING) {
  if (autoGradeTimer) {
    clearTimeout(autoGradeTimer);
  }
  autoGradeTimer = setTimeout(() => {
    autoGrade(rating);
  }, AUTO_GRADE_DEBOUNCE_MS);
}

function startAutoDetect() {
  if (autoObserverStarted) {
    return;
  }
  autoObserverStarted = true;

  scheduleAutoGrade(DEFAULT_RATING);

  const observer = new MutationObserver((mutations) => {
    const hasAddedNodes = mutations.some(
      (mutation) => mutation.addedNodes && mutation.addedNodes.length > 0
    );
    if (hasAddedNodes) {
      scheduleAutoGrade(DEFAULT_RATING);
    }
  });

  const root = document.documentElement || document.body;
  if (root) {
    observer.observe(root, { childList: true, subtree: true });
  }
}

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

startAutoDetect();
