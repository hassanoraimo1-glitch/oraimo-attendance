// ═══════════════════════════════════════════════════════════
// core/bootstrap.js — App bootstrap (back button, splash, routing)
// ─────────────────────────────────────────────────────────
// SAFE BOOT PATCH:
//   • Init on DOMContentLoaded instead of waiting only for window.load
//   • Keep load fallback
//   • Prevent duplicate init runs
//   • Keep existing routing/back-button behavior unchanged
// ═══════════════════════════════════════════════════════════


// ── BACK BUTTON — prevent user from leaving the app ──
(function () {
  try {
    history.pushState({ app: true }, '', location.href);
    history.pushState({ app: true }, '', location.href);
  } catch (_) {}

  window.addEventListener('popstate', function () {
    try {
      history.pushState({ app: true }, '', location.href);
    } catch (_) {}

    // Priority 1: close chat if open
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.classList.contains('open')) {
      if (typeof closeChat === 'function') closeChat();
      else chatModal.classList.remove('open');
      return;
    }

    // Priority 2: close any open modal overlay
    const openedModal = document.querySelector('.modal-overlay.open');
    if (openedModal) {
      openedModal.classList.remove('open');
      document.body.classList.remove('modal-open');
      return;
    }

    // Priority 3: close camera if open
    const camModal = document.getElementById('camera-modal');
    if (camModal && camModal.classList.contains('open')) {
      if (typeof closeCamera === 'function') closeCamera();
      else camModal.classList.remove('open');
      return;
    }
  });
})();


// ── PAGE TRANSITIONS ──
let _prevPage = 'login-page';
const PAGE_ORDER = ['login-page', 'emp-app', 'admin-app'];

function showPage(id) {
  // Always hide chat modal when switching pages
  const chat = document.getElementById('chat-modal');
  if (chat) chat.style.display = 'none';

  const prevIdx = PAGE_ORDER.indexOf(_prevPage);
  const nextIdx = PAGE_ORDER.indexOf(id);

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active', 'slide-in-right', 'slide-in-left');
    p.style.display = 'none';
  });

  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'block';
    el.classList.add('active');

    if (nextIdx < prevIdx) el.classList.add('slide-in-left');
    else if (nextIdx > prevIdx) el.classList.add('slide-in-right');
  }

  _prevPage = id;
}


// ── SPLASH ──
function hideSplash() {
  const s = document.getElementById('splash');
  if (s) s.classList.add('hide');
}


// ── INIT ──
let __BOOTSTRAP_RAN__ = false;

function _runInitApp() {
  try {
    const chatM = document.getElementById('chat-modal');
    if (chatM) {
      chatM.style.display = 'none';
      chatM.classList.remove('open');
    }

    if (typeof applyLang === 'function') applyLang();
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof startClock === 'function') startClock();

    let saved = null;
    try { saved = localStorage.getItem('oraimo_user'); } catch (_) {}
    if (!saved) {
      try { saved = sessionStorage.getItem('oraimo_user'); } catch (_) {}
    }

    if (saved) {
      try {
        // Don't set window.currentUser here — let restoreSavedSession
        // handle everything (DB refresh + showApp) to avoid double init
        if (typeof restoreSavedSession === 'function') {
          restoreSavedSession();
        } else {
          // Fallback if auth.js hasn't loaded yet
          window.currentUser = JSON.parse(saved);
          if (typeof showApp === 'function') {
            showApp();
          } else {
            showPage('login-page');
          }
        }
      } catch (e) {
        try { localStorage.removeItem('oraimo_user'); } catch (_) {}
        try { sessionStorage.removeItem('oraimo_user'); } catch (_) {}
        showPage('login-page');
      }
    } else {
      showPage('login-page');
    }

    hideSplash();
  } catch (e) {
    console.warn('initApp error:', e);
    const login = document.getElementById('login-page');
    if (login) login.style.display = 'flex';
    hideSplash();
  }
}

function _initAppOnce() {
  if (__BOOTSTRAP_RAN__) return;
  __BOOTSTRAP_RAN__ = true;
  _runInitApp();
}

// Wait a little for late-loaded legacy scripts if needed
function _scheduleInitApp(retries = 30) {
  const depsReady =
    typeof showPage === 'function' &&
    typeof hideSplash === 'function';

  // showApp may still load slightly later; _runInitApp already handles that safely
  if (depsReady || retries <= 0) {
    _initAppOnce();
    return;
  }

  setTimeout(() => _scheduleInitApp(retries - 1), 100);
}


// ── STARTUP TRIGGERS ──
// Important:
// DOMContentLoaded is earlier and safer than waiting only for full window load.
// This fixes the "first open needs refresh" issue in many PWAs / heavy pages.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    _scheduleInitApp();
  }, { once: true });

  window.addEventListener('load', () => {
    _scheduleInitApp();
  }, { once: true });
} else {
  _scheduleInitApp();
}
