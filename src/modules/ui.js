// ═══════════════════════════════════════════════════════════
// modules/ui.js — Navigation, modals, notifications, profile UI
// Provides globals: empTab, adminTab, showErr, notify, openModal, closeModal,
//   toggleAcc, viewSelfie, fullSelfie, uploadProfilePhoto, loadProfilePhoto,
//   loadSettingsEmpList, loadQ1Analytics, loadShiftSettings, updateEmpShift,
//   loadTLMyTeamSettings, getShiftLabel, showPresentEmployees,
//   showAbsentEmployees, showProductEmployees, showPhotoSourceModal
// ═══════════════════════════════════════════════════════════

// ── SELFIE VIEWERS ──
function viewSelfie(name, selfieIn, selfieOut, mapLink) {
  document.getElementById('selfie-modal-name').textContent = name;
  const inImg = document.getElementById('selfie-in-img');
  const outImg = document.getElementById('selfie-out-img');
  if (inImg) { inImg.src = selfieIn || ''; inImg.style.display = selfieIn ? 'block' : 'none'; }
  if (outImg) { outImg.src = selfieOut || ''; outImg.style.display = selfieOut ? 'block' : 'none'; }
  const mapBtn = document.getElementById('selfie-map-btn');
  if (mapBtn) { mapBtn.href = mapLink || '#'; mapBtn.style.display = mapLink ? 'inline-block' : 'none'; }
  openModal('selfie-modal');
}
function fullSelfie(src) {
  document.getElementById('selfie-fs-img').src = src;
  document.getElementById('selfie-fullscreen').classList.add('open');
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
function empTab(tab, el) {
  // ❌ تم حذف visits
const tabs = ['home', 'sales', 'visits', 'display', 'profile', 'chat', 'specs'];
  tabs.forEach(t => {
    const d = document.getElementById('emp-' + t);
    if (d) d.style.display = (t === tab) ? 'block' : 'none';
  });

  document.querySelectorAll('#emp-app .nav-item').forEach(n => 
    n.classList.remove('active')
  );

  if (el) el.classList.add('active');

  // ===== Actions =====
  if (tab === 'sales') {
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof loadTodaySales === 'function') loadTodaySales();
  }

  if (tab === 'profile') {
    const nameEl = document.getElementById('profile-name');
    const branchEl = document.getElementById('profile-branch');

    if (nameEl) nameEl.textContent = currentUser?.name || '-';
    if (branchEl) branchEl.textContent = currentUser?.branch || '-';

    if (typeof loadEmpMonthlyReport === 'function') loadEmpMonthlyReport();
    if (typeof loadEmpDailyLog === 'function') loadEmpDailyLog();
    if (typeof loadProfilePhoto === 'function') loadProfilePhoto();
  }

  if (tab === 'home' && typeof loadModelTargetAlert === 'function') {
    loadModelTargetAlert();
  }

  if (tab === 'display' && typeof loadDisplayTab === 'function') {
    loadDisplayTab();
  }

  if (tab === 'specs' && typeof renderSpecsList === 'function') {
    renderSpecsList();
  }

  if (tab === 'chat' && typeof loadChats === 'function') {
    loadChats();
  }
}

function adminTab(tab, el) {
  const tabs = ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'];

  tabs.forEach(t => {
    const d = document.getElementById('admin-' + t);
    if (d) d.style.display = (t === tab) ? 'block' : 'none';
  });

  document.querySelectorAll('#admin-app .nav-item').forEach(n => 
    n.classList.remove('active')
  );

  if (el) el.classList.add('active');

  if (tab === 'dashboard' && typeof loadAdminDashboard === 'function') loadAdminDashboard();
  if (tab === 'employees' && typeof loadAllEmployees === 'function') loadAllEmployees();
  if (tab === 'branches' && typeof initBranchDashboard === 'function') initBranchDashboard();
  if (tab === 'visits' && typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
  if (tab === 'chat' && typeof loadAdminChatList === 'function') loadAdminChatList();

  if (tab === 'settings') {
    // Team leader layout
    if (currentUser && currentUser.role === 'team_leader') {
      setTimeout(() => {
        document.querySelectorAll('#admin-settings .acc-item').forEach(item => {
          if (item.id !== 'tl-team-acc-item') item.style.display = 'none';
        });

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
              <div style="font-size:12px;color:var(--muted);margin-bottom:10px">
                الموظفون المسجلون في فريقك
              </div>
              <div id="tl-myteam-list">
                <div style="text-align:center;padding:16px">
                  <div class="loader"></div>
                </div>
              </div>
            </div>
          `;

          const settingsEl = document.getElementById('admin-settings');
          if (settingsEl) settingsEl.insertBefore(tlSection, settingsEl.firstChild);
        }

        if (typeof loadTLMyTeamSettings === 'function') {
          loadTLMyTeamSettings();
        }
      }, 30);

      return; // ✅ مهم جدًا يفضل زي ما هو
    }
  }
}

    // Admin/superadmin: inject "Team Management" (Employees moved here from nav) + shifts
    setTimeout(() => {
      // 1) Team accordion (employees list)
      let teamSection = document.getElementById('acc-team-item');
      if (!teamSection) {
        teamSection = document.createElement('div');
        teamSection.id = 'acc-team-item';
        teamSection.className = 'acc-item';
        teamSection.innerHTML = `
          <div class="acc-hdr" onclick="toggleAcc('acc-team')">
            <span>👥 إدارة الفريق</span>
            <span class="acc-arrow" id="acc-team-arrow">▼</span>
          </div>
          <div class="acc-body" id="acc-team" style="display:none">
            <button class="btn-primary" style="margin-bottom:10px;width:100%" onclick="openAddEmp()">+ إضافة موظف</button>
            <div id="settings-emp-list"></div>
          </div>`;
        const settingsEl = document.getElementById('admin-settings');
        if (settingsEl) settingsEl.insertBefore(teamSection, settingsEl.firstChild);
      }

      // 2) Shift accordion
      let shiftSection = document.getElementById('acc-shifts-item');
      if (!shiftSection) {
        shiftSection = document.createElement('div');
        shiftSection.id = 'acc-shifts-item';
        shiftSection.className = 'acc-item';
        shiftSection.innerHTML = `
          <div class="acc-hdr" onclick="toggleAcc('acc-shifts')">
            <span>⏰ الشيفتات</span>
            <span class="acc-arrow" id="acc-shifts-arrow">▼</span>
          </div>
          <div class="acc-body" id="acc-shifts" style="display:none">
            <div style="font-size:12px;color:var(--muted);margin-bottom:10px">غيّر شيفت كل موظف (صباحي / مسائي)</div>
            <div id="shift-settings-list"><div style="text-align:center;padding:16px"><div class="loader"></div></div></div>
          </div>`;
        const hoursItem = document.getElementById('acc-hours-item');
        const settingsEl = document.getElementById('admin-settings');
        if (hoursItem && hoursItem.parentNode) hoursItem.parentNode.insertBefore(shiftSection, hoursItem.nextSibling);
        else if (settingsEl) settingsEl.appendChild(shiftSection);
      }
    }, 30);
  }
}

// ═══════════════════════════════════════════════════════════
// TOASTS & MODALS — notify uses a DIFFERENT internal name to avoid
// accidental re-entry with window.notify from app.js (dom.js).
// ═══════════════════════════════════════════════════════════
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; setTimeout(() => el.textContent = '', 3000); }
}

function notify(msg, type = 'success') {
  // Guard: if app.js (ES module) has already installed a richer notify
  // from utils/dom.js, delegate to it — but only if it's NOT this function.
  if (window.notify && window.notify !== notify && window.notify.__isDomNotify) {
    window.notify(msg, type);
    return;
  }
  // Otherwise render inline.
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    container.style.cssText = 'position:fixed;top:calc(20px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:90vw';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  const bg = type === 'error' ? '#ff3b3b' : type === 'success' ? '#00C853' : '#2979FF';
  const fg = type === 'success' ? '#000' : '#fff';
  el.style.cssText = 'pointer-events:auto;background:' + bg + ';color:' + fg + ';padding:11px 18px;border-radius:12px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.4);animation:toastIn .3s;font-family:Cairo,sans-serif;text-align:center';
  el.textContent = String(msg || '');
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// Install notify onto window only if a "richer" one is not already there.
// Tag ours so we can detect it later and avoid infinite loops.
notify.__isLegacyNotify = true;
if (!window.notify || window.notify.__isLegacyNotify) {
  window.notify = notify;
}

function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }));

var lastTap = 0;
document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTap < 300) e.preventDefault(); lastTap = now; }, { passive: false });

// iPhone: fix chat keyboard push layout
(function () {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput) return;
  chatInput.addEventListener('focus', () => {
    if (/iPhone|iPad/.test(navigator.userAgent)) {
      setTimeout(() => { const el = document.getElementById('chat-messages'); if (el) el.scrollTop = el.scrollHeight; }, 400);
    }
  });
})();

// Safe area padding fix for iOS PWA
(function () {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom,0px)');
    document.querySelectorAll('.bottom-nav').forEach(n => { n.style.paddingBottom = 'calc(10px + env(safe-area-inset-bottom,0px))'; });
  }
})();

// ═══════════════════════════════════════════════════════════
// ABSENT + PRESENT + PRODUCT EMPLOYEES MODALS
// ═══════════════════════════════════════════════════════════
function showAbsentEmployees() {
  const ar = currentLang === 'ar';
  const presentIds = window._todayPresentIds || [];
  const absentList = (allEmployees || []).filter(e => !presentIds.includes(e.id));
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--red)">
    <div style="font-size:16px;font-weight:800;color:var(--red);margin-bottom:14px">😴 ${ar ? 'الغائبون اليوم' : 'Absent Today'} (${absentList.length})</div>
    ${absentList.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد غياب' : 'No absences'}</div>` :
      absentList.map(emp => `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="emp-avatar" style="width:36px;height:36px;font-size:13px">${(emp.name || '?')[0].toUpperCase()}</div>
        <div><div style="font-size:13px;font-weight:700">${emp.name}</div><div style="font-size:11px;color:var(--muted)">${emp.branch || '-'}</div></div>
      </div>`).join('')}
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function showPresentEmployees(todayAtt) {
  const ar = currentLang === 'ar';
  const empMap = {}; (allEmployees || []).forEach(e => { empMap[e.id] = e; });
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--green)">
    <div style="font-size:16px;font-weight:800;color:var(--green);margin-bottom:14px">✅ ${ar ? 'الحاضرون اليوم' : 'Present Today'} (${todayAtt.length})</div>
    ${todayAtt.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد حضور' : 'None'}</div>` :
      todayAtt.map(a => {
        const emp = empMap[a.employee_id] || {};
        const lateT = a.late_minutes > 0 ? `<span class="badge badge-yellow" style="font-size:10px">⚠️ ${a.late_minutes}${ar ? 'د' : 'm'}</span>` : `<span class="badge badge-green" style="font-size:10px">${ar ? 'في الوقت' : 'On time'}</span>`;
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">${emp.profile_photo ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (emp.name || '?')[0].toUpperCase()}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:700">${emp.name || a.employee_id}</div><div style="font-size:11px;color:var(--muted)">${emp.branch || ''} · ${ar ? 'دخل' : 'In'}: ${a.check_in || '-'}</div></div>
          ${lateT}</div>`;
      }).join('')}
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function showProductEmployees(productName) {
  const ar = currentLang === 'ar';
  const sales = (window._productSalesData || []).filter(s => s.product_name === productName);
  const emps = window._allEmpsData || [];
  const empMap = {}; emps.forEach(e => { empMap[e.id] = e; });
  const byEmp = {};
  sales.forEach(s => { if (!byEmp[s.employee_id]) byEmp[s.employee_id] = { name: (empMap[s.employee_id]?.name || s.employee_id), qty: 0, total: 0 }; byEmp[s.employee_id].qty += s.quantity; byEmp[s.employee_id].total += s.total_amount; });
  const sorted = Object.values(byEmp).sort((a, b) => b.qty - a.qty);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:75vh;overflow-y:auto;border-top:2px solid var(--green)">
    <div style="font-size:15px;font-weight:800;margin-bottom:4px;direction:ltr">${productName}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px">${ar ? 'مبيعات الموظفين' : 'Employee Sales'}</div>
    ${sorted.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا توجد مبيعات' : 'No sales'}</div>` :
      sorted.map((e, i) => `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:26px;font-size:13px;font-weight:800;color:var(--muted);text-align:center">${i + 1}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">${e.name}</div></div>
        <div style="text-align:left"><div style="font-size:14px;font-weight:800;color:var(--green)">${e.qty} ${ar ? 'قطعة' : 'pcs'}</div><div style="font-size:10px;color:var(--muted)">EGP ${fmtEGP(e.total)}</div></div></div>`).join('')}
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function showPhotoSourceModal(inputId) {
  const ar = currentLang === 'ar';
  const input = document.getElementById(inputId); if (!input) return;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS) { input.removeAttribute('capture'); input.click(); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `<div style="background:var(--card);border-radius:22px 22px 0 0;padding:24px 18px;width:100%;border-top:2px solid var(--green)">
    <div style="font-size:15px;font-weight:800;margin-bottom:18px;text-align:center">${ar ? 'اختر مصدر الصورة' : 'Choose image source'}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <button onclick="document.getElementById('${inputId}').setAttribute('capture','environment');document.getElementById('${inputId}').click();this.closest('[style*=fixed]').remove()" style="padding:16px;background:var(--card2);border:1.5px solid var(--green);border-radius:14px;color:var(--green);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer">📷 ${ar ? 'الكاميرا' : 'Camera'}</button>
      <button onclick="document.getElementById('${inputId}').removeAttribute('capture');document.getElementById('${inputId}').click();this.closest('[style*=fixed]').remove()" style="padding:16px;background:var(--card2);border:1.5px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer">🖼️ ${ar ? 'المعرض' : 'Gallery'}</button>
    </div>
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:13px;background:transparent;border:none;color:var(--muted);font-family:Cairo,sans-serif;font-size:13px;cursor:pointer;margin-top:10px">${ar ? 'إلغاء' : 'Cancel'}</button>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════════════════
// PROFILE PHOTO
// ═══════════════════════════════════════════════════════════
async function uploadProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ar = currentLang === 'ar';
  const canvas = document.createElement('canvas');
  const img = new Image();
  const reader = new FileReader();
  reader.onload = async function (e) {
    img.onload = async function () {
      const maxSize = 200;
      let w = img.width, h = img.height;
      if (w > h) { h = h * maxSize / w; w = maxSize; } else { w = w * maxSize / h; h = maxSize; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      try {
        localStorage.setItem('profile_photo_' + currentUser.id, base64);
        const imgEl = document.getElementById('profile-avatar-img');
        const icEl = document.getElementById('profile-avatar-icon');
        if (imgEl) { imgEl.src = base64; imgEl.style.display = 'block'; }
        if (icEl) icEl.style.display = 'none';
        await dbPatch('employees', { profile_photo: base64 }, `?id=eq.${currentUser.id}`).catch(() => { });
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

// ═══════════════════════════════════════════════════════════
// ACCORDION
// ═══════════════════════════════════════════════════════════
function toggleAcc(id) {
  const body = document.getElementById(id);
  if (!body) return;
  const arrow = document.getElementById(id + '-arrow');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.classList.toggle('open', !isOpen);
  if (!isOpen) {
    if (id === 'acc-branches' && typeof loadBranches === 'function') loadBranches();
    if (id === 'acc-products' && typeof loadProductsSettings === 'function') loadProductsSettings();
    if (id === 'acc-targets' && typeof loadTargetsList === 'function') loadTargetsList();
    if (id === 'acc-admins' && typeof loadAdminsList === 'function') loadAdminsList();
    if (id === 'acc-team') loadSettingsEmpList();
    if (id === 'acc-shifts') loadShiftSettings();
    if (id === 'acc-tl-myteam') loadTLMyTeamSettings();
  }
}

// ═══════════════════════════════════════════════════════════
// SETTINGS SUB-LISTS
// ═══════════════════════════════════════════════════════════
function loadSettingsEmpList() {
  const el = document.getElementById('settings-emp-list');
  if (!el) return;
  const ar = currentLang === 'ar';
  if (!allEmployees || allEmployees.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div>' + (ar ? 'لا يوجد موظفون' : 'No employees') + '</div>';
    return;
  }
  el.innerHTML = allEmployees.map(emp => `
    <div class="emp-card">
      <div class="emp-avatar" style="overflow:hidden">${emp.profile_photo ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">` : (emp.name || '?')[0].toUpperCase()}</div>
      <div class="emp-info"><div class="emp-name">${emp.name}</div><div class="emp-branch">${emp.branch || '-'}</div></div>
      <div class="emp-actions">
        <button class="action-btn edit" onclick="openEditEmp(${emp.id})">✏️</button>
        <button class="action-btn del" onclick="deleteEmp(${emp.id})">🗑️</button>
      </div>
    </div>`).join('');
}

function loadQ1Analytics() {
  const el = document.getElementById('q1-analytics-content');
  if (!el || typeof Q1_STORES === 'undefined' || !Q1_STORES || Q1_STORES.length === 0) return;
  const ar = currentLang === 'ar';
  el.innerHTML = Q1_STORES.slice(0, 30).map(s => {
    const marActual = s.mar_actual, marProj = s.mar_projected, dailyRate = s.mar_daily;
    const vsFeb = s.feb > 0 ? Math.round((marProj - s.feb) / s.feb * 100) : 0;
    const maxVal = Math.max(s.jan, s.feb, marProj, 1);
    const trendUp = marProj > s.feb;
    return `<div class="q1-card">
      <div class="q1-store-name">${s.store}</div>
      <div class="q1-months">
        <div class="q1-month"><div class="q1-month-label">${ar ? 'يناير' : 'Jan'}</div><div class="q1-month-val">${(s.jan / 1000).toFixed(1)}K</div></div>
        <div class="q1-month"><div class="q1-month-label">${ar ? 'فبراير' : 'Feb'}</div><div class="q1-month-val">${(s.feb / 1000).toFixed(1)}K</div></div>
        <div class="q1-month"><div class="q1-month-label">${ar ? 'مارس (فعلي)' : 'Mar (Actual)'}</div><div class="q1-month-val" style="color:var(--yellow)">${(marActual / 1000).toFixed(1)}K</div><div style="font-size:8px;color:var(--muted)">${MARCH_DAYS_RECORDED}d</div></div>
        <div class="q1-month" style="background:rgba(0,200,83,.12);border:1px solid rgba(0,200,83,.25)"><div class="q1-month-label" style="color:var(--green)">${ar ? 'مارس (متوقع)' : 'Mar (Proj.)'}</div><div class="q1-month-val" style="color:var(--green)">${(marProj / 1000).toFixed(1)}K</div><div class="${trendUp ? 'q1-trend-up' : 'q1-trend-down'}">${trendUp ? '▲' : '▼'} ${Math.abs(vsFeb)}% vs Feb</div></div>
      </div>
      <div class="q1-proj">
        <div><div class="q1-proj-label">${ar ? 'المعدل اليومي' : 'Daily Rate'}</div><div style="font-size:12px;color:var(--muted)">EGP ${dailyRate.toLocaleString()} / ${ar ? 'يوم' : 'day'}</div></div>
        <div class="q1-proj-val">EGP ${(marProj / 1000).toFixed(1)}K</div>
      </div>
      <div class="run-rate-bar"><div class="run-rate-fill" style="width:${Math.min(100, Math.round(marProj / maxVal * 100))}%"></div></div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// SHIFTS MANAGEMENT (settings)
// ═══════════════════════════════════════════════════════════
async function loadShiftSettings() {
  const el = document.getElementById('shift-settings-list');
  if (!el) return;
  const ar = currentLang === 'ar';
  try {
    const emps = await dbGet('employees', '?select=id,name,shift,branch&order=name.asc') || [];
    if (!emps.length) { el.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`; return; }
    el.innerHTML = emps.map(emp => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${emp.name}</div>
          <div style="font-size:10px;color:var(--muted)">${emp.branch || ''}</div>
        </div>
        <select data-empid="${emp.id}" onchange="updateEmpShift(${emp.id},this.value)" style="padding:7px 10px;background:var(--card2);border:1.5px solid var(--border);border-radius:10px;color:var(--text);font-family:Cairo,sans-serif;font-size:12px;font-weight:700;flex-shrink:0">
          <option value="morning" ${(emp.shift || 'morning') === 'morning' ? 'selected' : ''}>🌅 ${ar ? 'صباحي' : 'Morning'}</option>
          <option value="evening" ${emp.shift === 'evening' ? 'selected' : ''}>🌙 ${ar ? 'مسائي' : 'Evening'}</option>
        </select>
      </div>`).join('');
  } catch (e) { el.innerHTML = `<div style="color:var(--red);font-size:12px">Error: ${e.message}</div>`; }
}

async function updateEmpShift(empId, shift) {
  const ar = currentLang === 'ar';
  try {
    await dbPatch('employees', { shift }, `?id=eq.${empId}`);
    const emp = (allEmployees || []).find(e => e.id === empId);
    if (emp) emp.shift = shift;
    // Also update currentUser if they're the one being edited (shouldn't normally, but safe)
    if (currentUser && currentUser.id === empId) {
      currentUser.shift = shift;
      localStorage.setItem('oraimo_user', JSON.stringify(currentUser));
    }
    notify(ar ? '✅ تم تحديث الشيفت' : '✅ Shift updated', 'success');
  } catch (e) { notify('Error: ' + e.message, 'error'); }
}

async function loadTLMyTeamSettings() {
  const el = document.getElementById('tl-myteam-list');
  if (!el) return;
  const ar = currentLang === 'ar';
  el.innerHTML = `<div style="text-align:center;padding:16px"><div class="loader"></div></div>`;
  try {
    const teamRes = await dbGet('manager_teams', `?manager_id=eq.${currentUser.id}&select=employee_id`).catch(() => []) || [];
    const teamIds = teamRes.map(r => r.employee_id);
    if (!teamIds.length) { el.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">${ar ? 'لا يوجد موظفون في فريقك' : 'No team members'}</div>`; return; }
    const emps = await dbGet('employees', '?select=*') || [];
    const myTeam = emps.filter(e => teamIds.includes(e.id));
    const today = todayStr();
    const attToday = await dbGet('attendance', `?date=eq.${today}&select=employee_id,check_in,check_out,late_minutes`).catch(() => []) || [];
    const attMap = {}; attToday.forEach(a => { attMap[a.employee_id] = a; });
    el.innerHTML = myTeam.map(emp => {
      const att = attMap[emp.id];
      const shiftLabel = emp.shift === 'evening' ? (ar ? '🌙 مسائي' : '🌙 Eve') : (ar ? '🌅 صباحي' : '🌅 Mor');
      const attBadge = att
        ? (att.check_out
          ? `<span class="badge badge-blue" style="font-size:9px">${ar ? 'خرج' : 'Out'} ${att.check_out}</span>`
          : `<span class="badge badge-green" style="font-size:9px">${ar ? 'حاضر' : 'In'} ${att.check_in}${att.late_minutes > 0 ? ' ⚠️' : ''}</span>`)
        : `<span class="badge badge-yellow" style="font-size:9px;background:rgba(255,59,59,.15);color:var(--red)">${ar ? 'غائب' : 'Absent'}</span>`;
      return `<div class="emp-card" style="margin-bottom:8px">
        <div class="emp-avatar" style="overflow:hidden;flex-shrink:0">${emp.profile_photo ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">` : (emp.name || '?')[0].toUpperCase()}</div>
        <div class="emp-info" style="flex:1;min-width:0">
          <div class="emp-name">${emp.name}</div>
          <div class="emp-branch" style="font-size:10px">${shiftLabel} ${emp.branch ? '· ' + emp.branch : ''}</div>
        </div>
        ${attBadge}
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = `<div style="color:var(--red);font-size:12px">Error: ${e.message}</div>`; }
}

function getShiftLabel(shift, lang) {
  const ar = lang === 'ar';
  if (shift === 'evening') return ar ? '🌙 مسائي (2م - 10م)' : '🌙 Evening (2PM - 10PM)';
  return ar ? '🌅 صباحي (10ص - 6م)' : '🌅 Morning (10AM - 6PM)';
}
