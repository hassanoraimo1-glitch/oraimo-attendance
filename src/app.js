// ────────────────────────────────────────────────────────────
// APP ENTRY POINT  (FIXED ROLES + ROUTING + VISITS ACCESS)
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

// ── STATE BINDING
Object.defineProperties(window, {
  currentUser: { get: () => state.currentUser, set: v => { state.currentUser = v; }, configurable: true },
  currentLang: { get: () => state.currentLang, set: v => { state.currentLang = v; }, configurable: true },
  allEmployees: { get: () => state.allEmployees, set: v => { state.allEmployees = v; }, configurable: true },
  branches: { get: () => state.branches, set: v => { state.branches = v; }, configurable: true },
});

// ── HELPERS
const ROLE_MAP = {
  superadmin:  'super_admin',
  super_admin: 'super_admin',
  admin:       'admin',
  manager:     'admin',
  viewer:      'admin',
  teamleader:  'team_leader',
  team_leader: 'team_leader',
  employee:    'employee',
};

function normalizeRole(role = '') {
  return ROLE_MAP[String(role).trim().toLowerCase()] || String(role || '').trim().toLowerCase();
}

function getUser() {
  const user = state.currentUser || window.currentUser || null;
  if (user && user.role) user.role = normalizeRole(user.role);
  return user;
}

function isEmployee(role) {
  return normalizeRole(role) === 'employee';
}

function isTeamLeader(role) {
  return normalizeRole(role) === 'team_leader';
}

function isAdmin(role) {
  return normalizeRole(role) === 'admin';
}

function isSuperAdmin(role) {
  return normalizeRole(role) === 'super_admin';
}

function isAdminLike(role) {
  role = normalizeRole(role);
  return role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'viewer';
}

function canSeeVisits(role) {
  role = normalizeRole(role);
  return role === 'team_leader' || role === 'admin' || role === 'super_admin';
}

function canSeeBranches(role) {
  return isAdminLike(role);
}

function canSeeSettings(role) {
  return isAdminLike(role);
}

function canManageAdmins(role) {
  return isSuperAdmin(role);
}

function setVisible(elOrId, show, displayMode = '') {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  if (!show) {
    el.style.display = 'none';
    return;
  }
  if (displayMode) {
    el.style.display = displayMode;
    return;
  }
  if (el.classList.contains('nav-item')) {
    el.style.display = 'flex';
  } else if (el.classList.contains('page')) {
    el.style.display = el.id === 'login-page' ? 'flex' : 'block';
  } else {
    el.style.display = '';
  }
}

function setActivePage(pageId) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}

function hideSplash() {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hide');
}

function syncCurrentUserRole() {
  const user = getUser();
  if (!user) return null;
  user.role = normalizeRole(user.role);
  state.currentUser = user;
  window.currentUser = user;
  return user;
}

// ── ACCESS CONTROL
function controlVisitsAccess() {
  const user = syncCurrentUserRole();
  const role = normalizeRole(user?.role);

  const visitsNav = document.getElementById('adm-visits-nav');
  const visitsPage = document.getElementById('admin-visits');

  const allow = canSeeVisits(role);
  setVisible(visitsNav, allow, 'flex');
  if (!allow && visitsPage) visitsPage.style.display = 'none';
}

function controlSettingsAccess() {
  const user = syncCurrentUserRole();
  const role = normalizeRole(user?.role);

  setVisible('settings-nav-item', canSeeSettings(role), 'flex');
  setVisible('admins-section', canManageAdmins(role));
  setVisible('acc-team-item', isAdminLike(role));
  setVisible('add-emp-btn', isAdminLike(role), 'inline-flex');
}

function controlBranchesAccess() {
  const user = syncCurrentUserRole();
  const role = normalizeRole(user?.role);

  setVisible('adm-branches-nav', canSeeBranches(role), 'flex');

  const branchesPage = document.getElementById('admin-branches');
  if (!canSeeBranches(role) && branchesPage) branchesPage.style.display = 'none';
}

function controlReportsAccess() {
  const user = syncCurrentUserRole();
  const role = normalizeRole(user?.role);

  const reportsNav = [...$$('.bottom-nav .nav-item')].find(el => {
    const txt = (el.textContent || '').trim();
    return txt.includes('التقارير') || txt.includes('Reports');
  });

  if (reportsNav) setVisible(reportsNav, isAdminLike(role), 'flex');

  const reportsPage = document.getElementById('admin-reports');
  if (!isAdminLike(role) && reportsPage) reportsPage.style.display = 'none';
}

function controlAdminAttendanceAccess() {
  const user = syncCurrentUserRole();
  const role = normalizeRole(user?.role);

  const attendanceNav = [...$$('.bottom-nav .nav-item')].find(el => {
    const txt = (el.textContent || '').trim();
    return txt.includes('الحضور') || txt.includes('Attendance');
  });

  const allow = isAdminLike(role) || isTeamLeader(role);
  if (attendanceNav) setVisible(attendanceNav, allow, 'flex');

  const attendancePage = document.getElementById('admin-attendance');
  if (!allow && attendancePage) attendancePage.style.display = 'none';
}

function controlAppShell() {
  const user = syncCurrentUserRole();

  const loginPage = document.getElementById('login-page');
  const empApp = document.getElementById('emp-app');
  const adminApp = document.getElementById('admin-app');

  if (!user) {
    setVisible(loginPage, true);
    setVisible(empApp, false);
    setVisible(adminApp, false);
    setActivePage('login-page');
    return;
  }

  const role = normalizeRole(user.role);

  if (isEmployee(role)) {
    setVisible(loginPage, false);
    setVisible(empApp, true);
    setVisible(adminApp, false);
    setActivePage('emp-app');
    return;
  }

  setVisible(loginPage, false);
  setVisible(empApp, false);
  setVisible(adminApp, true);
  setActivePage('admin-app');
}

function routeByRole() {
  const user = syncCurrentUserRole();
  if (!user) return;

  const role = normalizeRole(user.role);

  if (isEmployee(role)) {
    if (typeof window.empTab === 'function') {
      const homeNav = document.querySelector(".bottom-nav .nav-item[onclick*=\"empTab('home'\"]");
      try { window.empTab('home', homeNav || null); } catch (_) {}
    }
    return;
  }

  if (isTeamLeader(role)) {
    if (typeof window.adminTab === 'function') {
      const visitsNav = document.getElementById('adm-visits-nav');
      try { window.adminTab('visits', visitsNav || null); } catch (_) {}
    }
    return;
  }

  if (typeof window.adminTab === 'function') {
    const dashNav = document.querySelector(".bottom-nav .nav-item[onclick*=\"adminTab('dashboard'\"]");
    try { window.adminTab('dashboard', dashNav || null); } catch (_) {}
  }
}

function refreshAppAccess() {
  controlAppShell();
  controlVisitsAccess();
  controlSettingsAccess();
  controlBranchesAccess();
  controlReportsAccess();
  controlAdminAttendanceAccess();
  fixNavDirection();
}

// ── GLOBAL FUNCTIONS
Object.assign(window, {
  // 🔥 FIX: dbGet بدون كاش نهائي + retry بسيط
  dbGet: async (table, query = '') => {
    try {
      const noCacheQuery = query.includes('?')
        ? `${query}&_=${Date.now()}`
        : `?_${Date.now()}`;

      const res = await db.get(table, noCacheQuery);
      return res || [];
    } catch (e) {
      console.warn('[dbGet no-cache] first try failed:', e);

      // 🔁 retry مرة كمان (مهم بعد insert مباشرة)
      try {
        await new Promise(r => setTimeout(r, 200));
        const retryQuery = query.includes('?')
          ? `${query}&_=${Date.now()}`
          : `?_${Date.now()}`;

        const res2 = await db.get(table, retryQuery);
        return res2 || [];
      } catch (e2) {
        console.error('[dbGet retry failed]:', e2);
        return [];
      }
    }
  },

  // ✅ POST عادي
  dbPost: async (table, body) => {
    try {
      const res = await db.post(table, body);
      return res;
    } catch (e) {
      console.error('[dbPost error]:', e);
      throw e;
    }
  },

  // 🔥 FIX: patch يحل مشكلة ترتيب الباراميتر نهائي
  dbPatch: async (table, body, query) => {
    try {
      // الشكل الصح
      return await db.patch(table, query, body);
    } catch (e1) {
      try {
        // fallback لو السيستم القديم شغال بالعكس
        return await db.patch(table, body, query);
      } catch (e2) {
        console.error('[dbPatch failed both ways]:', e2);
        throw e2;
      }
    }
  },

  // ✅ DELETE
  dbDel: async (table, query) => {
    try {
      return await db.delete(table, query);
    } catch (e) {
      console.error('[dbDelete error]:', e);
      throw e;
    }
  },

  dbDelete: async (table, query) => {
    try {
      return await db.delete(table, query);
    } catch (e) {
      console.error('[dbDelete error]:', e);
      throw e;
    }
  },

  safeFilterValue,
  invalidateCache,
  clearAllCache,
});

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

  normalizeRole,
  refreshAppAccess,
  controlVisitsAccess,
});

// ── BOOTSTRAP
loadUserFromStorage();
syncCurrentUserRole();
applyTheme();
applyLang();
fixNavDirection();

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

  // Delay refreshAppAccess to allow session restoration to complete
  // auth.js will handle the initial restore; we check after a brief delay
  setTimeout(() => {
    refreshAppAccess();
    setTimeout(() => {
      refreshAppAccess();
      routeByRole();
    }, 150);
  }, 300);
});

// ── SPLASH
window.addEventListener('load', () => {
  // Ensure splash stays until session is ready
  setTimeout(() => {
    refreshAppAccess();
    hideSplash();
  }, 1000);
});

window.addEventListener('app:ready', () => {
  hideSplash();
  refreshAppAccess();
  setTimeout(routeByRole, 200);
});

// ── OPTIONAL REFRESH TRIGGERS
window.addEventListener('storage', () => {
  syncCurrentUserRole();
  refreshAppAccess();
});

window.addEventListener('focus', () => {
  window._isSubmitting = false;
  syncCurrentUserRole();
  refreshAppAccess();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Reset any stuck submit guard so login is always usable on resume
    window._isSubmitting = false;
    window.__SESSION_RESTORED__ = false;

    // Try to restore if we have localStorage user but no currentUser
    let saved = null;
    try { saved = localStorage.getItem('oraimo_user') || sessionStorage.getItem('oraimo_user'); } catch (_) {}
    if (saved && !getUser() && typeof window.restoreSavedSession === 'function') {
      window.restoreSavedSession();
    } else {
      syncCurrentUserRole();
      refreshAppAccess();
    }
  }
});

window.addEventListener('auth:changed', () => {
  syncCurrentUserRole();
  refreshAppAccess();
  setTimeout(routeByRole, 150);
});

export { state };
