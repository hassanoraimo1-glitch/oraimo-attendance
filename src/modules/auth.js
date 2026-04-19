// ═══════════════════════════════════════════════════════════
// modules/auth.js - النسخة المصلحة لظهور الموديلات
// ═══════════════════════════════════════════════════════════

async function showApp() {
    if (!window.currentUser) return showPage('login-page');
    applyLang();

    const role = window.currentUser.role;

    // 1. إخفاء الزيارات عن غير المختصين
    if (role !== 'team_leader') {
        document.querySelectorAll('.nav-item').forEach(item => {
            const text = (item.innerText || '').toLowerCase();
            if (text.includes('زيارات') || text.includes('visits')) item.remove(); 
        });
    }

    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(role);

    if (isAdmin) {
        if (document.getElementById('admin-name-top')) {
            document.getElementById('admin-name-top').textContent = window.currentUser.name || 'Admin';
        }
        showPage('admin-app');

        // جلب البيانات الأساسية
        if (typeof loadBranches === 'function') loadBranches(); 
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        
        // 🚨 محاولة جلب الموديلات مع تأخير بسيط لضمان استقرار الاتصال
        setTimeout(() => {
            if (typeof renderProducts === 'function') renderProducts();
        }, 500);

    } else {
        showPage('emp-app');
        if (typeof loadEmpData === 'function') loadEmpData();
        
        // 🚨 تحديث قائمة الموديلات للموظف (للمبيعات والـ Specs)
        setTimeout(() => {
            if (typeof renderProducts === 'function') renderProducts();
        }, 500);
    }
}

// ── دالة تسجيل الخروج ──
function doLogout() {
    localStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
}
window.doLogout = doLogout;

// ── دالة تسجيل الدخول ──
async function doLogin() {
    if (window._isSubmitting) return;
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const err = document.getElementById('login-err');

    window._isSubmitting = true;
    try {
        if (user === 'admin' && pass === 'Oraimo@Admin2026') {
            window.currentUser = { role: 'superadmin', name: 'Hassan Hamed' };
        } else {
            const uname = encodeURIComponent(user);
            const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
            const admMatch = (admRes || []).find(r => r.password === pass);
            
            if (admMatch) {
                window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
            } else {
                const empRes = await dbGet('employees', `?username=eq.${uname}&select=*`).catch(() => []);
                const empMatch = (empRes || []).find(r => r.password === pass);
                if (!empMatch) {
                    if(err) err.textContent = (currentLang === 'ar') ? 'بيانات غير صحيحة' : 'Invalid credentials';
                    window._isSubmitting = false;
                    return;
                }
                window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
            }
        }
        localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
        showApp();
    } catch (e) {
        if(err) err.textContent = 'Connection Error';
    } finally {
        window._isSubmitting = false;
    }
}
