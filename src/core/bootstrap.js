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


// ── BACK BUTTON — absorb Android / gesture back; never exit PWA on first backs ──
(function(){
  try {
    history.replaceState({ app: 'root' }, '', location.href);
    history.pushState({ app: 'guard' }, '', location.href);
  } catch (_) {}

  window.addEventListener('popstate', function () {
    // Priority 1: chat full-screen — close first, then re-anchor history
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.classList.contains('open')) {
      if (typeof closeChat === 'function') closeChat();
      else {
        chatModal.classList.remove('open');
        chatModal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
      try {
        history.replaceState({ app: 'root' }, '', location.href);
        history.pushState({ app: 'guard' }, '', location.href);
      } catch (_) {}
      return;
    }

    // Priority 2: modal overlays
    const openModal = document.querySelector('.modal-overlay.open');
    if (openModal) {
      openModal.classList.remove('open');
      document.body.classList.remove('modal-open');
      try {
        history.replaceState({ app: 'root' }, '', location.href);
        history.pushState({ app: 'guard' }, '', location.href);
      } catch (_) {}
      return;
    }

    // Priority 3: camera
    const camModal = document.getElementById('camera-modal');
    if (camModal && camModal.classList.contains('open')) {
      if (typeof closeCamera === 'function') closeCamera();
      else camModal.classList.remove('open');
      try {
        history.replaceState({ app: 'root' }, '', location.href);
        history.pushState({ app: 'guard' }, '', location.href);
      } catch (_) {}
      return;
    }

    // Nothing to close — stay in app by pushing guard again
    try {
      history.pushState({ app: 'guard' }, '', location.href);
    } catch (_) {}
  });
})();


// ── SPLASH & INIT ──
function _runInitApp(){
  try {
    const chatM = document.getElementById('chat-modal');
    if (chatM) { chatM.style.display = 'none'; chatM.classList.remove('open'); }
    if (typeof applyLang === 'function')  applyLang();
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof startClock === 'function') startClock();
    let saved=null;
    try{saved=localStorage.getItem('oraimo_user');}catch(_){}
    if(!saved) try{saved=sessionStorage.getItem('oraimo_user');}catch(_){}
    if (saved) {
      try {
        window.currentUser = JSON.parse(saved);
        if (typeof showApp === 'function') showApp();
        else showPage('login-page');
      } catch (e) {
        try{localStorage.removeItem('oraimo_user');}catch(_){}
        try{sessionStorage.removeItem('oraimo_user');}catch(_){}
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
if (document.readyState === 'complete') _runInitApp();
else window.addEventListener('load', _runInitApp);

function hideSplash(){
  const s = document.getElementById('splash');
  if (s) s.classList.add('hide');
}


// ── PAGE TRANSITIONS ──
let _prevPage = 'login-page';
const PAGE_ORDER = ['login-page', 'emp-app', 'admin-app'];

function showPage(id){
  const chat = document.getElementById('chat-modal');
  if (chat && chat.classList.contains('open') && typeof closeChat === 'function') {
    closeChat();
  } else if (chat) {
    chat.classList.remove('open');
    chat.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

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
