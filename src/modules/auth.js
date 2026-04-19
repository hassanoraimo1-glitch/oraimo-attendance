// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// ═══════════════════════════════════════════════════════════

function showApp() {
  if (!currentUser) return showPage('login-page');
  applyLang();

  const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(currentUser.role);

  if (isAdmin) {
    setupAdminNav();
    showPage('admin-app');
    if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
    if (typeof loadAllEmployees === 'function') loadAllEmployees();
    if (typeof loadBranches === 'function') loadBranches();
    if (typeof clearOldVisitPhotos === 'function') clearOldVisitPhotos();
    if ((currentUser.role === 'superadmin' || currentUser.role === 'admin') && typeof loadAdminsList === 'function') {
      loadAdminsList();
    }
  } else {
    setupEmployeeNav();
    showPage('emp-app');
    const empName = document.getElementById('emp-name-top'); if (empName) empName.textContent = currentUser.name;
    const pn = document.getElementById('profile-name'); if (pn) pn.textContent = currentUser.name;
    const pb = document.getElementById('profile-branch'); if (pb) pb.textContent = currentUser.branch || '';
    const dayLabel = currentLang === 'ar' ? DAYS_AR[currentUser.day_off] : DAYS_EN[currentUser.day_off];
    const pdo = document.getElementById('profile-dayoff');
    if (pdo) pdo.innerHTML = `<span class="badge badge-blue">${currentLang === 'ar' ? 'الإجازة:' : 'Day Off:'} ${dayLabel || '-'}</span>`;
    if (typeof loadEmpData === 'function') loadEmpData();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof loadModelTargetAlert === 'function') loadModelTargetAlert();
  }

  if (typeof registerOneSignalUser === 'function') registerOneSignalUser();
  setTimeout(() => { if (typeof fixNavDirection === 'function') fixNavDirection(); }, 100);
}

// ═══════════════════════════════════════════════════════════
// ADMIN NAV SETUP — role-based visibility
// ═══════════════════════════════════════════════════════════
function setupAdminNav() {
  const role = currentUser.role;

  // 1. Top bar
  const nameTop = document.getElementById('admin-name-top'); if (nameTop) nameTop.textContent = currentUser.name || 'Admin';
  const chip = document.getElementById('admin-role-chip');
  if (chip) {
    const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'manager' ? 'Team Leader' : role === 'team_leader' ? 'Team Leader' : role.charAt(0).toUpperCase() + role.slice(1);
    chip.textContent = roleLabel;
    chip.className = 'role-chip badge role-' + role;
  }

  // 2. Reset ALL admin nav items to visible + clear active class
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => { n.style.display = ''; n.classList.remove('active'); });

  // 3. ALWAYS hide "Team" nav item (moved to Settings)
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'employees'")) n.style.display = 'none';
  });

  // 4. Visits nav: hidden by default, shown ONLY for team_leader
  const visNav = document.getElementById('adm-visits-nav');
  if (visNav) visNav.style.display = (role === 'team_leader') ? 'flex' : 'none';

  // 5. Admins section only visible for superadmin
  const adminsSection = document.getElementById('admins-section');
  if (adminsSection) adminsSection.style.display = (role === 'superadmin') ? 'block' : 'none';

  // 6. Report tabs: all visible by default
  document.querySelectorAll('#report-tabs .tab').forEach(t => t.style.display = '');

  // 7. Add-employee buttons: visible for superadmin/admin, hidden for viewer/team_leader
  const canAddEmp = (role === 'superadmin' || role === 'admin' || role === 'manager');
  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.display = canAddEmp ? '' : 'none';
  });

  // 8. Viewer: hide settings nav entirely (read-only)
  if (role === 'viewer') {
    const s = document.getElementById('settings-nav-item'); if (s) s.style.display = 'none';
    ['add-emp-btn', 'add-emp-btn2'].forEach(id => { const b = document.getElementById(id); if (b) b.style.display = 'none'; });
  }

  // 9. Team leader: specific layout
  if (role === 'team_leader') {
    // Hide branches & reports from nav
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
      const oc = n.getAttribute('onclick') || '';
      if (oc.includes("'branches'") || oc.includes("'reports'")) n.style.display = 'none';
    });
    // Auto-navigate to visits tab
    setTimeout(() => {
      ['dashboard', 'employees', 'branches', 'reports', 'settings', 'chat'].forEach(t => {
        const d = document.getElementById('admin-' + t); if (d) d.style.display = 'none';
      });
      const vd = document.getElementById('admin-visits'); if (vd) vd.style.display = 'block';
      if (visNav) visNav.classList.add('active');
      if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
    }, 50);
  } else {
    // For all non-TL roles: activate dashboard first
    const firstNav = document.querySelector('#admin-app .bottom-nav .nav-item:not([style*="display: none"])');
    if (firstNav) firstNav.classList.add('active');
  }
}

// ═══════════════════════════════════════════════════════════
// EMPLOYEE NAV SETUP
// ═══════════════════════════════════════════════════════════
function setupEmployeeNav() {
  // Hide visits tab from employee nav (visits are for team_leader via admin app only)
  document.querySelectorAll('#emp-app .nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'visits'")) n.style.display = 'none';
  });
  // Clear active state, mark home as active
  document.querySelectorAll('#emp-app .nav-item').forEach(n => n.classList.remove('active'));
  const homeNav = document.querySelector('#emp-app .nav-item[onclick*="\'home\'"]');
  if (homeNav) homeNav.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// BACK BUTTON HANDLING
// ═══════════════════════════════════════════════════════════
(function () {
  window.addEventListener('popstate', function () {
    const chatModal = document.getElementById('chat-modal');
    if (chatModal && chatModal.classList.contains('open')) {
      if (typeof closeChat === 'function') closeChat();
      history.pushState({ app: true }, '', location.href);
      return;
    }
    const openModalEl = document.querySelector('.modal-overlay.open');
    if (openModalEl) {
      openModalEl.classList.remove('open');
      document.body.classList.remove('modal-open');
      history.pushState({ app: true }, '', location.href);
      return;
    }
    // Otherwise stay in app
    history.pushState({ app: true }, '', location.href);
  });
})();

// ═══════════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════════
async function doLogin() {
  if (_isSubmitting) return;
  const username = (document.getElementById('login-user').value || '').trim();
  const pass = document.getElementById('login-pass').value || '';
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-err');
  const ar = currentLang === 'ar';
  if (!username || !pass) { if (errEl) errEl.textContent = ar ? 'أدخل بيانات الدخول' : 'Enter your credentials'; return; }
  _isSubmitting = true;
  if (btn) { btn.disabled = true; btn.textContent = ar ? 'جاري الدخول...' : 'Signing in...'; }
  if (errEl) errEl.textContent = '';
  try {
    // Hardcoded superadmin
    if (username === 'admin' && pass === 'Oraimo@Admin2026') {
      window.currentUser = { role: 'superadmin', name: 'Super Admin' };
      localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
      showApp(); return;
    }
    const uname = encodeURIComponent(username);
    const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
    const admMatch = (admRes || []).find(r => r.password === pass);
    if (admMatch) {
      window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
      delete window.currentUser.password;
      localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
      showApp(); return;
    }
    const empRes = await dbGet('employees', `?username=eq.${uname}&select=*`).catch(() => []);
    const empMatch = (empRes || []).find(r => r.password === pass);
    if (!empMatch) { if (errEl) errEl.textContent = ar ? 'بيانات دخول غير صحيحة' : 'Invalid credentials'; return; }
    window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
    delete window.currentUser.password;
    localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
    showApp();
  } catch (e) {
    console.error('[login]', e);
    if (errEl) errEl.textContent = ar ? 'خطأ في الاتصال، حاول مرة أخرى' : 'Connection error, try again';
  } finally {
    _isSubmitting = false;
    if (btn) { btn.disabled = false; btn.textContent = ar ? 'تسجيل الدخول' : 'Sign In'; }
  }
}

function doLogout() {
  if (videoStream) { try { videoStream.getTracks().forEach(t => t.stop()); } catch (_) { } videoStream = null; }
  if (typeof chatSubscription !== 'undefined' && chatSubscription) {
    try { if (typeof chatSubscription === 'function') chatSubscription(); else clearInterval(chatSubscription); } catch (_) { }
    chatSubscription = null;
  }
  if (typeof currentChat !== 'undefined') currentChat = null;
  localStorage.removeItem('oraimo_user');
  window.currentUser = null;
  allAdmins = []; allBranches = [];
  if (typeof managerTeamData !== 'undefined') managerTeamData = {};

  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => { n.style.display = ''; n.classList.remove('active'); });
  const visNav = document.getElementById('adm-visits-nav'); if (visNav) visNav.style.display = 'none';
  ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'].forEach(t => {
    const d = document.getElementById('admin-' + t); if (d) d.style.display = 'none';
  });
  document.querySelectorAll('#report-tabs .tab').forEach(t => t.style.display = '');
  ['add-emp-btn', 'add-emp-btn2'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = ''; });

  const lu = document.getElementById('login-user'); if (lu) lu.value = '';
  const lp = document.getElementById('login-pass'); if (lp) lp.value = '';
  const le = document.getElementById('login-err'); if (le) le.textContent = '';
  showPage('login-page');
}

// ═══════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════
function startClock() {
  function tick() {
    const now = new Date(), locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    const el = document.getElementById('live-clock'), del = document.getElementById('live-date');
    if (el) el.textContent = now.toLocaleTimeString(locale, { hour12: false });
    if (del) del.textContent = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  tick(); setInterval(tick, 1000);
}
