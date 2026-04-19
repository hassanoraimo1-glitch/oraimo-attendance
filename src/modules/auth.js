// ═══════════════════════════════════════════════════════════
// modules/auth.js - الموديول المعدل (إخفاء الزيارات عن الأدمن)
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    // ── RESET: إخفاء كل الـ nav items أولاً لضمان عدم التداخل ──
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
        n.style.display = 'none';
        n.classList.remove('active');
    });

    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(currentUser.role);

    if (isAdmin) {
        const nameTop = document.getElementById('admin-name-top');
        if (nameTop) nameTop.textContent = currentUser.name || 'Admin';

        const chip = document.getElementById('admin-role-chip');
        if (chip) {
            chip.textContent = currentUser.role === 'superadmin' ? 'Super Admin' :
                               currentUser.role === 'manager' ? 'Team Leader' :
                               currentUser.role === 'team_leader' ? 'Team Leader' :
                               currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
            chip.className = 'role-chip badge role-' + currentUser.role;
        }

        const role = currentUser.role;

        // ── التعديل الجوهري: التحكم في الظهور حسب الرتبة ──
        if (role === 'superadmin' || role === 'admin' || role === 'viewer' || role === 'manager') {
            // هؤلاء يظهر لهم كل شيء ماعدا "الزيارات" و"إدارة الموظفين" (لأنها في الإعدادات)
            document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
                const id = n.id || '';
                const oc = n.getAttribute('onclick') || '';
                
                // إخفاء الزيارات عن الأدمن (حتى لو كان سوبر أدمن)
                if (id === 'adm-visits-nav' || oc.includes("'employees'")) {
                    n.style.display = 'none';
                } else {
                    n.style.display = 'flex';
                }
            });
        } 
        else if (role === 'team_leader') {
            // الـ Team Leader يرى فقط: الزيارات، الداشبورد، والإعدادات
            document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
                const id = n.id || '';
                const oc = n.getAttribute('onclick') || '';
                if (id === 'adm-visits-nav' || id === 'settings-nav-item' || oc.includes("'dashboard'")) {
                    n.style.display = 'flex';
                } else {
                    n.style.display = 'none';
                }
            });
        }

        // إظهار سيكشن الأدمنز للسوبر أدمن فقط
        const adminSec = document.getElementById('admins-section');
        if (adminSec) adminSec.style.display = (role === 'superadmin') ? 'block' : 'none';

        if (role === 'viewer') {
            const addBtn = document.getElementById('add-emp-btn'); if (addBtn) addBtn.style.display = 'none';
            const setNav = document.getElementById('settings-nav-item'); if (setNav) setNav.style.display = 'none';
        }

        showPage('admin-app');

        // توجيه تلقائي
        if (role === 'team_leader') {
            // الـ TL يفتح على الزيارات فوراً
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const vDiv = document.getElementById('admin-visits'); if (vDiv) vDiv.style.display = 'block';
            const vNav = document.getElementById('adm-visits-nav'); if (vNav) vNav.classList.add('active');
            if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
        } else {
            // باقي الأدمنز يفتحوا على الداشبورد
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const dDiv = document.getElementById('admin-dashboard'); if (dDiv) dDiv.style.display = 'block';
            const dNav = document.querySelector('#admin-app .bottom-nav .nav-item[onclick*="dashboard"]');
            if (dNav) dNav.classList.add('active');
            if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        }

        // تحميل البيانات
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        if (typeof loadBranches === 'function') loadBranches();
        if (typeof loadAdminsList === 'function' && (role === 'superadmin' || role === 'admin')) loadAdminsList();

    } else {
        // واجهة الموظف
        showPage('emp-app');
        const hNav = document.querySelector('#emp-app .nav-item');
        if (typeof empTab === 'function' && hNav) empTab('home', hNav);
        
        document.getElementById('emp-name-top').textContent = currentUser.name;
        document.getElementById('profile-name').textContent = currentUser.name;
        if (typeof loadEmpData === 'function') loadEmpData();
        if (typeof renderProducts === 'function') renderProducts();
    }

    if (typeof registerOneSignalUser === 'function') registerOneSignalUser();
    setTimeout(fixNavDirection, 100);
}

// ── LOGIN FUNCTION ──
async function doLogin() {
    if (window._isSubmitting) return;
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const err = document.getElementById('login-err');
    const btn = document.querySelector('#login-page .btn-green');
    const ar = (currentLang === 'ar');

    if (!user || !pass) { err.textContent = ar ? 'أدخل البيانات' : 'Enter credentials'; return; }

    window._isSubmitting = true;
    if (btn) { btn.disabled = true; btn.textContent = ar ? 'جاري الدخول...' : 'Signing in...'; }
    err.textContent = '';

    try {
        if (user === 'admin' && pass === 'Oraimo@Admin2026') {
            window.currentUser = { role: 'superadmin', name: 'Super Admin' };
            localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
            showApp(); return;
        }

        const uname = encodeURIComponent(user);
        
        // فحص الأدمن
        const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
        const admMatch = (admRes || []).find(r => r.password === pass);
        if (admMatch) {
            window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
            delete window.currentUser.password;
            localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
            showApp(); return;
        }

        // فحص الموظف
        const empRes = await dbGet('employees', `?username=eq.${uname}&select=*`).catch(() => []);
        const empMatch = (empRes || []).find(r => r.password === pass);
        if (!empMatch) { err.textContent = ar ? 'بيانات غير صحيحة' : 'Invalid credentials'; return; }

        window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
        delete window.currentUser.password;
        localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
        showApp();

    } catch (e) {
        console.error('[Login]', e);
        err.textContent = ar ? 'خطأ في الاتصال' : 'Connection error';
    } finally {
        window._isSubmitting = false;
        if (btn) { btn.disabled = false; btn.textContent = ar ? 'تسجيل الدخول' : 'Sign In'; }
    }
}

function doLogout() {
    localStorage.removeItem('oraimo_user');
    window.currentUser = null;
    window._isSubmitting = false;
    location.reload();
}
