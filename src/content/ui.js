/**
 * EduVip UI Manager
 * Handles floating notifications and other UI elements
 */

class EduVipToastManager {
  constructor() {
    this.container = null;
    this.stylesInjected = false;
    this.init();
  }

  init() {
    this.injectStyles();
    this.createContainer();
  }

  injectStyles() {
    if (this.stylesInjected) return;

    const style = document.createElement('style');
    style.textContent = `
      .eduvip-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }

      .eduvip-toast {
        display: flex;
        align-items: center;
        min-width: 300px;
        max-width: 450px;
        background: rgba(255, 255, 255, 0.95);
        color: #1f2937;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid rgba(229, 231, 235, 0.5);
        backdrop-filter: blur(8px);
        transform-origin: top right;
        animation: eduvip-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
        overflow: hidden;
      }

      @media (prefers-color-scheme: dark) {
        .eduvip-toast {
          background: rgba(31, 41, 55, 0.95);
          color: #f3f4f6;
          border-color: rgba(75, 85, 99, 0.5);
        }
      }

      .eduvip-toast-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .eduvip-toast-content {
        flex: 1;
        margin-right: 8px;
        font-weight: 500;
      }

      .eduvip-toast-close {
        flex-shrink: 0;
        border: none;
        background: transparent;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .eduvip-toast-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #4b5563;
      }

      .eduvip-toast.type-success {
        border-left: 4px solid #10b981;
      }
      .eduvip-toast.type-success .eduvip-toast-icon { color: #10b981; }

      .eduvip-toast.type-error {
        border-left: 4px solid #ef4444;
      }
      .eduvip-toast.type-error .eduvip-toast-icon { color: #ef4444; }

      .eduvip-toast.type-info {
        border-left: 4px solid #3b82f6;
      }
      .eduvip-toast.type-info .eduvip-toast-icon { color: #3b82f6; }

      .eduvip-toast.type-warning {
        border-left: 4px solid #f59e0b;
      }
      .eduvip-toast.type-warning .eduvip-toast-icon { color: #f59e0b; }

      .eduvip-toast.hiding {
        animation: eduvip-fade-out 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes eduvip-slide-in {
        from {
          opacity: 0;
          transform: translateX(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      @keyframes eduvip-fade-out {
        from {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateX(20px) scale(0.95);
        }
      }
    `;
    document.head.appendChild(style);
    this.stylesInjected = true;
  }

  createContainer() {
    if (document.querySelector('.eduvip-toast-container')) {
      this.container = document.querySelector('.eduvip-toast-container');
      return;
    }

    this.container = document.createElement('div');
    this.container.className = 'eduvip-toast-container';
    document.body.appendChild(this.container);
  }

  getIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': default: return '🤖';
    }
  }

  show(message, type = 'info', duration = 5000) {
    if (!this.container) this.createContainer();

    const toast = document.createElement('div');
    toast.className = `eduvip-toast type-${type}`;

    // HTML Structure
    toast.innerHTML = `
      <div class="eduvip-toast-icon">${this.getIcon(type)}</div>
      <div class="eduvip-toast-content">${message}</div>
      <button class="eduvip-toast-close">×</button>
    `;

    // Close button handler
    const closeBtn = toast.querySelector('.eduvip-toast-close');
    closeBtn.onclick = () => this.hide(toast);

    // Auto close
    if (duration > 0) {
      setTimeout(() => this.hide(toast), duration);
    }

    this.container.appendChild(toast);
  }

  hide(toast) {
    if (toast.classList.contains('hiding')) return;

    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }
}

// Export for global usage
console.log("[EduVip] Initializing Toast Manager...");
window.EduVipToast = new EduVipToastManager();
