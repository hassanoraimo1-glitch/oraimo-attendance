// ═══════════════════════════════════════════════════════════
// modules/auth.js - الـ Nuclear Option لإخفاء الزيارات
// ═══════════════════════════════════════════════════════════

function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    const role = currentUser.role;

    // 1. وظيفة المسح الفوري (تستهدف أي مكان في الصفحة)
    const cleanupVisits = () => {
        if (role === 'team_leader') return; // لو هو TL سيبه يشوف شغله

        // ابحث في كل الـ nav-items في كل الصفحة
        document.querySelectorAll('.nav-item, [onclick*="visits"], #adm-visits-nav').forEach(el => {
            const text = (el.innerText || '').toLowerCase();
            const oc = (el.getAttribute('onclick') || '').toLowerCase();
            const id = (el.id || '').toLowerCase();

            if (text.includes('زيارات') || text.includes('visits') || oc.includes('visits') || id.includes('visits')) {
                el.style.setProperty('display', 'none', 'important'); // إخفاء إجباري
                el.remove(); // مسح من الـ DOM تماماً
            }
        });
    };

    // 2. تشغيل المسح فوراً
    cleanupVisits();

    // 3. مراقب الصفحة (لو أي حاجة اتحملت متأخر يمسحها)
    const observer = new MutationObserver(cleanupVisits);
    observer.observe(document.body, { childList: true, subtree: true });

    // ── باقي منطق إظهار الصفحات ──
    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(role);

    if (isAdmin) {
        // ضبط أسماء الأدمنز
        const nameTop = document.getElementById('admin-name-top');
        if (nameTop) nameTop.textContent = currentUser.name || 'Admin';

        // إظهار العناصر العادية (التي ليست زيارات)
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
            const oc = n.getAttribute('onclick') || '';
            // لو مش تيم ليدر، بنخفي كمان الموظفين من الناف بار
            if (role !== 'team_leader' && oc.includes("'employees'")) {
                n.style.display = 'none';
            } else {
                // لو مش عنصر زيارات (اللي اتمسح فوق) يظهر عادي
                if (n.parentNode) n.style.display = 'flex'; 
            }
        });

        showPage('admin-app');

        // التوجيه التلقائي
        if (role === 'team_leader') {
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const vDiv = document.getElementById('admin-visits');
            if (vDiv) vDiv.style.display = 'block';
            if (typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
        } else {
            document.querySelectorAll('#admin-app .page-content').forEach(p => p.style.display = 'none');
            const dDiv = document.getElementById('admin-dashboard');
            if (dDiv) dDiv.style.display = 'block';
            if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
        }

    } else {
        showPage('emp-app');
        if (typeof loadEmpData === 'function') loadEmpData();
    }
}

// ── LOGIN & LOGOUT ──
async function doLogin() {
    if (window._isSubmitting) return;
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const err = document.getElementById('login-err');
    const ar = (currentLang === 'ar');
    
    window._isSubmitting = true;
    try {
        if (user === 'admin' && pass === 'Oraimo@Admin2026') {
            window.currentUser = { role: 'superadmin', name: 'Super Admin' };
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
        if(err) err.textContent = ar ? 'خطأ اتصال' : 'Error';
    } finally {
        window._isSubmitting = false;
    }
}

function doLogout() {
    localStorage.removeItem('oraimo_user');
    location.reload();
}
