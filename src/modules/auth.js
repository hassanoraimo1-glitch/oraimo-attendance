// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// SAFE ROLE PATCH:
//   • Final supported roles:
//       superadmin, admin, team_leader, employee
//   • Legacy role "manager" is auto-mapped to "admin"
//   • Visits:
//       - view: superadmin / admin / team_leader
//       - manage/upload: team_leader only
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
    try { sessionStorage.setItem('oraimo_user', JSON.stringify(u));
    } catch (_) {}
  }
}

function _normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();

  // Legacy mapping
  if (r === 'manager') return 'admin';

  if (r === 'superadmin') return 'superadmin';
  if (r === 'admin') return 'admin';
  if (r === 'team_leader') return 'team_leader';
  return 'employee';
}

function _roleLabel(role) {
  const r = _normalizeRole(role);
  if (r === 'superadmin') return 'Super Admin';
  if (r === 'admin') return 'Admin';
  if (r === 'team_leader') return 'Team Leader';
  return 'Employee';
}

function _isAdminAreaRole(role) {
  const r = _normalizeRole(role);
  return r === 'superadmin' || r === 'admin' || r === 'team_leader';
}

function _canViewVisits(role) {
  const r = _normalizeRole(role);
  return r === 'superadmin' || r === 'admin' || r === 'team_leader';
}

function _canManageVisits(role) {
  const r = _normalizeRole(role);
  return r === 'team_leader';
}

function _setVisitPermissions(user) {
  const role = _normalizeRole(user && user.role);

  window.currentUser = {
    ...(window.currentUser || {}),
    ...(user || {}),
    role
  };

  window.visitPermissions = {
    role,
    canViewVisits: _canViewVisits(role),
    canManageVisits: _canManageVisits(role),
    canViewAllVisits: role === 'superadmin' || role === 'admin',
    canUploadOwnDisplay: role === 'employee' || role === 'team_leader'
  };

  document.body.dataset.role = role;
  document.body.dataset.canViewVisits = window.visitPermissions.canViewVisits ? '1' : '0';
  document.body.dataset.canManageVisits = window.visitPermissions.canManageVisits ? '1' : '0';
}

function _applyVisitsNavVisibility(role) {
  const canView = _canViewVisits(role);

  // Main admin visits nav
  const admVisitsNav = _id('adm-visits-nav');
  if (admVisitsNav) admVisitsNav.style.display = canView ? 'flex' : 'none';

  // Legacy/alternate ids if present
  const navVisits = _id('nav-visits');
  if (navVisits) navVisits.style.display = canView ? 'flex' : 'none';
}

function _applyVisitsActionVisibility(role) {
  const canManage = _canManageVisits(role);

  // Known possible buttons/containers for visits create/upload
  [
    'visit-add-btn',
    'add-visit-btn',
    'visit-camera-btn',
    'save-visit-btn',
    'upload-visit-btn',
    'visit-submit-btn',
    'new-visit-btn'
  ].forEach(id => {
    const el = _id(id);
    if (el) el.style.display = canManage ? '' : 'none';
  });

  // Generic hooks if you already have them in HTML
  _forEach('[data-visits-manage]', el => {
    el.style.display = canManage ? '' : 'none';
  });

  _forEach('[data-visits-view-only]', el => {
    el.style.display = canManage ? 'none' : '';
  });
}

function _resetAdminUI() {
  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

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
  const normalizedUser = {
    ...userObj,
    role: _normalizeRole(userObj && userObj.role)
  };

  window.currentUser = normalizedUser;
  _setVisitPermissions(normalizedUser);
  _saveUser(normalizedUser);

  try {
    showApp();
    return true;
  } catch (uiErr) {
    console.error('[showApp after login]', uiErr);
    _clearSavedUser();
    window.currentUser = null;
    window.visitPermissions = null;
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

  const role = _normalizeRole(user.role);
  user.role = role;
  _setVisitPermissions(user);

  _safeCall('applyLang');

  // Always reset first
  _resetAdminUI();

  if (_isAdminAreaRole(role)) {
    _setText('admin-name-top', user.name || 'Admin');

    const chip = _id('admin-role-chip');
    if (chip) {
      chip.textContent = _roleLabel(role);
      chip.className = 'role-chip badge role-' + role;
    }

    if (role === 'superadmin') _setDisplay('admins-section', 'block');

    _safeCall('showPage', 'admin-app');

    // Default dashboard for admin/superadmin
    if (role === 'admin' || role === 'superadmin') {
      const dashNav = document.querySelector('#admin-app .bottom-nav .nav-item');
      if (typeof window.adminTab === 'function' && dashNav) {
        window.adminTab('dashboard', dashNav);
      } else {
        _setDisplay('admin-dashboard', 'block');
      }
    }

    // Team leader defaults to visits tab
    if (role === 'team_leader') {
      setTimeout(() => {
        const visNavEl = _id('adm-visits-nav');

        _forEach('#admin-app .nav-item', n => n.classList.remove('active'));

        ['dashboard', 'employees', 'branches', 'reports', 'settings', 'chat'].forEach(t => {
          const d = _id('admin-' + t);
          if (d) d.style.display = 'none';
        });

        const visitsPage = _id('admin-visits');
        if (visitsPage) visitsPage.style.display = 'block';

        if (visNavEl) visNavEl.classList.add('active');

        _safeCall('loadTLVisitsTab');
      }, 200);
    }

    // Shared admin-area loaders
    _safeCall('loadAdminDashboard');
    _safeCall('loadAllEmployees');
    _safeCall('loadBranches');
    _safeCall('clearOldVisitPhotos');

    if (role === 'superadmin' || role === 'admin') {
      _safeCall('loadAdminsList');
    }

    // Team leader restrictions
    if (role === 'team_leader') {
      setTimeout(() => {
        const settingsNavEl = _id('settings-nav-item');
        if (settingsNavEl) settingsNavEl.style.display = 'flex';

        const branchesNavEl = _id('adm-branches-nav');
        if (branchesNavEl) branchesNavEl.style.display = 'none';

        // Hide reports from TL if your old UI used them
        _forEach('#admin-app .bottom-nav .nav-item', n => {
          const oc = n.getAttribute('onclick') || '';
          if (oc.includes('reports')) n.style.display = 'none';
        });

        ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
          const el = _id(id);
          if (el) el.style.display = 'none';
        });
      }, 200);
    }

    _applyVisitsNavVisibility(role);
    _applyVisitsActionVisibility(role);
    setTimeout(() => _safeCall('fixNavDirection'), 100);
  } else {
    _safeCall('showPage', 'emp-app');

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

    // Employee never sees visits tab
    const visNav = document.querySelector('#emp-app .nav-item[onclick*="visits"]');
    if (visNav) visNav.style.display = 'none';
  }

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
      const adminUser = {
        ...admMatch,
        role: _normalizeRole(admMatch.role || 'admin')
      };
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

    const empUser = {
      ...empMatch,
      role: _normalizeRole(empMatch.role || 'employee')
    };
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
  if (window.videoStream) {
    try {
      window.videoStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    window.videoStream = null;
  }

  if (window.chatSubscription) {
    try {
      if (typeof window.chatSubscription === 'function') window.chatSubscription();
      else clearInterval(window.chatSubscription);
    } catch (_) {}
    window.chatSubscription = null;
  }

  window.currentChat = null;

  _clearSavedUser();
  window.currentUser = null;
  window.visitPermissions = null;
  window._isSubmitting = false;

  delete document.body.dataset.role;
  delete document.body.dataset.canViewVisits;
  delete document.body.dataset.canManageVisits;

  window.allAdmins = [];
  window.allBranches = [];
  window.allEmployees = [];
  window.managerTeamData = {};

  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  _forEach('#report-tabs .tab', t => {
    t.style.display = '';
  });

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const e = _id(id);
    if (e) e.style.display = '';
  });

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
