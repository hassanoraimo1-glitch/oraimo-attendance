// ═══════════════════════════════════════════════════════════
// modules/auth.js - FULL UPDATED VERSION (v13)
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    // ── RESET: إخفاء كل العناصر أولاً ──
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
        n.style.display = 'none';
        n.classList.remove('active');
    });

    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(currentUser.role);

    if (isAdmin) {
        // إعداد بيانات الأدمن العلوي
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

        // ── التحكم في الـ Navigation حسب الصلاحية ──
        if (role === 'superadmin' || role === 'admin' || role === 'viewer' || role === 'manager') {
            document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
                const oc = n.getAttribute('onclick') || '';
                const id = n.id || '';
                // إخفاء الموظفين من الناف بار (لأنها في الإعدادات) وإخفاء الزيارات عن الأدمن العام
                if (oc.includes("'employees'")) n.style.display = 'none';
                else if (id === 'adm-visits-nav') n.style.display = 'none';
                else n.style.display = 'flex';
            });
        } 
        else if (role === 'team_leader') {
            document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
                const id = n.id || '';
                const oc = n.getAttribute('onclick') || '';
                if (oc.includes("'dashboard'") || id === 'adm-visits-nav' || id === 'settings-nav-item') {
                    n.style.display = 'flex';
                } else {
                    n.style.display = 'none';
                }
            });
        }

        // صلاحيات إضافية
        const adminSec = document.getElementById('admins-section');
        if (adminSec) adminSec.style.display = (role === 'superadmin') ? 'block' : 'none';

        if (role === 'viewer') {
            const addBtn = document.getElementById('add-emp-btn');
            if (addBtn) addBtn.style.display = 'none';
            const setNav = document.getElementById('settings-nav-item');
            if (setNav) setNav.style.display = 'none';
        }

        showPage('admin-app');

        // توجيه تلقائي للـ Team Leader لصفحة الزيارات
        if (role === 'team_leader') {
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const vd = document.getElementById('admin-visits');
            if (vd) vd.style.display = 'block';
            const vNav = document.getElementById('adm-visits-nav');
            if (vNav) vNav.classList.add('active');
            if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
        } else {
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const dd = document.getElementById('admin-dashboard');
            if (dd) dd.style.display = 'block';
            const dNav = document.querySelector('#admin-app .bottom-nav .nav-item[onclick*="dashboard"]');
            if (dNav) {
                document.querySelectorAll('#admin-app .nav-item').forEach(n => n.classList.remove('active'));
                dNav.classList.add('active');
            }
            if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        }

        // تحميل البيانات الأساسية
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        if (typeof loadBranches === 'function') loadBranches();
        if (typeof loadAdminsList === 'function' && (role === 'superadmin' || role === 'admin')) loadAdminsList();

    } else {
        // واجهة الموظف العادي
        showPage('emp-app');
        const homeNav = document.querySelector('#emp-app .nav-item');
        if (typeof empTab === 'function' && homeNav) empTab('home', homeNav);
        
        const empName = document.getElementById('emp-name-top');
        if (empName) empName.textContent = currentUser.name;
        
        const profName = document.getElementById('profile-name');
        if (profName) profName.textContent = currentUser.name;

        if (typeof loadEmpData === 'function') loadEmpData();
        if (typeof renderProducts === 'function') renderProducts();
    }

    if (typeof registerOneSignalUser === 'function') registerOneSignalUser();
    setTimeout(fixNavDirection, 100);
}

// ── LOGIN FUNCTION ──
async function doLogin() {
    if (window._isSubmitting) return;
    
    const username = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const errEl = document.getElementById('login-err');
    const btn = document.querySelector('#login-page .btn-green');
    const isAr = (currentLang === 'ar');

    if (!username || !pass) {
        errEl.textContent = isAr ? 'أدخل بيانات الدخول' : 'Enter your credentials';
        return;
    }

    window._isSubmitting = true;
    if (btn) {
        btn.disabled = true;
        btn.textContent = isAr ? 'جاري الدخول...' : 'Signing in...';
    }
    errEl.textContent = '';

    try {
        // 1. فحص الـ Super Admin (Hardcoded)
        if (username === 'admin' && pass === 'Oraimo@Admin2026') {
            window.currentUser = { role: 'superadmin', name: 'Super Admin' };
            localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
            showApp(); return;
        }

        const uname = encodeURIComponent(username);

        // 2. فحص جدول الأدمن
        if (typeof dbGet !== 'function') throw new Error("Database helper not found");

        const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
        const admMatch = (admRes || []).find(r => r.password === pass);

        if (admMatch) {
            window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
            delete window.currentUser.password;
            localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
            showApp(); return;
        }

        // 3. فحص جدول الموظفين
        const empRes = await dbGet('employees', `?username=eq.${uname}&select=*`).catch(() => []);
        const empMatch = (empRes || []).find(r => r.password === pass);

        if (!empMatch) {
            errEl.textContent = isAr ? 'بيانات دخول غير صحيحة' : 'Invalid credentials';
            return;
        }

        window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
        delete window.currentUser.password;
        localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
        showApp();

    } catch (e) {
        console.error('[Login Error Detail]:', e);
        errEl.textContent = isAr ? 'خطأ في الاتصال، تأكد من الإنترنت' : 'Connection error, check internet';
    } finally {
        window._isSubmitting = false;
        if (btn) {
            btn.disabled = false;
            btn.textContent = isAr ? 'تسجيل الدخول' : 'Sign In';
        }
    }
}

function doLogout() {
    localStorage.removeItem('oraimo_user');
    window.currentUser = null;
    window._isSubmitting = false;
    showPage('login-page');
    location.reload(); // لإعادة ضبط الحالة تماماً
}
