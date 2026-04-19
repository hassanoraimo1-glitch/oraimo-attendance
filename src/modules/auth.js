// ═══════════════════════════════════════════════════════════
// modules/auth.js - النسخة الشاملة (حل مشكلة الخروج والبيانات)
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    const role = currentUser.role;

    // إخفاء الزيارات عن الأدمن والمانجر والسوبر أدمن
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
        if (document.getElementById('admin-name-top')) document.getElementById('admin-name-top').textContent = currentUser.name || 'Admin';
        
        // إظهار أيقونات الناف بار المسموحة
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

        // تحميل البيانات الأساسية
        if (typeof loadBranches === 'function') loadBranches(); 
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        if (typeof renderProducts === 'function') renderProducts(); // تحميل الموديلات

    } else {
        showPage('emp-app');
        if (typeof loadEmpData === 'function') loadEmpData();
        if (typeof renderProducts === 'function') renderProducts(); 
    }
}

// ── دالة تسجيل الدخول المحسنة ──
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
            const admRes = await dbGet('admins', `?username=eq.${uname}&select=*`).catch(() => []);
            const admMatch = (admRes || []).find(r => r.password === pass);
            
            if (admMatch) {
                window.currentUser = { ...admMatch, role: admMatch.role || 'admin' };
            } else {
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

// ── دالة تسجيل الخروج (الإصدار الذي لا يفشل) ──
function doLogout() {
    console.log("Logging out...");
    localStorage.clear(); // مسح كل البيانات المخزنة
    window.currentUser = null;
    
    // إعادة التوجيه لصفحة اللوجين فوراً قبل الريفرش
    if (typeof showPage === 'function') {
        showPage('login-page');
    }
    
    // عمل ريفرش كامل لتنظيف الذاكرة
    setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
    }, 100);
}

// جعل الدالة متاحة عالمياً
window.doLogout = doLogout;
