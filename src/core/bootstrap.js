// ═══════════════════════════════════════════════════════════
// core/bootstrap.js — App bootstrap (back button, splash, routing)
// ─────────────────────────────────────────────────────────
// Load order: AFTER fallbacks.js + data.js, BEFORE feature modules.
// Exposes globals: showPage(), hideSplash()
// (showApp and doLogin live in modules/auth.js and are expected
//  to be defined by the time initApp() runs.)
// ─────────────────────────────────────────────────────────
// Refactor notes:
//   • Merged two duplicate popstate IIFEs (legacy lines 158 and 349).
//   • Removed duplicate `hideSplash` function (was defined twice).
// ═══════════════════════════════════════════════════════════


// ── BACK BUTTON — prevent user from leaving the app ──
(function(){
  // Seed two history entries so the first back press is absorbed silently
  history.pushState({app:true}, '', location.href);
  history.pushState({app:true}, '', location.href);

  window.addEventListener('popstate', function(){
    // Re-push state every time so we never actually leave
    history.pushState({app:true}, '', location.href);

    // Priority 1: close chat if open
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.classList.contains('open')) {
      if (typeof closeChat === 'function') closeChat();
      else chatModal.classList.remove('open');
      return;
    }

    // Priority 2: close any open modal overlay
    const openModal = document.querySelector('.modal-overlay.open');
    if (openModal) {
      openModal.classList.remove('open');
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


// ── SPLASH & INIT ──
(async function initApp(){
  try {
    // Ensure chat modal is hidden on first paint
    const chatM = document.getElementById('chat-modal');
    if (chatM) { chatM.style.display = 'none'; chatM.classList.remove('open'); }

    if (typeof applyLang === 'function')  applyLang();
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof startClock === 'function') startClock();

    // If a saved user exists → open app directly, else show login
    const saved = localStorage.getItem('oraimo_user');
    if (saved) {
      try {
        window.currentUser = JSON.parse(saved);
        if (typeof showApp === 'function') showApp();
        else if (typeof showPage === 'function') showPage('login-page');
      } catch (e) {
        localStorage.removeItem('oraimo_user');
        if (typeof showPage === 'function') showPage('login-page');
      }
    } else {
      if (typeof showPage === 'function') showPage('login-page');
    }

    // Hide splash after a short delay
    setTimeout(hideSplash, 500);

  } catch (e) {
    console.warn('initApp error:', e);
    const login = document.getElementById('login-page');
    if (login) login.style.display = 'flex';
    setTimeout(hideSplash, 500);
  }
})();

function hideSplash(){
  const s = document.getElementById('splash');
  if (s) s.classList.add('hide');
}


// ── PAGE TRANSITIONS ──
let _prevPage = 'login-page';
const PAGE_ORDER = ['login-page', 'emp-app', 'admin-app'];

function showPage(id){
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
