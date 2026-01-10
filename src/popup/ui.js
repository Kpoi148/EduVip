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
    }, 1800);
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
