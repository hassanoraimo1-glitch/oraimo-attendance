// ═══════════════════════════════════════════════════════════
// src/modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// NOTE:
//   - This file is only for src/modules/auth.js
//   - Do NOT replace src/services/auth.js with this file
// Safe full version
// ═══════════════════════════════════════════════════════════

// ── SAFE HELPERS ──────────────────────────────────────────
function _id(id) {
  return document.getElementById(id);
}

function _setText(id, value) {
  const el = _id(id);
  if (el) el.textContent = value == null ? '' : String(value);
  return el;
}

function _setHTML(id, value) {
  const el = _id(id);
  if (el) el.innerHTML = value == null ? '' : String(value);
  return el;
}

function _setDisplay(id, value) {
  const el = _id(id);
  if (el) el.style.display = value;
  return el;
}

function _forEach(selector, cb) {
  document.querySelectorAll(selector).forEach(cb);
}

function _safeCall(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn === 'function') return fn(...args);
  return undefined;
}

function _hideSplash() {
  const splash = _id('splash');
  if (!splash) return;

  splash.style.opacity = '0';
  splash.style.pointerEvents = 'none';

  setTimeout(() => {
    splash.style.display = 'none';
  }, 300);
}

function _clearSavedUser() {
  try { localStorage.removeItem('oraimo_user'); } catch (_) {}
  try { sessionStorage.removeItem('oraimo_user'); } catch (_) {}
}

function _saveUser(u) {
  // Save a stripped version without large fields (profile_photo etc.)
  const stripped = _sanitizeForStorage(u);
  const json = JSON.stringify(stripped);
  try {
    localStorage.setItem('oraimo_user', json);
  } catch (e) {
    console.warn('[auth] localStorage save failed:', e.message);
    try {
      sessionStorage.setItem('oraimo_user', json);
    } catch (e2) {
      console.warn('[auth] sessionStorage save also failed:', e2.message);
    }
  }
}

function _getSavedUser() {
  try {
    const raw = localStorage.getItem('oraimo_user') || sessionStorage.getItem('oraimo_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function _normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();

  if (!r) return 'employee';

  if (r === 'super_admin') return 'superadmin';
  if (r === 'superadmin') return 'superadmin';

  // مهم: عندك manager يُعامل كـ admin
  if (r === 'manager') return 'admin';

  if (r === 'viewer') return 'admin';
  if (r === 'admin') return 'admin';

  if (r === 'teamleader') return 'team_leader';
  if (r === 'team_leader') return 'team_leader';

  if (r === 'employee') return 'employee';

  return r;
}

function _sanitizeUser(userObj) {
  if (!userObj || typeof userObj !== 'object') return null;

  const clean = { ...userObj };
  delete clean.password;
  clean.role = _normalizeRole(clean.role);

  return clean;
}

// Stripped version for localStorage (no large fields like profile_photo)
function _sanitizeForStorage(userObj) {
  if (!userObj || typeof userObj !== 'object') return null;
  const clean = { ...userObj };
  delete clean.password;
  delete clean.profile_photo;  // Can be several MB as base64 — loaded separately
  delete clean.selfie_in;
  delete clean.selfie_out;
  clean.role = _normalizeRole(clean.role);
  return clean;
}

function _roleLabel(role) {
  const r = _normalizeRole(role);
  const ar = (window.currentLang || 'ar') === 'ar';

  if (r === 'superadmin') return ar ? 'سوبر أدمن' : 'Super Admin';
  if (r === 'admin') return ar ? 'أدمن' : 'Admin';
  if (r === 'team_leader') return ar ? 'تيم ليدر' : 'Team Leader';
  if (r === 'employee') return ar ? 'موظف' : 'Employee';

  return r;
}

function _isAdminRole(role) {
  const r = _normalizeRole(role);
  return r === 'admin' || r === 'superadmin';
}

function _isTeamLeaderRole(role) {
  return _normalizeRole(role) === 'team_leader';
}

function _showOnlyAdminSection(sectionName) {
  ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'].forEach(t => {
    const d = _id('admin-' + t);
    if (d) d.style.display = t === sectionName ? 'block' : 'none';
  });
}

function _activateAdminNavById(navId) {
  _forEach('#admin-app .bottom-nav .nav-item', n => n.classList.remove('active'));
  const nav = _id(navId);
  if (nav) nav.classList.add('active');
}

function _resetAdminUI() {
  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  const visNavReset = _id('adm-visits-nav');
  if (visNavReset) visNavReset.style.display = 'none';

  const settingsNav = _id('settings-nav-item');
  if (settingsNav) settingsNav.style.display = 'none';

  const branchesNav = _id('adm-branches-nav');
  if (branchesNav) branchesNav.style.display = '';

  _forEach('#report-tabs .tab', t => {
    t.style.display = '';
    t.classList.remove('active');
  });

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const e = _id(id);
    if (e) e.style.display = '';
  });

  _setDisplay('admins-section', 'none');

  ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'].forEach(t => {
    const d = _id('admin-' + t);
    if (d) d.style.display = 'none';
  });

  const firstNav = document.querySelector('#admin-app .bottom-nav .nav-item');
  if (firstNav) firstNav.classList.add('active');
}

function _resetEmployeeUI() {
  _forEach('#emp-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  ['home', 'sales', 'display', 'visits', 'specs', 'chat', 'profile'].forEach(t => {
    const d = _id('emp-' + t);
    if (d) d.style.display = 'none';
  });

  const firstNav = document.querySelector('#emp-app .bottom-nav .nav-item');
  if (firstNav) firstNav.classList.add('active');
}

function _openAdminDefaultTab() {
  const dashNav = document.querySelector('#admin-app .bottom-nav .nav-item');
  if (typeof window.adminTab === 'function' && dashNav) {
    window.adminTab('dashboard', dashNav);
  } else {
    _showOnlyAdminSection('dashboard');
  }
}

function _openEmployeeDefaultTab() {
  const homeNav = document.querySelector('#emp-app .nav-item');
  if (typeof window.empTab === 'function') {
    window.empTab('home', homeNav || null);
  } else {
    _setDisplay('emp-home', 'block');
  }
}

function _configureAdminLikeBase(user) {
  _setText('admin-name-top', user.name || _roleLabel(user.role));

  const chip = _id('admin-role-chip');
  if (chip) {
    chip.textContent = _roleLabel(user.role);
    chip.className = 'role-chip badge role-' + (user.role || 'admin');
  }

  _safeCall('showPage', 'admin-app');
}

function _configureAdminUI(user) {
  const visitsNav = _id('adm-visits-nav');
  const settingsNav = _id('settings-nav-item');
  const branchesNav = _id('adm-branches-nav');

  if (visitsNav) visitsNav.style.display = 'flex';
  if (settingsNav) settingsNav.style.display = 'flex';
  if (branchesNav) branchesNav.style.display = 'flex';

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const el = _id(id);
    if (el) el.style.display = '';
  });

  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
  });

  _forEach('#report-tabs .tab', t => {
    t.style.display = '';
  });

  if (_normalizeRole(user.role) === 'superadmin') {
    _setDisplay('admins-section', 'block');
  } else {
    _setDisplay('admins-section', 'none');
  }

  _openAdminDefaultTab();

  _safeCall('loadAdminDashboard');
  _safeCall('loadAllEmployees');
  _safeCall('loadBranches');
  _safeCall('clearOldVisitPhotos');

  if (_normalizeRole(user.role) === 'superadmin' || _normalizeRole(user.role) === 'admin') {
    _safeCall('loadAdminsList');
  }
}

function _configureTeamLeaderUI() {
  const visitsNav = _id('adm-visits-nav');
  const settingsNav = _id('settings-nav-item');
  const branchesNav = _id('adm-branches-nav');

  if (visitsNav) visitsNav.style.display = 'flex';
  if (settingsNav) settingsNav.style.display = 'none';
  if (branchesNav) branchesNav.style.display = 'none';

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const el = _id(id);
    if (el) el.style.display = 'none';
  });

  _forEach('#admin-app .bottom-nav .nav-item', n => {
    const oc = n.getAttribute('onclick') || '';

    // إخفاء التقارير عن التيم ليدر
    if (oc.includes('reports')) {
      n.style.display = 'none';
    }
  });

  _setDisplay('admins-section', 'none');

  setTimeout(() => {
    _activateAdminNavById('adm-visits-nav');
    _showOnlyAdminSection('visits');

    _safeCall('loadBranches');
    _safeCall('loadAllEmployees');
    _safeCall('loadTLVisitsTab');
  }, 120);
}

function _finalizeLogin(userObj) {
  const cleanUser = _sanitizeUser(userObj);
  if (!cleanUser) throw new Error('Invalid user object');

  window.currentUser = cleanUser;
  _saveUser(cleanUser);

  try {
    showApp();
    return true;
  } catch (uiErr) {
    console.error('[showApp after login]', uiErr);
    _clearSavedUser();
    window.currentUser = null;
    _safeCall('showPage', 'login-page');
    throw uiErr;
  }
}

// ── APP ROUTING ───────────────────────────────────────────
function showApp() {
  const user = _sanitizeUser(window.currentUser);
  const lang = window.currentLang || 'ar';

  if (!user) {
    _safeCall('showPage', 'login-page');
    _hideSplash();
    return;
  }

  window.currentUser = user;

  try {
    _safeCall('applyLang');
  } catch (e) {
    console.warn('[applyLang]', e);
  }

  _resetAdminUI();
  _resetEmployeeUI();

  const role = _normalizeRole(user.role);
  const isAdminLike = ['superadmin', 'admin', 'team_leader'].includes(role);

  if (isAdminLike) {
    _configureAdminLikeBase(user);

    if (_isAdminRole(role)) {
      _configureAdminUI(user);

      setTimeout(() => _safeCall('fixNavDirection'), 100);
      setTimeout(() => _safeCall('initDisplayModule'), 150);
      _hideSplash();
      return;
    }

    if (_isTeamLeaderRole(role)) {
      _configureTeamLeaderUI();

      setTimeout(() => _safeCall('fixNavDirection'), 100);
      setTimeout(() => _safeCall('initDisplayModule'), 150);
      _hideSplash();
      return;
    }
  }

  // ── EMPLOYEE ──
  _safeCall('showPage', 'emp-app');
  _openEmployeeDefaultTab();

  _setText('emp-name-top', user.name || '');
  _setText('profile-name', user.name || '');
  _setText('profile-branch', user.branch || user.branch_name || '');

  const dayOffIndex = Number(user.day_off);
  const dayLabel = lang === 'ar'
    ? ((window.DAYS_AR && window.DAYS_AR[dayOffIndex]) || '-')
    : ((window.DAYS_EN && window.DAYS_EN[dayOffIndex]) || '-');

  _setHTML(
    'profile-dayoff',
    `<span class="badge badge-blue">${lang === 'ar' ? 'الإجازة:' : 'Day Off:'} ${dayLabel || '-'}</span>`
  );

  _safeCall('loadEmpData');
  _safeCall('renderProducts');
  _safeCall('loadModelTargetAlert');
  _safeCall('loadEmpDailyLog');
  _safeCall('loadEmpMonthlyReport');
  _safeCall('loadDisplayHistory');
  _safeCall('loadVisitHistory');
  _safeCall('loadProfilePhoto');

  const visNav = document.querySelector('#emp-app .nav-item[onclick*="visits"]');
  if (visNav) visNav.style.display = 'none';

  if (typeof window.registerOneSignalUser === 'function') {
    try { window.registerOneSignalUser(); } catch (_) {}
  }

  setTimeout(() => _safeCall('fixNavDirection'), 100);

  // Re-apply display permissions after user is fully loaded (fixes camera button)
  setTimeout(() => _safeCall('initDisplayModule'), 150);

  _hideSplash();
}

// ── AUTH ──────────────────────────────────────────────────
async function doLogin() {
  if (window._isSubmitting) return;

  const userInput = _id('login-user');
  const passInput = _id('login-pass');
  const errEl = _id('login-err');
  const btn = document.querySelector('#login-page .btn-green');
  const ar = (window.currentLang || 'ar') === 'ar';

  const username = ((userInput && userInput.value) || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const pass = ((passInput && passInput.value) || '').trim();

  if (!username || !pass) {
    if (errEl) errEl.textContent = ar ? 'أدخل بيانات الدخول' : 'Enter your credentials';
    return;
  }

  window._isSubmitting = true;

  if (btn) {
    btn.disabled = true;
    btn.textContent = ar ? 'جاري الدخول...' : 'Signing in...';
  }

  if (errEl) errEl.textContent = '';

  try {
    // Hardcoded superadmin
    if (username === 'admin' && pass === 'Oraimo@Admin2026') {
      _finalizeLogin({
        id: 'superadmin-local',
        role: 'superadmin',
        name: 'Super Admin',
        username: 'admin'
      });
      return;
    }

    const uname = encodeURIComponent(username);

    // Admins
    let admRes = [];
    try {
      admRes = await dbGet('admins', `?username=eq.${uname}&select=*`);
    } catch (e) {
      console.warn('[admins login query]', e);
      admRes = [];
    }

    const admMatch = (admRes || []).find(r => String(r.password || '') === pass);
    if (admMatch) {
      const adminUser = _sanitizeUser({
        ...admMatch,
        role: admMatch.role || 'admin'
      });

      _finalizeLogin(adminUser);
      return;
    }

    // Employees
    let empRes = [];
    try {
      empRes = await dbGet('employees', `?username=eq.${uname}&select=*`);
    } catch (e) {
      console.warn('[employees login query]', e);
      empRes = [];
    }

    const empMatch = (empRes || []).find(r => String(r.password || '') === pass);

    if (!empMatch) {
      if (errEl) errEl.textContent = ar ? 'بيانات دخول غير صحيحة' : 'Invalid credentials';
      return;
    }

    const empUser = _sanitizeUser({
      ...empMatch,
      role: empMatch.role || 'employee'
    });

    _finalizeLogin(empUser);
  } catch (e) {
    console.error('[login]', e);

    const uiError =
      e &&
      (
        e.name === 'TypeError' ||
        /Cannot read|undefined|null|classList|style|textContent|innerHTML/.test(String(e.message || ''))
      );

    if (errEl) {
      errEl.textContent = uiError
        ? (ar ? 'تم التحقق من البيانات لكن حدث خطأ في الواجهة' : 'Credentials verified, but UI failed to load')
        : (ar ? 'خطأ في الاتصال، حاول مرة أخرى' : 'Connection error, try again');
    }
  } finally {
    window._isSubmitting = false;

    if (btn) {
      btn.disabled = false;
      btn.textContent = ar ? 'تسجيل الدخول' : 'Sign In';
    }
  }
}

function doLogout() {
  if (window.videoStream) {
    try {
      window.videoStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    window.videoStream = null;
  }

  if (window.chatSubscription) {
    try {
      if (typeof window.chatSubscription === 'function') {
        window.chatSubscription();
      } else {
        clearInterval(window.chatSubscription);
      }
    } catch (_) {}
    window.chatSubscription = null;
  }

  try {
    document.querySelectorAll('.modal-overlay.open, #camera-modal.open, #selfie-fullscreen.open').forEach(el => {
      el.classList.remove('open');
    });
  } catch (_) {}

  window.currentChat = null;
  window.currentUser = null;
  window._isSubmitting = false;

  window.allAdmins = [];
  window.allBranches = [];
  window.allEmployees = [];
  window.managerTeamData = {};

  _clearSavedUser();
  _resetAdminUI();
  _resetEmployeeUI();

  const visNav = _id('adm-visits-nav');
  if (visNav) visNav.style.display = 'none';

  const lu = _id('login-user');
  if (lu) lu.value = '';

  const lp = _id('login-pass');
  if (lp) lp.value = '';

  const le = _id('login-err');
  if (le) le.textContent = '';

  const loginBtn = document.querySelector('#login-page .btn-green');
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.textContent = (window.currentLang || 'ar') === 'ar' ? 'تسجيل الدخول' : 'Sign In';
  }

  _safeCall('showPage', 'login-page');
  _hideSplash();
}

// ── CLOCK ─────────────────────────────────────────────────
function startClock() {
  if (window._authClockStarted) return;
  window._authClockStarted = true;

  function tick() {
    const now = new Date();
    const locale = (window.currentLang || 'ar') === 'ar' ? 'ar-EG' : 'en-US';

    const el = _id('live-clock');
    const del = _id('live-date');
    const splashClock = _id('splash-clock');

    const timeText = now.toLocaleTimeString(locale, { hour12: false });
    const dateText = now.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (el) el.textContent = timeText;
    if (del) del.textContent = dateText;
    if (splashClock) splashClock.textContent = timeText.substring(0, 5);
  }

  tick();
  window._authClockTimer = setInterval(tick, 1000);
}

// ── RESTORE SESSION ───────────────────────────────────────
async function restoreSavedSession() {
  try {
    if (window.currentUser) {
      showApp();
      return true;
    }

    const saved = _getSavedUser();
    if (!saved) {
      _safeCall('showPage', 'login-page');
      _hideSplash();
      return false;
    }

    const clean = _sanitizeUser(saved);
    if (!clean) {
      _clearSavedUser();
      _safeCall('showPage', 'login-page');
      _hideSplash();
      return false;
    }

    window.currentUser = clean;

    // Fetch fresh employee data from DB to ensure complete fields
    // (old employees may have stale/incomplete data in localStorage)
    if (typeof dbGet === 'function' && clean.id && clean.role === 'employee') {
      try {
        const freshEmp = await dbGet('employees', `?id=eq.${clean.id}&select=*`);
        if (freshEmp && freshEmp.length > 0) {
          const fresh = _sanitizeUser({ ...freshEmp[0], role: freshEmp[0].role || 'employee' });
          if (fresh) {
            window.currentUser = fresh;
            _saveUser(fresh);
            console.log('[auth] Refreshed employee data from DB for', fresh.id);
          }
        }
      } catch (e) {
        console.warn('[auth] Could not refresh employee data:', e.message);
      }
    }

    showApp();
    return true;
  } catch (e) {
    console.error('[restoreSavedSession]', e);
    _clearSavedUser();
    window.currentUser = null;
    _safeCall('showPage', 'login-page');
    _hideSplash();
    return false;
  }
}

// ── AUTO INIT ─────────────────────────────────────────────
(function initAuthModule() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startClock();
      setTimeout(() => {
        restoreSavedSession();
      }, 0);
    });
  } else {
    startClock();
    setTimeout(() => {
      restoreSavedSession();
    }, 0);
  }
})();

// ── EXPOSE GLOBALS ────────────────────────────────────────
window.showApp = showApp;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.startClock = startClock;
window.restoreSavedSession = restoreSavedSession;
