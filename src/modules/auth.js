// ═══════════════════════════════════════════════════════════
// modules/auth.js — Authentication & App Initialization
// ═══════════════════════════════════════════════════════════

var currentUser = null;

// ── دالة تسجيل الدخول ──
async function doLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const ar = (window.currentLang === 'ar');

    if (!user || !pass) {
        notify(ar ? 'برجاء إدخال البيانات' : 'Please enter credentials', 'error');
        return;
    }

    try {
        // محاولة الدخول كمسؤول (Admins)
        let res = await dbGet('admins', `?username=eq.${encodeURIComponent(user)}&password=eq.${encodeURIComponent(pass)}&select=*`);
        
        if (res && res.length > 0) {
            currentUser = res[0];
            localStorage.setItem('oraimo_user', JSON.stringify({type: 'admin', data: currentUser}));
            showAdminApp();
            return;
        }

        // محاولة الدخول كموظف (Employees)
        res = await dbGet('employees', `?username=eq.${encodeURIComponent(user)}&password=eq.${encodeURIComponent(pass)}&select=*`);
        
        if (res && res.length > 0) {
            currentUser = res[0];
            localStorage.setItem('oraimo_user', JSON.stringify({type: 'employee', data: currentUser}));
            showApp();
        } else {
            notify(ar ? 'بيانات الدخول غير صحيحة' : 'Invalid login', 'error');
        }
    } catch (e) {
        notify(ar ? 'خطأ في الاتصال' : 'Connection error', 'error');
        console.error(e);
    }
}

// ── تشغيل تطبيق الموظف (المبيعات) ──
async function showApp() {
    if (typeof showPage === 'function') showPage('emp-app');
    
    // تحديث واجهة المستخدم بالاسم
    const nameEl = document.getElementById('emp-nav-name');
    if (nameEl) nameEl.textContent = currentUser.name;

    // تشغيل موديول المبيعات فوراً
    if (typeof renderProducts === 'function') {
        await renderProducts(); 
    }
    
    // تحميل مبيعات اليوم
    if (typeof loadTodaySales === 'function') {
        loadTodaySales();
    }
    
    // فحص التارجت (إذا كان موجود في targets.js)
    if (typeof loadModelTargetAlert === 'function') {
        loadModelTargetAlert();
    }
}

// ── تشغيل تطبيق الأدمن ──
function showAdminApp() {
    if (typeof showPage === 'function') showPage('admin-app');
    if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
}

// ── تسجيل الخروج ──
function doLogout() {
    localStorage.removeItem('oraimo_user');
    currentUser = null;
    if (typeof showPage === 'function') showPage('login-page');
}

// تصدير الدوال للعالم الخارجي
window.doLogin = doLogin;
window.showApp = showApp;
window.showAdminApp = showAdminApp;
window.doLogout = doLogout;
