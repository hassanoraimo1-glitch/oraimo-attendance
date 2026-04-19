// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// ═══════════════════════════════════════════════════════════

function showApp() {
  if (!currentUser) return showPage('login-page');
  applyLang();

  const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(currentUser.role);

  if (isAdmin) {
    setupAdminNav();
    showPage('admin-app');

    // ❌ منع الزيارات لغير team_leader
    if (currentUser.role !== 'team_leader') {
      const visitsPage = document.getElementById('admin-visits');
      if (visitsPage) visitsPage.style.display = 'none';
    }

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
// ADMIN NAV SETUP
// ═══════════════════════════════════════════════════════════
function setupAdminNav() {
  const role = currentUser.role;

  const nameTop = document.getElementById('admin-name-top');
  if (nameTop) nameTop.textContent = currentUser.name || 'Admin';

  const chip = document.getElementById('admin-role-chip');
  if (chip) {
    const roleLabel =
      role === 'superadmin' ? 'Super Admin' :
      role === 'manager' ? 'Team Leader' :
      role === 'team_leader' ? 'Team Leader' :
      role.charAt(0).toUpperCase() + role.slice(1);

    chip.textContent = roleLabel;
    chip.className = 'role-chip badge role-' + role;
  }

  // Reset nav
  document.querySelectorAll('#admin-app .bottom-nav .nav-item')
    .forEach(n => { n.style.display = ''; n.classList.remove('active'); });

  // ❌ اخفاء Team tab
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'employees'")) n.style.display = 'none';
  });

  // ❌ الزيارات تظهر فقط للـ team_leader
  const visNav = document.getElementById('adm-visits-nav');
  if (visNav) visNav.style.display = (role === 'team_leader') ? 'flex' : 'none';

  // ❌ أمان إضافي — منع فتحها حتى لو اتنادت
  if (role !== 'team_leader') {
    const visitsPage = document.getElementById('admin-visits');
    if (visitsPage) visitsPage.style.display = 'none';
  }

  // Admins section
  const adminsSection = document.getElementById('admins-section');
  if (adminsSection) adminsSection.style.display = (role === 'superadmin') ? 'block' : 'none';

  // Buttons
  const canAddEmp = (role === 'superadmin' || role === 'admin' || role === 'manager');
  ['add-emp-btn', 'add-emp-btn2'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.display = canAddEmp ? '' : 'none';
  });

  // Viewer restrictions
  if (role === 'viewer') {
    const s = document.getElementById('settings-nav-item');
    if (s) s.style.display = 'none';
  }

  // ✅ Team Leader logic
  if (role === 'team_leader') {

    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
      const oc = n.getAttribute('onclick') || '';
      if (oc.includes("'branches'") || oc.includes("'reports'")) {
        n.style.display = 'none';
      }
    });

    setTimeout(() => {
      ['dashboard','employees','branches','reports','settings','chat']
        .forEach(t => {
          const d = document.getElementById('admin-' + t);
          if (d) d.style.display = 'none';
        });

      const vd = document.getElementById('admin-visits');
      if (vd) vd.style.display = 'block';

      if (visNav) visNav.classList.add('active');

      if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
    }, 50);

  } else {
    const firstNav = document.querySelector('#admin-app .bottom-nav .nav-item:not([style*="display: none"])');
    if (firstNav) firstNav.classList.add('active');
  }
}


// ═══════════════════════════════════════════════════════════
// EMPLOYEE NAV
// ═══════════════════════════════════════════════════════════
function setupEmployeeNav() {
  document.querySelectorAll('#emp-app .nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'visits'")) n.style.display = 'none';
  });

  document.querySelectorAll('#emp-app .nav-item').forEach(n => n.classList.remove('active'));

  const homeNav = document.querySelector('#emp-app .nav-item[onclick*="\'home\'"]');
  if (homeNav) homeNav.classList.add('active');
}


// ═══════════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════════
async function doLogin() {
  if (_isSubmitting) return;

  const username = (document.getElementById('login-user').value || '').trim();
  const pass = document.getElementById('login-pass').value || '';
  const errEl = document.getElementById('login-err');

  if (!username || !pass) {
    if (errEl) errEl.textContent = 'Enter your credentials';
    return;
  }

  try {
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

    if (!empMatch) {
      if (errEl) errEl.textContent = 'Invalid credentials';
      return;
    }

    window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
    delete window.currentUser.password;
    localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
    showApp();

  } catch (e) {
    console.error('[login]', e);
  }
}


// ═══════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════
function startClock() {
  function tick() {
    const now = new Date();
    const el = document.getElementById('live-clock');
    const del = document.getElementById('live-date');

    if (el) el.textContent = now.toLocaleTimeString();
    if (del) del.textContent = now.toLocaleDateString();
  }

  tick();
  setInterval(tick, 1000);
}
