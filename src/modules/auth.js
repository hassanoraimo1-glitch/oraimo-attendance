// ═══════════════════════════════════════════════════════════
// modules/auth.js - النسخة النهائية المحدثة لإخفاء الزيارات
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    // 1. تصفير الـ Navigation تماماً في البداية
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
        n.style.display = 'none';
        n.classList.remove('active');
    });

    const role = currentUser.role;
    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(role);

    if (isAdmin) {
        // تحديث الاسم والرتبة في الواجهة
        const nameTop = document.getElementById('admin-name-top');
        if (nameTop) nameTop.textContent = currentUser.name || 'Admin';

        const chip = document.getElementById('admin-role-chip');
        if (chip) {
            chip.textContent = (role === 'manager' || role === 'team_leader') ? 'Team Leader' : role.charAt(0).toUpperCase() + role.slice(1);
            chip.className = 'role-chip badge role-' + role;
        }

        // 2. التحكم الذكي في أيقونات الشريط السفلي (Navigation)
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
            const id = (n.id || '').toLowerCase();
            const oc = (n.getAttribute('onclick') || '').toLowerCase();
            const label = (n.innerText || '').toLowerCase();

            // تعريف عنصر "الزيارات" بأكثر من وسيلة (ID، كود، أو نص)
            const isVisits = id.includes('visits') || oc.includes('visits') || label.includes('زيارات') || label.includes('visits');

            if (role === 'team_leader') {
                // التيم ليدر يشوف: الزيارات، الداشبورد، الإعدادات
                if (isVisits || id.includes('settings') || id.includes('chat') || oc.includes('dashboard')) {
                    n.style.display = 'flex';
                }
            } else {
                // الأدمن والمانجر والسوبر أدمن: يشوفوا كل شيء ماعدا "الزيارات"
                if (isVisits) {
                    n.style.display = 'none'; // إخفاء قسري للزيارات
                } else if (oc.includes('employees')) {
                    n.style.display = 'none'; // إخفاء الموظفين من الناف بار لأنها في الإعدادات
                } else {
                    n.style.display = 'flex';
                }
            }
        });

        showPage('admin-app');

        // 3. التوجيه التلقائي بعد تسجيل الدخول
        if (role === 'team_leader') {
            // التيم ليدر يفتح على صفحة الزيارات مباشرة
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const vDiv = document.getElementById('admin-visits');
            if (vDiv) vDiv.style.display = 'block';
            
            // تمييز أيقونة الزيارات كأنها مفعلة
            document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
                if ((n.id || '').includes('visits') || (n.getAttribute('onclick') || '').includes('visits')) {
                    n.classList.add('active');
                }
            });
            if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
        } else {
            // الأدمن يفتح على لوحة التحكم (الداشبورد)
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const dDiv = document.getElementById('admin-dashboard');
            if (dDiv) dDiv.style.display = 'block';
            const dNav = document.querySelector('#admin-app .bottom-nav .nav-item[onclick*="dashboard"]');
            if (dNav) {
                document.querySelectorAll('#admin-app .nav-item').forEach(nx => nx.classList.remove('active'));
                dNav.classList.add('active');
            }
            if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        }

        // تحميل البيانات الأساسية
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        if (typeof loadBranches === 'function') loadBranches();
        if (role === 'superadmin' && typeof loadAdminsList === 'function') loadAdminsList();

    } else {
        // واجهة الموظف العادي
        showPage('emp-app');
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
        
        // فحص جدول الأدمن
        const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
        const admMatch = (admRes || []).find(r => r.password === pass);
        if (admMatch) {
            window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
            delete window.currentUser.password;
            localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
            showApp(); return;
        }

        // فحص جدول الموظفين
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
