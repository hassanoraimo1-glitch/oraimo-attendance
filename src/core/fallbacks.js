// ═══════════════════════════════════════════════════════════
// core/fallbacks.js — Safe fallbacks + global state
// Runs BEFORE all other modules. Only defines on `window` if not already
// populated by src/app.js (ES module entry point).
// ═══════════════════════════════════════════════════════════

window.__LEGACY_LOADED__ = true;

// ── SAFE FALLBACKS (في حالة app.js ما اتحملش) ──
if (typeof window.currentLang === 'undefined') {
  window.currentLang = localStorage.getItem('oraimo_lang') || 'ar';
}

if (typeof window.dbGet !== 'function') {
  const SUPA_URL = 'https://lmszelfnosejdemxhodm.supabase.co';
  const SUPA_KEY = 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb';
  const _hdr = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
  window.dbGet = async function (table, q = '') {
    const res = await fetch(SUPA_URL + '/rest/v1/' + table + (q || ''), { headers: _hdr });
    if (!res.ok) throw new Error('DB GET failed ' + res.status);
    return res.json();
  };
  window.dbPost = async function (table, body) {
    const res = await fetch(SUPA_URL + '/rest/v1/' + table, { method: 'POST', headers: { ..._hdr, Prefer: 'return=representation' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('DB POST failed ' + res.status);
    return res.json();
  };
  window.dbPatch = async function (table, body, query) {
    const res = await fetch(SUPA_URL + '/rest/v1/' + table + (query || ''), { method: 'PATCH', headers: _hdr, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('DB PATCH failed ' + res.status);
    return res.status === 204 ? null : res.json();
  };
  window.dbDelete = async function (table, query) {
    const res = await fetch(SUPA_URL + '/rest/v1/' + table + (query || ''), { method: 'DELETE', headers: _hdr });
    if (!res.ok) throw new Error('DB DELETE failed ' + res.status);
    return null;
  };
  console.log('[legacy] using fallback DB client');
}

// NOTE: notify is NOT fallback-defined here anymore — it's a first-class
// function in modules/ui.js (assigned to window.notify as well).
// This prevents shadow-loop bugs where ui.js's notify calls window.notify
// which calls itself.

if (typeof window.todayStr !== 'function') {
  window.todayStr = function () { return new Date().toISOString().split('T')[0]; };
}
if (typeof window.fmtDate !== 'function') {
  window.fmtDate = function (d) { return new Date(d).toISOString().split('T')[0]; };
}
if (typeof window.fmtEGP !== 'function') {
  window.fmtEGP = function (n) { n = Number(n) || 0; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return String(Math.round(n)); };
}
if (typeof window.fmtTime !== 'function') {
  window.fmtTime = function (iso) { try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
}
if (typeof window.getPayrollMonth !== 'function') {
  window.getPayrollMonth = function () {
    const now = new Date(); const d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let s, e;
    if (d >= 21) { s = new Date(y, m, 21); e = new Date(y, m + 1, 20); }
    else { s = new Date(y, m - 1, 21); e = new Date(y, m, 20); }
    return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0], label: s.toLocaleString('ar-EG', { month: 'long' }) + ' 21' };
  };
}
if (typeof window.applyLang !== 'function') {
  window.applyLang = function () {
    const isAr = window.currentLang === 'ar';
    document.documentElement.lang = window.currentLang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-ar],[data-en]').forEach(el => {
      const ar = el.dataset.ar, en = el.dataset.en;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { el.placeholder = isAr ? (el.dataset.arPh || el.placeholder) : (el.dataset.enPh || el.placeholder); }
      else if (ar && en) { el.textContent = isAr ? ar : en; }
    });
  };
}
if (typeof window.toggleLang !== 'function') {
  window.toggleLang = function () {
    window.currentLang = window.currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('oraimo_lang', window.currentLang);
    window.applyLang();
  };
}
if (typeof window.fixNavDirection !== 'function') {
  // No-op fallback; real one comes from utils/lang.js via app.js
  window.fixNavDirection = function () {};
}
if (typeof window.DAYS_AR === 'undefined') {
  window.DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  window.DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
}

// ────────────────────────────────────────────────────────────
// GLOBAL STATE (declared once here — all other modules use these)
// ────────────────────────────────────────────────────────────
var allAdmins = [];
var allBranches = [];
var workSettings = { start: '09:00', end: '18:00' };
var videoStream = null;
var capturedPhoto = null;
var capturedLocation = null;
var attendMode = 'in';
var selectedProduct = null;
var selectedQty = 1;
var _isSubmitting = false;
var DAYS_AR = window.DAYS_AR;
var DAYS_EN = window.DAYS_EN;

// ── NOTIFICATIONS FALLBACK (app.js ES module may not load) ──
if (typeof window.sendPushNotification !== 'function') {
  window.sendPushNotification = async function(title, message, targetUserId) {
    if (!title || !message) return;
    try {
      const SUPA_URL = 'https://lmszelfnosejdemxhodm.supabase.co';
      const SUPA_KEY = 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb';
      await fetch(SUPA_URL + '/functions/v1/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SUPA_KEY, apikey: SUPA_KEY },
        body: JSON.stringify({ title: String(title).slice(0,120), message: String(message).slice(0,300), target_user_id: targetUserId ? String(targetUserId) : null })
      });
    } catch(e) { console.warn('[notif fallback]', e.message); }
  };
}

if (typeof window.resetPushRegistrationState !== 'function') {
  window.resetPushRegistrationState = function () {};
}
if (typeof window.registerOneSignalUser !== 'function') {
  window.registerOneSignalUser = async function() {
    const user = window.currentUser;
    if (!user || !user.id) return;
    for (let i = 0; i < 10; i++) {
      if (window.OneSignal && window.OneSignal.Notifications && window.OneSignal.User) break;
      await new Promise(r => setTimeout(r, 1500));
    }
    const OS = window.OneSignal;
    if (!OS || !OS.Notifications || !OS.User) return;
    try {
      try { await OS.login(String(user.id)); } catch (_) {}
      let ok = OS.Notifications.permission === true || OS.Notifications.permission === 'granted';
      if (!ok && typeof Notification !== 'undefined' && Notification.permission === 'granted') ok = true;
      if (!ok) {
        const asked = await OS.Notifications.requestPermission().catch(() => false);
        ok = asked === true || asked === 'granted' || (typeof Notification !== 'undefined' && Notification.permission === 'granted');
      }
      if (!ok) return;
      const sub = OS.User.PushSubscription;
      if (sub && typeof sub.optIn === 'function') await sub.optIn().catch(() => {});
      await OS.User.addTag('user_id', String(user.id));
      await OS.User.addTag('name', String(user.name || ''));
      await OS.User.addTag('role', String(user.role || 'employee'));
    } catch(e) { console.warn('[onesignal fallback]', e.message); }
  };
}

// ── REALTIME CHAT FALLBACK ──
if (typeof window.chatSubscribeRealtime !== 'function') {
  window.chatSubscribeRealtime = async function(onNew) {
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
      const client = mod.createClient('https://lmszelfnosejdemxhodm.supabase.co', 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb');
      const channel = client.channel('messages-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => { if (onNew) onNew(payload.new); }).subscribe();
      return function unsub() { try { client.removeChannel(channel); } catch(_){} };
    } catch(e) {
      console.warn('[realtime fallback]', e.message);
      throw e;
    }
  };
}
