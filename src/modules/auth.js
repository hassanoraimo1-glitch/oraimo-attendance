// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// Safe upgraded version
// ═══════════════════════════════════════════════════════════

// ── SAFE HELPERS ──
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
  try {
    localStorage.setItem('oraimo_user', JSON.stringify(u));
  } catch (_) {
    try {
      sessionStorage.setItem('oraimo_user', JSON.stringify(u));
    } catch (_) {}
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

  if (r === 'super_admin') return 'superadmin';
  if (r === 'superadmin') return 'superadmin';

  // ✅ manager = admin
  if (r === 'manager') return 'admin';

  if (r === 'viewer') return 'admin';
  if (r === 'admin') return 'admin';
  if (r === 'team_leader') return 'team_leader';
  if (r === 'teamleader') return 'team_leader';
  if (r === 'employee') return 'employee';

  return r || 'employee';
}


function _sanitizeUser(userObj) {
  if (!userObj || typeof userObj !== 'object') return null;

  const clean = { ...userObj };
  delete clean.password;
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

function _resetAdminUI() {
  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  const visNavReset = _id('adm-visits-nav');
  if (visNavReset) visNavReset.style.display = 'none';

  const settingsNav = _id('settings-nav-item');
  if (settingsNav) settingsNav.style.display = '';

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
    _setDisplay('admin-dashboard', 'block');
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

// ── APP ROUTING ──
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

  const isAdminLike = ['superadmin', 'admin', 'team_leader'].includes(user.role);

  if (isAdminLike) {
    _setText('admin-name-top', user.name || _roleLabel(user.role));

    const chip = _id('admin-role-chip');
    if (chip) {
      chip.textContent = _roleLabel(user.role);
      chip.className = 'role-chip badge role-' + (user.role || 'admin');
    }

    _safeCall('showPage', 'admin-app');

    if (user.role === 'superadmin') {
      _setDisplay('admins-section', 'block');
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      _openAdminDefaultTab();

      _safeCall('loadAdminDashboard');
      _safeCall('loadAllEmployees');
      _safeCall('loadBranches');
      _safeCall('clearOldVisitPhotos');
      _safeCall('loadAdminsList');

      const admVisitsNav = _id('adm-visits-nav');
      if (admVisitsNav) admVisitsNav.style.display = 'none';
    }

    if (user.role === 'team_leader') {
      setTimeout(() => {
        const admVisNav = _id('adm-visits-nav');
        if (admVisNav) admVisNav.style.display = 'flex';

        const settingsNavEl = _id('settings-nav-item');
        if (settingsNavEl) settingsNavEl.style.display = 'flex';

        const branchesNavEl = _id('adm-branches-nav');
        if (branchesNavEl) branchesNavEl.style.display = 'none';

        _forEach('#admin-app .bottom-nav .nav-item', n => {
          const oc = n.getAttribute('onclick') || '';
          if (oc.includes('reports')) n.style.display = 'none';
        });

        ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
          const el = _id(id);
          if (el) el.style.display = 'none';
        });

        _forEach('#admin-app .nav-item', n => n.classList.remove('active'));
        if (admVisNav) admVisNav.classList.add('active');

        ['dashboard', 'employees', 'branches', 'reports', 'settings', 'chat'].forEach(t => {
          const d = _id('admin-' + t);
          if (d) d.style.display = 'none';
        });

        const vd = _id('admin-visits');
        if (vd) vd.style.display = 'block';

        _safeCall('loadTLVisitsTab');
        _safeCall('loadAllEmployees');
        _safeCall('loadBranches');
      }, 120);
    }

    setTimeout(() => _safeCall('fixNavDirection'), 100);
    _hideSplash();
    return;
  }

  // employee
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

  // hide visits nav in normal employee app if exists in future
  const visNav = document.querySelector('#emp-app .nav-item[onclick*="visits"]');
  if (visNav) visNav.style.display = 'none';

  if (typeof window.registerOneSignalUser === 'function') {
    try { window.registerOneSignalUser(); } catch (_) {}
  }

  setTimeout(() => _safeCall('fixNavDirection'), 100);
  _hideSplash();
}

// ── AUTH ──
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
  // stop active camera
  if (window.videoStream) {
    try {
      window.videoStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    window.videoStream = null;
  }

  // stop chat subscription / interval
  if (window.chatSubscription) {
    try {
      if (typeof window.chatSubscription === 'function') window.chatSubscription();
      else clearInterval(window.chatSubscription);
    } catch (_) {}
    window.chatSubscription = null;
  }

  // close modals if helper exists
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

// ── CLOCK ──
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

// ── RESTORE SESSION ──
function restoreSavedSession() {
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

// ── AUTO INIT ──
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

// ── EXPOSE GLOBALS ──
window.showApp = showApp;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.startClock = startClock;
window.restoreSavedSession = restoreSavedSession;
