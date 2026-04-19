// ═══════════════════════════════════════════════════════════
// modules/auth.js - مصلح لجلب البيانات وإخفاء الزيارات
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    const role = currentUser.role;

    // 1. حذف عنصر الزيارات للأدمن فوراً لضمان عدم ظهوره
    if (role !== 'team_leader') {
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(item => {
            const text = (item.innerText || '').toLowerCase();
            const oc = (item.getAttribute('onclick') || '').toLowerCase();
            if (text.includes('زيارات') || text.includes('visits') || oc.includes('visits')) {
                item.remove(); 
            }
        });
    }

    // 2. تصفير حالة الـ Navigation
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
        n.style.display = 'none';
        n.classList.remove('active');
    });

    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(role);

    if (isAdmin) {
        // تحديث واجهة الأدمن
        if (document.getElementById('admin-name-top')) document.getElementById('admin-name-top').textContent = currentUser.name || 'Admin';
        
        // 3. إظهار العناصر المسموحة
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
            const oc = (n.getAttribute('onclick') || '');
            if (role === 'team_leader') {
                if (oc.includes('visits') || oc.includes('dashboard') || n.id === 'settings-nav-item') {
                    n.style.display = 'flex';
                }
            } else {
                n.style.display = 'flex';
            }
        });

        showPage('admin-app');

        // 4. جلب البيانات الهامة (حل مشكلة اختفاء الفروع والموديلات)
        // نقوم باستدعاء الدوال المسؤولة عن جلب البيانات من قاعدة البيانات
        if (typeof loadBranches === 'function') loadBranches(); 
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        // إذا كان هناك دالة لجلب الموديلات (Specs) للأدمن
        if (typeof renderProducts === 'function') renderProducts(); 

        // التوجيه التلقائي
        if (role === 'team_leader') {
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            if (document.getElementById('admin-visits')) document.getElementById('admin-visits').style.display = 'block';
            if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
        } else {
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            if (document.getElementById('admin-dashboard')) document.getElementById('admin-dashboard').style.display = 'block';
            if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        }

    } else {
        // واجهة الموظف
        showPage('emp-app');
        // جلب بيانات الموظف والموديلات فور الدخول
        if (typeof loadEmpData === 'function') loadEmpData();
        if (typeof renderProducts === 'function') renderProducts(); // لشحن قائمة الموديلات
    }
}

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
                    return;
                }
                window.currentUser = { ...empMatch, role: empMatch.role || 'employee' };
            }
        }
        localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
        showApp();
    } catch (e) {
        if(err) err.textContent = ar ? 'خطأ في الاتصال' : 'Error';
    } finally {
        window._isSubmitting = false;
    }
}
