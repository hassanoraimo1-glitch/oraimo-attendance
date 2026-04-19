// ═══════════════════════════════════════════════════════════
// modules/auth.js - النسخة الشاملة (حل مشكلة الخروج والبيانات)
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!window.currentUser) return showPage('login-page');
    applyLang();

    const role = window.currentUser.role;

    // 1. إخفاء الزيارات عن أي حد مش Team Leader
    if (role !== 'team_leader') {
        document.querySelectorAll('.nav-item').forEach(item => {
            const text = (item.innerText || '').toLowerCase();
            const oc = (item.getAttribute('onclick') || '').toLowerCase();
            if (text.includes('زيارات') || text.includes('visits') || oc.includes('visits')) {
                item.style.display = 'none';
                item.remove(); 
            }
        });
    }

    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(role);

    if (isAdmin) {
        if (document.getElementById('admin-name-top')) {
            document.getElementById('admin-name-top').textContent = window.currentUser.name || 'Admin';
        }
        
        // ضبط أيقونات الـ Nav بار للأدمن
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
            const oc = (n.getAttribute('onclick') || '');
            if (role === 'team_leader') {
                if (oc.includes('visits') || oc.includes('dashboard') || n.id === 'settings-nav-item') {
                    n.style.display = 'flex';
                } else { n.style.display = 'none'; }
            } else {
                n.style.display = 'flex';
            }
        });

        showPage('admin-app');

        // تحميل البيانات الأساسية (الفروع والموديلات)
        if (typeof loadBranches === 'function') loadBranches(); 
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        
        // 🚨 استدعاء إجباري لتحميل الموديلات (Specs)
        if (typeof renderProducts === 'function') renderProducts();

    } else {
        // واجهة الموظف
        showPage('emp-app');
        if (typeof loadEmpData === 'function') loadEmpData();
        
        // 🚨 استدعاء إجباري لتحميل الموديلات في المبيعات والـ Specs
        if (typeof renderProducts === 'function') renderProducts(); 
    }
}

// ── دالة تسجيل الدخول (مع تجاوز أخطاء الـ SQL) ──
async function doLogin() {
    if (window._isSubmitting) return;
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const err = document.getElementById('login-err');
    const ar = (currentLang === 'ar');

    window._isSubmitting = true;
    try {
        if (user === 'admin' && pass === 'Oraimo@Admin2026') {
            window.currentUser = { role: 'superadmin', name: 'Hassan Hamed' };
        } else {
            const uname = encodeURIComponent(user);
            // محاولة جلب الأدمن
            const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
            const admMatch = (admRes || []).find(r => r.password === pass);
            
            if (admMatch) {
                window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
            } else {
                // محاولة جلب الموظف
                const empRes = await dbGet('employees', `?username=eq.${uname}&select=*`).catch(() => []);
                const empMatch = (empRes || []).find(r => r.password === pass);
                if (!empMatch) {
                    if(err) err.textContent = ar ? 'بيانات غير صحيحة' : 'Invalid credentials';
                    window._isSubmitting = false;
                    return;
                }
                window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
            }
        }
        localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
        showApp();
    } catch (e) {
        console.error("Login Error:", e);
        if(err) err.textContent = ar ? 'خطأ في قاعدة البيانات' : 'Database Error';
    } finally {
        window._isSubmitting = false;
    }
}

// ── دالة تسجيل الخروج (حل مشكلة عدم الخروج) ──
function doLogout() {
    localStorage.clear(); 
    sessionStorage.clear();
    window.currentUser = null;
    
    // توجيه فوري لصفحة الدخول
    window.location.href = window.location.origin + window.location.pathname;
}

// ربط الدالة بالنافذة لضمان عملها من أي مكان
window.doLogout = doLogout;
