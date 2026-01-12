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

  // Note: We don't sanitize AI-generated comments because:
  // 1. Gemini API responses are already safe
  // 2. Sanitization can break formatting (line breaks, special chars)
  // 3. For user input from popup, validation is done before sending

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
  return (
    buttons.find((btn) => /send|gui|gửi/i.test(btn.textContent || "")) || null
  );
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
