function showApp() {
    if (!currentUser) return showPage('login-page');
    applyLang();

    const role = currentUser.role;

    // 1. حذف عنصر الزيارات للأدمن تماماً
    if (role !== 'team_leader') {
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(item => {
            const text = (item.innerText || '').toLowerCase();
            const oc = (item.getAttribute('onclick') || '').toLowerCase();
            if (text.includes('زيارات') || text.includes('visits') || oc.includes('visits')) {
                item.remove(); 
            }
        });
    }

    // 2. تصفير الـ Nav
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n => {
        n.style.display = 'none';
        n.classList.remove('active');
    });

    const isAdmin = ['superadmin', 'admin', 'manager', 'viewer', 'team_leader'].includes(role);

    if (isAdmin) {
        if (document.getElementById('admin-name-top')) document.getElementById('admin-name-top').textContent = currentUser.name || 'Admin';
        
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

        // جلب البيانات الأساسية للأدمن
        if (typeof loadBranches === 'function') loadBranches(); 
        if (typeof loadAllEmployees === 'function') loadAllEmployees();
        
        // إجبار تحميل الموديلات للأدمن أيضاً لمشاهدة الـ Specs
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
        
        // 🚨 الجزء الأهم لظهور الموديلات والمبيعات 🚨
        if (typeof loadEmpData === 'function') loadEmpData();
        
        // تأكد أن هذه الدالة موجودة في api.js أو المنتجات
        if (typeof renderProducts === 'function') {
            console.log("Loading Products...");
            renderProducts(); 
        }
    }
}
