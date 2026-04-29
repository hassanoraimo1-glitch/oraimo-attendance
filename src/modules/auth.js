// ═══════════════════════════════════════════════════════════
// modules/auth.js
// Final roles:
//   - superadmin
//   - admin
//   - team_leader
//   - employee
//
// Legacy:
//   - manager => admin
//
// Visits:
//   - view: superadmin / admin / team_leader
//   - upload/manage: team_leader only
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function _id(id) {
  return document.getElementById(id);
}

function _qs(selector, root = document) {
  return root.querySelector(selector);
}

function _qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
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

function _forEach(selector, cb, root = document) {
  root.querySelectorAll(selector).forEach(cb);
}

function _safeCall(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn === 'function') {
    try {
      return fn(...args);
    } catch (e) {
      console.error(`[auth] ${fnName} failed:`, e);
    }
  }
  return undefined;
}

function _notify(msg) {
  if (typeof window.notify === 'function') {
    window.notify(msg);
  } else {
    console.warn('[notify]', msg);
  }
}

function _getDbGet() {
  if (typeof window.dbGet === 'function') return window.dbGet;
  if (typeof dbGet === 'function') return dbGet;
  return null;
}

function _clearSavedUser() {
  try { localStorage.removeItem('oraimo_user'); } catch (_) {}
  try { sessionStorage.removeItem('oraimo_user'); } catch (_) {}
}

function _saveUser(user) {
  try {
    localStorage.setItem('oraimo_user', JSON.stringify(user));
  } catch (_) {
    try {
      sessionStorage.setItem('oraimo_user', JSON.stringify(user));
    } catch (_) {}
  }
}

function _normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();

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

function _canUploadOwnDisplay(role) {
  const r = _normalizeRole(role);
  return r === 'employee' || r === 'team_leader';
}

function _sanitizeUser(userObj) {
  const user = { ...(userObj || {}) };
  delete user.password;
  user.role = _normalizeRole(user.role);
  return user;
}

// ─────────────────────────────────────────
// Role & permissions state
// ─────────────────────────────────────────
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
    canUploadOwnDisplay: _canUploadOwnDisplay(role)
  };

  document.body.dataset.role = role;
  document.body.dataset.canViewVisits = window.visitPermissions.canViewVisits ? '1' : '0';
  document.body.dataset.canManageVisits = window.visitPermissions.canManageVisits ? '1' : '0';
}

// ─────────────────────────────────────────
// Visits controls
// ─────────────────────────────────────────
function _getVisitsRoots() {
  const roots = [];

  [
    'admin-visits',
    'visits-page',
    'visits-section',
    'tl-visits-page',
    'adm-visits-page'
  ].forEach(id => {
    const el = _id(id);
    if (el) roots.push(el);
  });

  const byData = _qsa('[data-page="visits"], [data-section="visits"], [data-visits-root]');
  byData.forEach(el => roots.push(el));

  if (!roots.length) roots.push(document);
  return roots;
}

function _isLikelyVisitManageEl(el) {
  if (!el || el.nodeType !== 1) return false;

  const id = String(el.id || '').toLowerCase();
  const cls = String(el.className || '').toLowerCase();
  const name = String(el.getAttribute('name') || '').toLowerCase();
  const type = String(el.getAttribute('type') || '').toLowerCase();
  const onclick = String(el.getAttribute('onclick') || '').toLowerCase();
  const text = String(el.textContent || '').trim().toLowerCase();
  const htmlFor = String(el.getAttribute('for') || '').toLowerCase();
  const dataAction = String(el.getAttribute('data-action') || '').toLowerCase();
  const dataRole = String(el.getAttribute('data-role') || '').toLowerCase();

  const raw = [id, cls, name, type, onclick, text, htmlFor, dataAction, dataRole].join(' ');

  const keywords = [
    'visit-add',
    'add-visit',
    'save-visit',
    'upload-visit',
    'visit-submit',
    'visit-camera',
    'visit-photo',
    'visit-image',
    'new-visit',
    'camera',
    'upload',
    'save',
    'submit',
    'capture',
    'takephoto',
    'chooseimage',
    'file',
    'photo',
    'image',
    'زيارة',
    'زياره',
    'رفع',
    'حفظ',
    'اضافة',
    'إضافة',
    'تصوير',
    'التقاط',
    'كاميرا',
    'صورة',
    'صوره',
    'اختيار صورة',
    'اختيار صوره'
  ];

  const hasKeyword = keywords.some(k => raw.includes(k.toLowerCase()));

  if (el.matches('input[type="file"], input[type="submit"], button, label')) {
    if (hasKeyword) return true;
  }

  if (hasKeyword) return true;

  if (el.hasAttribute('data-visits-manage')) return true;

  return false;
}

function _hideVisitManageElement(el) {
  if (!el || el.nodeType !== 1) return;

  el.style.display = 'none';
  el.disabled = true;
  el.setAttribute('aria-hidden', 'true');
  el.dataset.lockedByAuth = '1';

  if (el.tagName === 'INPUT' && el.type === 'file') {
    try { el.value = ''; } catch (_) {}
  }

  if (el.tagName === 'FORM') {
    el.dataset.readonlyVisits = '1';
  }
}

function _showVisitManageElement(el) {
  if (!el || el.nodeType !== 1) return;

  el.style.display = '';
  el.disabled = false;
  el.removeAttribute('aria-hidden');
  delete el.dataset.lockedByAuth;
}

function _applyVisitsNavVisibility(role) {
  const canView = _canViewVisits(role);

  ['adm-visits-nav', 'nav-visits'].forEach(id => {
    const el = _id(id);
    if (el) el.style.display = canView ? 'flex' : 'none';
  });
}

function _applyVisitsActionVisibility(role) {
  const canManage = _canManageVisits(role);
  const roots = _getVisitsRoots();

  roots.forEach(root => {
    const candidates = _qsa(
      'button, label, input, form, .btn, .action-btn, .upload-box, .camera-box, [onclick], [data-action], [data-visits-manage]',
      root
    );

    candidates.forEach(el => {
      if (_isLikelyVisitManageEl(el)) {
        if (canManage) _showVisitManageElement(el);
        else _hideVisitManageElement(el);
      }
    });

    // لو في عناصر للعرض فقط
    _qsa('[data-visits-view-only]', root).forEach(el => {
      el.style.display = canManage ? 'none' : '';
    });
  });
}

function _blockVisitsActionEvent(e) {
  const role = _normalizeRole(window.currentUser && window.currentUser.role);
  if (_canManageVisits(role)) return;

  const target = e.target && e.target.closest
    ? e.target.closest('button, a, label, input, form, .btn, [onclick], [data-action], [data-visits-manage]')
    : null;

  if (!target) return;

  const roots = _getVisitsRoots();
  const insideVisits = roots.some(root => root === document ? true : root.contains(target));
  if (!insideVisits) return;

  if (_isLikelyVisitManageEl(target) || target.closest('[data-visits-manage]')) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    if (target.tagName === 'INPUT' && target.type === 'file') {
      try { target.value = ''; } catch (_) {}
    }

    _notify('رفع الزيارات متاح للتيم ليدر فقط');
    return false;
  }
}

function _blockVisitsFormSubmit(e) {
  const role = _normalizeRole(window.currentUser && window.currentUser.role);
  if (_canManageVisits(role)) return;

  const form = e.target;
  if (!form || form.tagName !== 'FORM') return;

  const roots = _getVisitsRoots();
  const insideVisits = roots.some(root => root === document ? true : root.contains(form));
  if (!insideVisits) return;

  const raw = [
    form.id || '',
    form.className || '',
    form.getAttribute('name') || '',
    form.getAttribute('action') || '',
    form.getAttribute('onsubmit') || '',
    form.textContent || ''
  ].join(' ').toLowerCase();

  if (
    raw.includes('visit') ||
    raw.includes('زيارة') ||
    raw.includes('زياره') ||
    form.dataset.readonlyVisits === '1'
  ) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    _notify('رفع الزيارات متاح للتيم ليدر فقط');
    return false;
  }
}

function _installVisitsReadOnlyGuard() {
  if (window.__visitsReadOnlyGuardInstalled) return;
  window.__visitsReadOnlyGuardInstalled = true;

  document.addEventListener('click', _blockVisitsActionEvent, true);
  document.addEventListener('change', _blockVisitsActionEvent, true);
  document.addEventListener('submit', _blockVisitsFormSubmit, true);
}

function _startVisitsObserver() {
  if (window.__visitsObserverStarted) return;
  window.__visitsObserverStarted = true;

  const observer = new MutationObserver(() => {
    const role = _normalizeRole(window.currentUser && window.currentUser.role);
    _applyVisitsNavVisibility(role);
    _applyVisitsActionVisibility(role);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });

  window.__visitsObserver = observer;
}

function _enforceVisitsPermissions(role) {
  _applyVisitsNavVisibility(role);
  _applyVisitsActionVisibility(role);
  _installVisitsReadOnlyGuard();
  _startVisitsObserver();

  [0, 200, 700, 1500].forEach(delay => {
    setTimeout(() => {
      const r = _normalizeRole(window.currentUser && window.currentUser.role);
      _applyVisitsNavVisibility(r);
      _applyVisitsActionVisibility(r);
    }, delay);
  });
}

// ─────────────────────────────────────────
// Admin UI reset
// ─────────────────────────────────────────
function _resetAdminUI() {
  _forEach('#admin-app .bottom-nav .nav-item', n => {
    n.style.display = '';
    n.classList.remove('active');
  });

  _forEach('#report-tabs .tab', t => {
    t.style.display = '';
  });

  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const el = _id(id);
    if (el) el.style.display = '';
  });

  _setDisplay('admins-section', 'none');
}

// ─────────────────────────────────────────
// Finalize login
// ─────────────────────────────────────────
function _finalizeLogin(userObj) {
  const normalizedUser = _sanitizeUser(userObj);

  window.currentUser = normalizedUser;
  _setVisitPermissions(normalizedUser);
  _saveUser(normalizedUser);

  try {
    showApp();
    return true;
  } catch (uiErr) {
    console.error('[auth] showApp after login failed:', uiErr);
    _clearSavedUser();
    window.currentUser = null;
    window.visitPermissions = null;
    _safeCall('showPage', 'login-page');
    throw uiErr;
  }
}

// ─────────────────────────────────────────
// App routing
// ─────────────────────────────────────────
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
  _resetAdminUI();

  if (_isAdminAreaRole(role)) {
    _safeCall('showPage', 'admin-app');

    _setText('admin-name-top', user.name || 'Admin');

    const chip = _id('admin-role-chip');
    if (chip) {
      chip.textContent = _roleLabel(role);
      chip.className = 'role-chip badge role-' + role;
    }

    if (role === 'superadmin') {
      _setDisplay('admins-section', 'block');
    }

    if (role === 'admin' || role === 'superadmin') {
      const dashNav = _qs('#admin-app .bottom-nav .nav-item');
      if (typeof window.adminTab === 'function' && dashNav) {
        window.adminTab('dashboard', dashNav);
      } else {
        _setDisplay('admin-dashboard', 'block');
      }
    }

    if (role === 'team_leader') {
      setTimeout(() => {
        const visNavEl = _id('adm-visits-nav') || _id('nav-visits');

        _forEach('#admin-app .nav-item', n => n.classList.remove('active'));

        ['dashboard', 'employees', 'branches', 'reports', 'settings', 'chat'].forEach(t => {
          const page = _id('admin-' + t);
          if (page) page.style.display = 'none';
        });

        const visitsPage = _id('admin-visits') || _id('visits-page');
        if (visitsPage) visitsPage.style.display = 'block';

        if (visNavEl) visNavEl.classList.add('active');

        _safeCall('loadTLVisitsTab');
      }, 200);
    }

    _safeCall('loadAdminDashboard');
    _safeCall('loadAllEmployees');
    _safeCall('loadBranches');
    _safeCall('clearOldVisitPhotos');

    if (role === 'superadmin' || role === 'admin') {
      _safeCall('loadAdminsList');
    }

    if (role === 'team_leader') {
      setTimeout(() => {
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
      }, 200);
    }

    _enforceVisitsPermissions(role);

    setTimeout(() => _safeCall('fixNavDirection'), 100);
  } else {
    _safeCall('showPage', 'emp-app');

    if (typeof window.empTab === 'function') {
      const homeNav = _qs('#emp-app .nav-item');
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

    const empVisitsNav = _qs('#emp-app .nav-item[onclick*="visits"]');
    if (empVisitsNav) empVisitsNav.style.display = 'none';
  }

  if (typeof window.registerOneSignalUser === 'function') {
    try { window.registerOneSignalUser(); } catch (_) {}
  }

  setTimeout(() => _safeCall('fixNavDirection'), 100);
}

// ─────────────────────────────────────────
// Login
// ─────────────────────────────────────────
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

  const dbGetFn = _getDbGet();
  if (!dbGetFn) {
    if (errEl) errEl.textContent = ar ? 'خدمة الاتصال غير جاهزة' : 'Connection service is not ready';
    return;
  }

  window._isSubmitting = true;

  if (btn) {
    btn.disabled = true;
    btn.textContent = ar ? 'جاري الدخول...' : 'Signing in...';
  }

  if (errEl) errEl.textContent = '';

  try {
    if (username === 'admin' && pass === 'Oraimo@Admin2026') {
      _finalizeLogin({
        role: 'superadmin',
        name: 'Super Admin',
        username: 'admin'
      });
      return;
    }

    const uname = encodeURIComponent(username);

    let admRes = [];
    try {
      admRes = await dbGetFn('admins', `?username=eq.${uname}&select=*`);
    } catch (e) {
      console.warn('[auth] admins query failed:', e);
      admRes = [];
    }

    const admMatch = (admRes || []).find(r => String(r.password || '') === pass);
    if (admMatch) {
      const adminUser = _sanitizeUser({
        ...admMatch,
        role: _normalizeRole(admMatch.role || 'admin')
      });
      _finalizeLogin(adminUser);
      return;
    }

    let empRes = [];
    try {
      empRes = await dbGetFn('employees', `?username=eq.${uname}&select=*`);
    } catch (e) {
      console.warn('[auth] employees query failed:', e);
      empRes = [];
    }

    const empMatch = (empRes || []).find(r => String(r.password || '') === pass);
    if (!empMatch) {
      if (errEl) errEl.textContent = ar ? 'بيانات دخول غير صحيحة' : 'Invalid credentials';
      return;
    }

    const empUser = _sanitizeUser({
      ...empMatch,
      role: _normalizeRole(empMatch.role || 'employee')
    });

    _finalizeLogin(empUser);
  } catch (e) {
    console.error('[auth][login]', e);

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

// ─────────────────────────────────────────
// Logout
// ─────────────────────────────────────────
function doLogout() {
  if (window.videoStream) {
    try {
      window.videoStream.getTracks().forEach(track => track.stop());
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
    const el = _id(id);
    if (el) el.style.display = '';
  });

  const lu = _id('login-user');
  if (lu) lu.value = '';

  const lp = _id('login-pass');
  if (lp) lp.value = '';

  const le = _id('login-err');
  if (le) le.textContent = '';

  _safeCall('showPage', 'login-page');
}

// ─────────────────────────────────────────
// Live clock
// ─────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    const locale = (window.currentLang || 'ar') === 'ar' ? 'ar-EG' : 'en-US';

    const clockEl = _id('live-clock');
    const dateEl = _id('live-date');

    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString(locale, { hour12: false });
    }

    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(locale, {
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
