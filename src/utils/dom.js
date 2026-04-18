// ────────────────────────────────────────────────────────────
// DOM UTILS  (hardened)
// ────────────────────────────────────────────────────────────
// Review-pass fixes:
//   • `notify` uses textContent (was already) but we also set aria-live
//     so screen readers announce toasts.
//   • `safeHTML` tag helper lets templates interpolate user data safely.
//   • debounce / throttle helpers to reduce DOM churn in list-heavy views.
// ────────────────────────────────────────────────────────────

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function on(el, event, handler, opts) {
  if (!el) return;
  el.addEventListener(event, handler, opts);
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Tagged-template literal that auto-escapes interpolated values.
 *   safeHTML`<div>${userInput}</div>`   // userInput is escaped
 */
export function safeHTML(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += escapeHtml(values[i]);
  });
  return out;
}

/**
 * Show a transient toast at the top of the page. Accessible + stacking.
 */
export function notify(message, kind = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    container.style.cssText =
      'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
      'z-index:9999;display:flex;flex-direction:column;gap:8px;' +
      'pointer-events:none;max-width:90vw';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bg = kind === 'error' ? '#ff3b3b' : kind === 'success' ? '#00C853' : '#2979FF';
  toast.style.cssText =
    `pointer-events:auto;background:${bg};color:#fff;padding:10px 18px;` +
    'border-radius:10px;font-size:13px;font-weight:700;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.4);animation:toastIn .3s';
  toast.textContent = String(message ?? '');  // textContent prevents HTML injection
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function setBusy(el, busy) {
  if (!el) return;
  if (busy) {
    if (!el.dataset.prev) el.dataset.prev = el.innerHTML;
    el.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  } else if (el.dataset.prev !== undefined) {
    el.innerHTML = el.dataset.prev;
    delete el.dataset.prev;
  }
}

export function debounce(fn, wait = 200) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttle(fn, wait = 200) {
  let last = 0;
  let pending = null;
  return function(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      if (pending) { clearTimeout(pending); pending = null; }
      last = now;
      fn.apply(this, args);
    } else if (!pending) {
      pending = setTimeout(() => {
        last = Date.now();
        pending = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
