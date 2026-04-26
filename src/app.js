// ────────────────────────────────────────────────────────────
// APP ENTRY POINT  (v3 + FIX VISITS ACCESS + FIX dbPatch)
// ────────────────────────────────────────────────────────────

import { state, loadUserFromStorage } from './state.js';
import { db, safeFilterValue, invalidateCache, clearAllCache } from './services/supabase.js';
import { login as authLogin, logout as authLogout } from './services/auth.js';
import * as storageSvc from './services/storage.js';
import * as notifSvc from './services/notifications.js';
import { notify, $, $$, escapeHtml, safeHTML, debounce, throttle } from './utils/dom.js';
import { fmtDate, todayStr, fmtEGP, getPayrollMonth, fmtTime } from './utils/format.js';
import { applyLang, toggleLang, fixNavDirection } from './utils/lang.js';
import { applyTheme, toggleTheme } from './utils/theme.js';
import { exportToExcel, exportToPDF } from './utils/exports.js';
import { DAYS_AR, DAYS_EN, ROLES } from './config.js';


// ── STATE BINDING
Object.defineProperties(window, {
  currentUser:   { get: () => state.currentUser,   set: v => { state.currentUser = v; }, configurable: true },
  currentLang:   { get: () => state.currentLang,   set: v => { state.currentLang = v; }, configurable: true },
  allEmployees:  { get: () => state.allEmployees,  set: v => { state.allEmployees = v; }, configurable: true },
  branches:      { get: () => state.branches,      set: v => { state.branches = v; },    configurable: true },
});


// ── GLOBAL FUNCTIONS
Object.assign(window, {
  dbGet: db.get,
  dbPost: db.post,

  // ✅ FIX: dbPatch wrapper — كان بيعكس ترتيب body و query
  // db.patch الأصلي: (table, query_string, body_object)
  // الكود كله بيستدعي: dbPatch(table, body_object, query_string)
  // الـ wrapper القديم كان بيبعت الـ object كـ query والـ string كـ body
  dbPatch: async (table, bodyOrQuery, queryOrBody) => {
    let query, body;
    if (typeof bodyOrQuery === 'string') {
      // استدعاء بترتيب db.patch الأصلي: (table, query, body)
      query = bodyOrQuery;
      body = queryOrBody;
    } else if (typeof bodyOrQuery === 'object' && bodyOrQuery !== null) {
      // استدعاء بالترتيب الشائع في الكود: (table, body, query)
      body = bodyOrQuery;
      query = queryOrBody || '';
    } else {
      // fallback آمن
      body = bodyOrQuery;
      query = queryOrBody || '';
    }
    return db.patch(table, String(query), body);
  },

  dbDel: db.delete,
  dbDelete: db.delete,

  safeFilterValue,
  invalidateCache,
  clearAllCache,

  notify,
  applyLang,
  toggleLang,
  fixNavDirection,
  applyTheme,
  toggleTheme,

  fmtDate,
  todayStr,
  fmtEGP,
  fmtTime,
  getPayrollMonth,

  DAYS_AR,
  DAYS_EN,
  ROLES,

  escapeHtml,
  safeHTML,
  debounce,
  throttle,
  $, $$,

  authLogin,
  authLogout,

  uploadAny: storageSvc.uploadAny,
  compressImage: storageSvc.compressImage,
  dataUrlToBlob: storageSvc.dataUrlToBlob,
  getPublicUrl: storageSvc.getPublicUrl,

  sendPushNotification: notifSvc.sendPushNotification,
  registerOneSignalUser: notifSvc.registerOneSignalUser,
  resetPushRegistrationState: notifSvc.resetPushRegistrationState,

  exportToExcel,
  exportToPDF,
});


// ─────────────────────────────────────────
// 🔒 التحكم في ظهور "الزيارات"
// ─────────────────────────────────────────
function controlVisitsAccess() {
  const el = document.getElementById('nav-visits');
  if (!el) return;

  const user = window.currentUser;

  // 👇 المسموح فقط manager (التيم ليدر)
  if (!user || user.role !== 'manager') {
    el.style.display = 'none';
  } else {
    el.style.display = 'flex';
  }
}


// ── BOOTSTRAP
loadUserFromStorage();
applyTheme();
applyLang();


// ── ERROR HANDLING
window.addEventListener('error', e => {
  console.warn('[app] error:', e.message, `@ ${e.filename}:${e.lineno}:${e.colno}`);
});

window.addEventListener('unhandledrejection', e => {
  const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  console.warn('[app] unhandled rejection:', msg);
});


// ── APP READY
window.__APP_READY__ = true;
window.dispatchEvent(new Event('app:ready'));


// ── DOM READY
document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat-modal');
  if (chat) chat.style.display = 'none';

  // 🔥 مهم
  setTimeout(controlVisitsAccess, 300);
});


// ── SPLASH
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
  }, 2000);
});

window.addEventListener('app:ready', () => {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hide');

  // 🔥 مهم
  setTimeout(controlVisitsAccess, 300);
});


export { state };
