// ═══════════════════════════════════════════════════════════
// modules/ui.js — Navigation, modals, notifications, profile UI
// ═══════════════════════════════════════════════════════════

// ── SCROLL LOCK HELPERS (إصلاح مشكلة التهنيج والاسكرول) ──
function lockScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.touchAction = 'none'; // لمنع السحب في iOS
}

function unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.height = '';
    document.body.style.touchAction = '';
}

// دالة موحدة لغلق أي مودال ديناميكي وإعادة الاسكرول
window.closeDynamicModal = function(el) {
    const overlay = el.closest('[style*=fixed]');
    if (overlay) overlay.remove();
    unlockScroll();
};

// ── SELFIE VIEWERS ──
function viewSelfie(name, selfieIn, selfieOut, mapLink) {
    const ar = currentLang === 'ar';
    document.getElementById('selfie-view-title').textContent = name;
    document.getElementById('selfie-view-content').innerHTML = `
    <div style="text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${ar ? 'صورة تسجيل الدخول' : 'Check-in photo'}</div>
        <img src="${selfieIn}" style="width:180px;height:180px;border-radius:14px;object-fit:cover;border:2px solid var(--green);cursor:pointer" onclick="fullSelfie('${selfieIn}')">
        ${selfieOut ? `<div style="font-size:12px;color:var(--muted);margin:10px 0 8px">${ar ? 'صورة تسجيل الخروج' : 'Check-out photo'}</div><img src="${selfieOut}" style="width:180px;height:180px;border-radius:14px;object-fit:cover;border:2px solid var(--blue);cursor:pointer" onclick="fullSelfie('${selfieOut}')">` : ''}
        ${mapLink ? `<div style="margin-top:14px"><a href="${mapLink}" target="_blank" style="color:var(--green);font-size:13px;text-decoration:none;font-weight:700">📍 ${ar ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}</a></div>` : `<div style="color:var(--muted);font-size:12px;margin-top:12px">📍 ${ar ? 'لم يتم تسجيل الموقع' : 'No location recorded'}</div>`}
    </div>`;
    openModal('selfie-view-modal');
}

function fullSelfie(src) {
    document.getElementById('selfie-fs-img').src = src;
    document.getElementById('selfie-fullscreen').classList.add('open');
    lockScroll();
}

// ── NAVIGATION ──
function empTab(tab, el) {
    ['home', 'sales', 'visits', 'display', 'profile', 'chat', 'specs'].forEach(t => {
        const d = document.getElementById('emp-' + t);
        if (d) { d.style.display = t === tab ? 'block' : 'none'; }
    });
    document.querySelectorAll('#emp-app .nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    
    if (tab === 'sales') { renderProducts(); loadTodaySales(); }
    if (tab === 'profile') {
        const nameEl = document.getElementById('profile-name');
        const branchEl = document.getElementById('profile-branch');
        if (nameEl) nameEl.textContent = currentUser?.name || '-';
        if (branchEl) branchEl.textContent = currentUser?.branch || '-';
        loadEmpMonthlyReport();
        loadEmpDailyLog();
        loadProfilePhoto();
    }
    if (tab === 'home') { loadModelTargetAlert(); }
    if (tab === 'visits') { loadVisitsTab(); }
    if (tab === 'display') { loadDisplayTab(); }
    if (tab === 'specs') { renderSpecsList(); }
    window.scrollTo(0, 0); // Reset scroll on tab change
}

function adminTab(tab, el) {
    ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'].forEach(t => {
        const d = document.getElementById('admin-' + t);
        if (d) { d.style.display = t === tab ? 'block' : 'none'; }
    });
    document.querySelectorAll('#admin-app .nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');

    if (tab === 'dashboard') loadAdminDashboard();
    if (tab === 'employees') loadAllEmployees();
    if (tab === 'branches') initBranchDashboard();
    if (tab === 'visits') loadTLVisitsTab();
    if (tab === 'chat') { loadAdminChatList(); }
    if (tab === 'settings') {
        if (currentUser && currentUser.role === 'team_leader') {
            setTimeout(() => {
                document.querySelectorAll('#admin-settings .acc-item').forEach(item => { item.style.display = 'none'; });
                let tlSection = document.getElementById('tl-team-acc-item');
                if (!tlSection) {
                    tlSection = document.createElement('div');
                    tlSection.id = 'tl-team-acc-item';
                    tlSection.className = 'acc-item';
                    tlSection.innerHTML = `
                        <div class="acc-hdr" onclick="toggleAcc('acc-tl-myteam')">
                          <span>👥 فريقي</span>
                          <span class="acc-arrow" id="acc-tl-myteam-arrow">▲</span>
                        </div>
                        <div class="acc-body" id="acc-tl-myteam" style="display:block">
                          <div style="font-size:12px;color:var(--muted);margin-bottom:10px">الموظفون المسجلون في فريقك</div>
                          <div id="tl-myteam-list"><div class="loader"></div></div>
                        </div>`;
                    const settingsEl = document.getElementById('admin-settings');
                    if (settingsEl) settingsEl.prepend(tlSection);
                }
                tlSection.style.display = '';
                loadTLMyTeamSettings();
            }, 100);
        }
    }
    applyLang();
    window.scrollTo(0, 0);
}

// ── TOASTS & MODALS ──
function notify(msg, type = 'success') {
    if (window.notify && window.notify !== notify) { window.notify(msg, type); return; }
    const el = document.createElement('div');
    const bg = type === 'error' ? '#ff3b3b' : type === 'success' ? '#00C853' : '#2979FF';
    el.style.cssText = `pointer-events:auto;background:${bg};color:${type === 'success' ? '#000' : '#fff'};padding:11px 18px;border-radius:12px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.4);animation:toastIn .3s;font-family:Cairo,sans-serif;text-align:center`;
    el.textContent = String(msg || '');
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:calc(20px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:90vw';
        document.body.appendChild(container);
    }
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
    lockScroll();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    unlockScroll();
}

// إغلاق المودال عند الضغط على الـ Overlay
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
        if (e.target === o) {
            o.classList.remove('open');
            unlockScroll();
        }
    });
});

// ── PRESENT / ABSENT EMPLOYEES (Fixed Overlays) ──
function showAbsentEmployees() {
    const ar = currentLang === 'ar';
    const presentIds = window._todayPresentIds || [];
    const absentList = allEmployees.filter(e => !presentIds.includes(e.id));
    
    lockScroll();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
    overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--red)">
        <div style="font-size:16px;font-weight:800;color:var(--red);margin-bottom:14px">😴 ${ar ? 'الغائبون اليوم' : 'Absent Today'} (${absentList.length})</div>
        ${absentList.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد غياب' : 'No absences'}</div>` :
        absentList.map(emp => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div class="emp-avatar" style="width:36px;height:36px;font-size:13px">${emp.name[0].toUpperCase()}</div>
            <div><div style="font-size:13px;font-weight:700">${emp.name}</div><div style="font-size:11px;color:var(--muted)">${emp.branch || '-'}</div></div>
        </div>`).join('')}
        <button onclick="closeDynamicModal(this)" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
    </div>`;
    document.body.appendChild(overlay);
}

function showPresentEmployees(todayAtt) {
    const ar = currentLang === 'ar';
    const empMap = {}; (allEmployees || []).forEach(e => { empMap[e.id] = e; });
    
    lockScroll();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
    overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--green)">
        <div style="font-size:16px;font-weight:800;color:var(--green);margin-bottom:14px">✅ ${ar ? 'الحاضرون اليوم' : 'Present Today'} (${todayAtt.length})</div>
        ${todayAtt.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد حضور' : 'None'}</div>` :
        todayAtt.map(a => {
            const emp = empMap[a.employee_id] || {};
            const lateT = a.late_minutes > 0 ? `<span class="badge badge-yellow" style="font-size:10px">⚠️ ${a.late_minutes}${ar ? 'د' : 'm'}</span>` : `<span class="badge badge-green" style="font-size:10px">${ar ? 'في الوقت' : 'On time'}</span>`;
            return `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">${emp.profile_photo ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (emp.name || '?')[0].toUpperCase()}</div>
                <div style="flex:1"><div style="font-size:13px;font-weight:700">${emp.name || a.employee_id}</div><div style="font-size:11px;color:var(--muted)">${emp.branch || ''} · ${ar ? 'دخل' : 'In'}: ${a.check_in || '-'}</div></div>
                ${lateT}
            </div>`;
        }).join('')}
        <button onclick="closeDynamicModal(this)" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
    </div>`;
    document.body.appendChild(overlay);
}

// ── PHOTO SOURCE MODAL ──
function showPhotoSourceModal(inputId) {
    const ar = currentLang === 'ar';
    const input = document.getElementById(inputId); if (!input) return;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS) { input.removeAttribute('capture'); input.click(); return; }

    lockScroll();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
    overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:24px 18px;width:100%;border-top:2px solid var(--green)">
        <div style="font-size:15px;font-weight:800;margin-bottom:18px;text-align:center">${ar ? 'اختر مصدر الصورة' : 'Choose image source'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button onclick="document.getElementById('${inputId}').setAttribute('capture','environment');document.getElementById('${inputId}').click();closeDynamicModal(this)" style="padding:16px;background:var(--card2);border:1.5px solid var(--green);border-radius:14px;color:var(--green);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer">📷 ${ar ? 'الكاميرا' : 'Camera'}</button>
            <button onclick="document.getElementById('${inputId}').removeAttribute('capture');document.getElementById('${inputId}').click();closeDynamicModal(this)" style="padding:16px;background:var(--card2);border:1.5px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer">🖼️ ${ar ? 'المعرض' : 'Gallery'}</button>
        </div>
        <button onclick="closeDynamicModal(this)" style="width:100%;padding:13px;background:transparent;border:none;color:var(--muted);font-family:Cairo,sans-serif;font-size:13px;cursor:pointer;margin-top:10px">${ar ? 'إلغاء' : 'Cancel'}</button>
    </div>`;
    document.body.appendChild(overlay);
}

// ── ACCORDION ──
function toggleAcc(id) {
    const body = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.classList.toggle('open', !isOpen);
    if (!isOpen) {
        if (id === 'acc-branches') loadBranches();
        if (id === 'acc-products') loadProductsSettings();
        if (id === 'acc-targets') loadTargetsList();
        if (id === 'acc-admins') loadAdminsList();
        if (id === 'acc-team') loadSettingsEmpList();
        if (id === 'acc-shifts') loadShiftSettings();
        if (id === 'acc-tl-myteam') loadTLMyTeamSettings();
    }
}

// ── PROFILE PHOTO ──
async function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const ar = currentLang === 'ar';
    const canvas = document.createElement('canvas');
    const img = new Image();
    const reader = new FileReader();
    reader.onload = function (e) {
        img.onload = async function () {
            const maxSize = 200;
            let w = img.width, h = img.height;
            if (w > h) { h = h * maxSize / w; w = maxSize; } else { w = w * maxSize / h; h = maxSize; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            try {
                localStorage.setItem('profile_photo_' + currentUser.id, base64);
                document.getElementById('profile-avatar-img').src = base64;
                document.getElementById('profile-avatar-img').style.display = 'block';
                document.getElementById('profile-avatar-icon').style.display = 'none';
                await dbPatch('employees', { profile_photo: base64 }, `?id=eq.${currentUser.id}`);
                currentUser.profile_photo = base64;
                localStorage.setItem('oraimo_user', JSON.stringify(currentUser));
                notify(ar ? 'تم تحديث الصورة ✅' : 'Photo updated ✅', 'success');
            } catch (e) { notify('Error: ' + e.message, 'error'); }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadProfilePhoto() {
    const saved = localStorage.getItem('profile_photo_' + (currentUser?.id || ''));
    if (saved) {
        const img = document.getElementById('profile-avatar-img');
        const icon = document.getElementById('profile-avatar-icon');
        if (img) { img.src = saved; img.style.display = 'block'; }
        if (icon) icon.style.display = 'none';
    }
}

// ── iOS PWA FIXES ──
(function () {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom,0px)');
        const navs = document.querySelectorAll('.bottom-nav');
        navs.forEach(n => { n.style.paddingBottom = 'calc(10px + env(safe-area-inset-bottom,0px))'; });
    }
    
    // Fix for keyboard pushing layout on iOS
    window.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            document.body.classList.add('keyboard-open');
        }
    });
    window.addEventListener('focusout', () => {
        document.body.classList.remove('keyboard-open');
    });
})();
