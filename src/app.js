// ────────────────────────────────────────────────────────────
// APP ENTRY POINT  (v3)
// ────────────────────────────────────────────────────────────
// Third-pass fixes:
//   • Global error handler no longer logs the full `Error` object,
//     which could include sensitive context attached by libraries.
//     We log only: message, source, line, column.
//   • Quieter success logs.
//   • `__APP_READY__` kept because legacy script polls for it.
// ────────────────────────────────────────────────────────────

import { state, loadUserFromStorage } from './state.js';
import { db, safeFilterValue, invalidateCache, clearAllCache } from './services/supabase.js';
import { login as authLogin, logout as authLogout } from './services/auth.js';
import * as storageSvc from './services/storage.js';
import * as notifSvc from './services/notifications.js';
import * as chatSvc from './services/chat.js';
import { notify, $, $$, escapeHtml, safeHTML, debounce, throttle } from './utils/dom.js';
import { fmtDate, todayStr, fmtEGP, getPayrollMonth, fmtTime } from './utils/format.js';
import { applyLang, toggleLang, fixNavDirection } from './utils/lang.js';
import { applyTheme, toggleTheme } from './utils/theme.js';
import { exportToExcel, exportToPDF } from './utils/exports.js';
import { DAYS_AR, DAYS_EN, ROLES } from './config.js';

// ── Reactive accessors for state on `window` so legacy code stays in sync.
Object.defineProperties(window, {
  currentUser:   { get: () => state.currentUser,   set: v => { state.currentUser = v; }, configurable: true },
  currentLang:   { get: () => state.currentLang,   set: v => { state.currentLang = v; }, configurable: true },
  allEmployees:  { get: () => state.allEmployees,  set: v => { state.allEmployees = v; }, configurable: true },
  branches:      { get: () => state.branches,      set: v => { state.branches = v; },    configurable: true },
});

// ── Plain exposures (functions, constants).
Object.assign(window, {
  dbGet: db.get,
  dbPost: db.post,
  // Legacy calls: dbPatch(table, body, query) → adapter flips to db.patch(table, query, body)
  dbPatch: async (table, body, query) => {
    // Handle both calling conventions:
    // New: dbPatch(table, query, body)  [if body is string it's actually query]
    // Old: dbPatch(table, body, query)  [legacy.js convention]
    if (typeof body === 'string') {
      // New convention: body is actually the query string, query is the data
      return db.patch(table, body, query);
    }
    return db.patch(table, query, body);
  },
  dbDel: db.delete,
  dbDelete: db.delete,  // legacy.js alias
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

  chatLoadMessages: chatSvc.loadMessages,
  chatSendMessage: chatSvc.sendMessage,
  chatSubscribeRealtime: chatSvc.subscribeRealtime,

  exportToExcel,
  exportToPDF,
});

// ── Bootstrap
loadUserFromStorage();
applyTheme();
applyLang();

// Production-safe diagnostics: log only metadata, never the Error object
// (which can carry request/response bodies depending on the library).
window.addEventListener('error', e => {
  console.warn('[app] error:', e.message, `@ ${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  console.warn('[app] unhandled rejection:', msg);
});

window.__APP_READY__ = true;
window.dispatchEvent(new Event('app:ready'));

// Ensure chat modal never blocks startup
document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat-modal');
  if (chat) chat.style.display = 'none';
});

// Hide splash screen
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
  }, 2000);
});

window.addEventListener('app:ready', () => {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hide');
});

export { state };
