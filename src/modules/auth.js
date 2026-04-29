// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// Depends on: fallbacks.js (dbGet/dbPost, notify, applyLang)
// STAGE 1 SAFE PATCH:
//   • Prevent login UI crashes when some DOM nodes are missing
//   • Prevent "Connection error" masking UI/render errors
//   • Keep behavior as-is with minimal safe guards
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

function _roleLabel(role) {
  if (role === 'superadmin') return 'Super Admin';
  if (role === 'manager') return 'Team Leader';
  if (role === 'team_leader') return 'Team Leader';
  if (!role) return 'Admin';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function _resetAdminUI() {
  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  const visNavReset = _id('adm-visits-nav');
  if (visNavReset) visNavReset.style.display = 'none';

  _forEach('#report-tabs .tab', t => {
    t.style.display = '';
  });

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const e = _id(id);
    if (e) e.style.display = '';
  });

  _setDisplay('admins-section', 'none');

  const firstNav = document.querySelector('#admin-app .bottom-nav .nav-item');
  if (firstNav) firstNav.classList.add('active');
}

function _finalizeLogin(userObj) {
  window.currentUser = userObj;
  _saveUser(window.currentUser);

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
  const user = window.currentUser;
  const lang = window.currentLang || 'ar';

  if (!user) {
    return _safeCall('showPage', 'login-page');
  }

  _safeCall('applyLang');

  // ALWAYS reset admin UI first to prevent bleed from previous session
  _resetAdminUI();

  const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(user.role);

  if (isAdmin) {
    _setText('admin-name-top', user.name || 'Admin');

    const chip = _id('admin-role-chip');
    if (chip) {
      chip.textContent = _roleLabel(user.role);
      chip.className = 'role-chip badge role-' + (user.role || 'admin');
    }

    if (user.role === 'viewer') _setDisplay('settings-nav-item', 'none');
    if (user.role === 'superadmin') _setDisplay('admins-section', 'block');
    if (user.role === 'viewer') _setDisplay('add-emp-btn', 'none');

    _safeCall('showPage', 'admin-app');

    // Ensure dashboard visible
    const dashNav = document.querySelector('#admin-app .bottom-nav .nav-item');
    if (typeof window.adminTab === 'function' && dashNav) {
      window.adminTab('dashboard', dashNav);
    } else {
      _setDisplay('admin-dashboard', 'block');
    }

    _safeCall('loadAdminDashboard');
    _safeCall('loadAllEmployees');
    _safeCall('loadBranches');
    _safeCall('clearOldVisitPhotos');

    if (user.role === 'superadmin' || user.role === 'admin') {
      _safeCall('loadAdminsList');
    }

    // Admin / Superadmin / Viewer
    if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'viewer') {
      _forEach('#admin-app .bottom-nav .nav-item', n => {
        n.style.display = '';
      });
      _setDisplay('adm-visits-nav', 'none');
    }

    // Manager currently has no visits nav here (kept as-is for now)
    if (user.role === 'manager') {
      // Stage 2 will unify manager/team_leader visits logic safely
    }

    setTimeout(() => _safeCall('fixNavDirection'), 100);

    // Team leader special UI
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

        const visNavEl = _id('adm-visits-nav');
        if (visNavEl) {
          _forEach('#admin-app .nav-item', n => n.classList.remove('active'));
          visNavEl.classList.add('active');

          ['dashboard', 'employees', 'branches', 'reports', 'settings'].forEach(t => {
            const d = _id('admin-' + t);
            if (d) d.style.display = 'none';
          });

          const vd = _id('admin-visits');
          if (vd) vd.style.display = 'block';

          _safeCall('loadTLVisitsTab');
        }
      }, 200);
    }
  } else {
    _safeCall('showPage', 'emp-app');

    // Ensure home tab visible
    if (typeof window.empTab === 'function') {
      const homeNav = document.querySelector('#emp-app .nav-item');
      window.empTab('home', homeNav);
    } else {
      _setDisplay('emp-home', 'block');
    }

    _setText('emp-name-top', user.name || '');
    _setText('profile-name', user.name || '');
    _setText('profile-branch', user.branch || '');

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

    // Hide visits tab in employee app
    const visNav = document.querySelector('#emp-app .nav-item[onclick*="visits"]');
    if (visNav) visNav.style.display = 'none';
  }

  // Register OneSignal for all users if available
  if (typeof window.registerOneSignalUser === 'function') {
    try { window.registerOneSignalUser(); } catch (_) {}
  }

  setTimeout(() => _safeCall('fixNavDirection'), 100);
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
      _finalizeLogin({ role: 'superadmin', name: 'Super Admin' });
      return;
    }

    const uname = encodeURIComponent(username);

    // Admins
    let admRes;
    try {
      admRes = await dbGet('admins', `?username=eq.${uname}&select=*`);
    } catch (_) {
      admRes = [];
    }

    const admMatch = (admRes || []).find(r => r.password === pass);
    if (admMatch) {
      const adminUser = { ...admMatch, role: admMatch.role || 'admin' };
      delete adminUser.password;
      _finalizeLogin(adminUser);
      return;
    }

    // Employees
    let empRes;
    try {
      empRes = await dbGet('employees', `?username=eq.${uname}&select=*`);
    } catch (_) {
      empRes = [];
    }

    const empMatch = (empRes || []).find(r => r.password === pass);
    if (!empMatch) {
      if (errEl) errEl.textContent = ar ? 'بيانات دخول غير صحيحة' : 'Invalid credentials';
      return;
    }

    const empUser = { ...empMatch, role: empMatch.role || 'employee' };
    delete empUser.password;
    _finalizeLogin(empUser);
  } catch (e) {
    console.error('[login]', e);

    const uiError =
      e &&
      (e.name === 'TypeError' ||
       /Cannot read|undefined|null|classList|style|textContent|innerHTML/.test(String(e.message || '')));

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
  // Stop active camera
  if (window.videoStream) {
    try {
      window.videoStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    window.videoStream = null;
  }

  // Stop chat polling / realtime unsub
  if (window.chatSubscription) {
    try {
      if (typeof window.chatSubscription === 'function') window.chatSubscription();
      else clearInterval(window.chatSubscription);
    } catch (_) {}
    window.chatSubscription = null;
  }

  window.currentChat = null;

  // Clear session
  _clearSavedUser();
  window.currentUser = null;
  window._isSubmitting = false;

  window.allAdmins = [];
  window.allBranches = [];
  window.allEmployees = [];
  window.managerTeamData = {};

  // Reset admin nav
  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  const visNav = _id('adm-visits-nav');
  if (visNav) visNav.style.display = 'none';

  // Reset tabs
  ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'].forEach(t => {
    const d = _id('admin-' + t);
    if (d) d.style.display = 'none';
  });

  _forEach('#report-tabs .tab', t => {
    t.style.display = '';
  });

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const e = _id(id);
    if (e) e.style.display = '';
  });

  // Clear login form
  const lu = _id('login-user');
  if (lu) lu.value = '';

  const lp = _id('login-pass');
  if (lp) lp.value = '';

  const le = _id('login-err');
  if (le) le.textContent = '';

  _safeCall('showPage', 'login-page');
}

// ── CLOCK ──
function startClock() {
  function tick() {
    const now = new Date();
    const locale = (window.currentLang || 'ar') === 'ar' ? 'ar-EG' : 'en-US';
    const el = _id('live-clock');
    const del = _id('live-date');

    if (el) {
      el.textContent = now.toLocaleTimeString(locale, { hour12: false });
    }

    if (del) {
      del.textContent = now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  tick();
  setInterval(tick, 1000);
}

// ── EMP DATA ──
