let statusTimer = null;

export function setStatus(statusEl, message, type) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message || "";
  statusEl.classList.remove("ok", "error");
  if (type) {
    statusEl.classList.add(type);
  }
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  if (message) {
    statusTimer = setTimeout(() => {
      statusEl.textContent = "";
      statusEl.classList.remove("ok", "error");
      statusTimer = null;
    }, 3000); // Increased from 1800ms to 3000ms for better UX
  }
}

export function bindPasswordToggle(keyEl, toggleBtn) {
  if (!keyEl || !toggleBtn) {
    return;
  }
  toggleBtn.addEventListener("click", () => {
    if (keyEl.type === "password") {
      keyEl.type = "text";
      toggleBtn.textContent = "Hide";
      return;
    }
    keyEl.type = "password";
    toggleBtn.textContent = "Show";
  });
}

export function toggleLoading(button, isLoading) {
  if (!button) {
    return;
  }
  if (isLoading) {
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.classList.remove("loading");
    button.disabled = false;
  }
}
