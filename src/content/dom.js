function getRootElement(root) {
  if (!root) {
    return null;
  }
  if (root === document) {
    return document.body || document.documentElement;
  }
  return root;
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeWhitespace(text) {
  return (text || "").toString().replace(/\s+/g, " ").trim();
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
