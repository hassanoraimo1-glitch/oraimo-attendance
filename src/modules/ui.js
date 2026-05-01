// ═══════════════════════════════════════════════════════════
// modules/ui.js — Navigation, modals, notifications, profile UI
// Globals:
// empTab, adminTab, showErr, notify, openModal, closeModal,
// toggleAcc, viewSelfie, fullSelfie, uploadProfilePhoto, loadProfilePhoto,
// loadSettingsEmpList, loadQ1Analytics, loadShiftSettings, updateEmpShift,
// loadTLMyTeamSettings, getShiftLabel, showPresentEmployees,
// showAbsentEmployees, showProductEmployees, showPhotoSourceModal,
// fixNavDirection
// ═══════════════════════════════════════════════════════════

const roleOf = () => (
  window.normalizeRole
    ? window.normalizeRole(window.currentUser?.role)
    : String(window.currentUser?.role || '').trim().toLowerCase()
);

const isTL = () => roleOf() === 'team_leader';
const isAdminLike = () => ['admin', 'super_admin'].includes(roleOf());

function callIf(fnName, ...args) {
  if (typeof window[fnName] === 'function') return window[fnName](...args);
}

// ─────────────────────────────
// SELFIE VIEWERS
// ─────────────────────────────
function viewSelfie(name, selfieIn, selfieOut, mapLink) {
  const ar = window.currentLang === 'ar';
  const title = document.getElementById('selfie-view-title');
  const content = document.getElementById('selfie-view-content');
  if (!title || !content) return;

  title.textContent = name || '';
  content.innerHTML = `
    <div style="text-align:center">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
        ${ar ? 'صورة تسجيل الدخول' : 'Check-in photo'}
      </div>

      <img
        src="${selfieIn || ''}"
        style="width:180px;height:180px;border-radius:14px;object-fit:cover;border:2px solid var(--green);cursor:pointer"
        onclick="fullSelfie('${selfieIn || ''}')"
      >

      ${selfieOut ? `
        <div style="font-size:12px;color:var(--muted);margin:10px 0 8px">
          ${ar ? 'صورة تسجيل الخروج' : 'Check-out photo'}
        </div>
        <img
          src="${selfieOut}"
          style="width:180px;height:180px;border-radius:14px;object-fit:cover;border:2px solid var(--blue);cursor:pointer"
          onclick="fullSelfie('${selfieOut}')"
        >
      ` : ''}

      ${mapLink
        ? `<div style="margin-top:14px">
             <a href="${mapLink}" target="_blank" style="color:var(--green);font-size:13px;text-decoration:none;font-weight:700">
               📍 ${ar ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
             </a>
           </div>`
        : `<div style="color:var(--muted);font-size:12px;margin-top:12px">
             📍 ${ar ? 'لم يتم تسجيل الموقع' : 'No location recorded'}
           </div>`
      }
    </div>
  `;

  openModal('selfie-view-modal');
}

function fullSelfie(src) {
  const img = document.getElementById('selfie-fs-img');
  const box = document.getElementById('selfie-fullscreen');
  if (!img || !box) return;
  img.src = src || '';
  box.classList.add('open');
}

// ─────────────────────────────
// NAVIGATION
// ─────────────────────────────
function empTab(tab, el) {
  ['home', 'sales', 'visits', 'display', 'profile', 'chat', 'specs'].forEach(t => {
    const d = document.getElementById('emp-' + t);
    if (d) d.style.display = t === tab ? 'block' : 'none';
  });

  document.querySelectorAll('#emp-app .nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  if (tab === 'sales') {
    callIf('renderProducts');
    callIf('loadTodaySales');
  }

  if (tab === 'profile') {
    const nameEl = document.getElementById('profile-name');
    const branchEl = document.getElementById('profile-branch');
    if (nameEl) nameEl.textContent = window.currentUser?.name || '-';
    if (branchEl) branchEl.textContent = window.currentUser?.branch || '-';
    callIf('loadEmpMonthlyReport');
    callIf('loadEmpDailyLog');
    loadProfilePhoto();
  }

  if (tab === 'home') callIf('loadModelTargetAlert');
  if (tab === 'visits') callIf('loadVisitsTab');
  if (tab === 'display') callIf('loadDisplayTab');
  if (tab === 'chat') callIf('loadChatUI');
  if (tab === 'specs') callIf('renderSpecsList');
}

function adminTab(tab, el) {
  ['dashboard', 'attendance', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'].forEach(t => {
    const d = document.getElementById('admin-' + t);
    if (d) d.style.display = t === tab ? 'block' : 'none';
  });

  document.querySelectorAll('#admin-app .nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  if (tab === 'dashboard') callIf('loadAdminDashboard');
  if (tab === 'attendance') callIf('loadAdminAttendanceTab');
  if (tab === 'employees') callIf('loadAllEmployees');
  if (tab === 'branches') callIf('initBranchDashboard');
  if (tab === 'visits') callIf('loadTLVisitsTab');
  if (tab === 'chat') callIf('loadAdminChatList');

  if (tab === 'settings') {
    setTimeout(() => {
      const settings = document.getElementById('admin-settings');
      if (!settings) return;

      const allItems = settings.querySelectorAll('.acc-item');
      allItems.forEach(item => item.style.display = '');

      if (isTL()) {
        allItems.forEach(item => item.style.display = 'none');

        let tlSection = document.getElementById('tl-team-acc-item');
        if (!tlSection) {
          tlSection = document.createElement('div');
          tlSection.id = 'tl-team-acc-item';
          tlSection.className = 'acc-item';
          tlSection.innerHTML = `
            <div class="acc-hdr" onclick="toggleAcc('acc-tl-myteam')">
              <span>👥 فريقي</span>
              <span class="acc-arrow" id="acc-tl-myteam-arrow">▼</span>
            </div>
            <div class="acc-body" id="acc-tl-myteam" style="display:block">
              <div style="font-size:12px;color:var(--muted);margin-bottom:10px">الموظفون المسجلون في فريقك</div>
              <div id="tl-myteam-list">
                <div style="text-align:center;padding:16px"><div class="loader"></div></div>
              </div>
            </div>
          `;
          settings.prepend(tlSection);
        } else {
          tlSection.style.display = '';
        }

        loadTLMyTeamSettings();
      } else {
        const tlSection = document.getElementById('tl-team-acc-item');
        if (tlSection) tlSection.style.display = 'none';
      }

      if (isAdminLike()) {
        let shiftSection = document.getElementById('acc-shifts-item');
        if (!shiftSection) {
          shiftSection = document.createElement('div');
          shiftSection.id = 'acc-shifts-item';
          shiftSection.className = 'acc-item';
          shiftSection.innerHTML = `
            <div class="acc-hdr" onclick="toggleAcc('acc-shifts')">
              <span>🌗 إدارة الشيفتات</span>
              <span class="acc-arrow" id="acc-shifts-arrow">▼</span>
            </div>
            <div class="acc-body" id="acc-shifts" style="display:none">
              <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
                🌅 صباحي: 10:00 – 18:00 | 🌙 مسائي: 14:00 – 22:00
              </div>
              <div id="shift-settings-list">
                <div style="text-align:center;padding:16px"><div class="loader"></div></div>
              </div>
            </div>
          `;
          const insertAfter = document.getElementById('acc-team-item') || settings.firstElementChild;
          if (insertAfter && insertAfter.parentNode) insertAfter.parentNode.insertBefore(shiftSection, insertAfter.nextSibling);
          else settings.appendChild(shiftSection);
        }
      }
    }, 60);
  }

  if (tab === 'reports') {
    callIf('loadAllEmployees');

    setTimeout(() => {
      const tabs = document.querySelectorAll('#report-tabs .tab');
      if (!tabs.length) return;

      if (isTL()) {
        tabs.forEach(t => {
          const oc = t.getAttribute('onclick') || '';
          t.style.display = oc.includes('visits') ? '' : 'none';
        });
        const visTab = document.querySelector('#report-tabs .tab[onclick*="visits"]');
        if (visTab) visTab.click();
      } else {
        tabs.forEach(t => t.style.display = '');
      }
    }, 80);
  }

  if (typeof window.applyLang === 'function') window.applyLang();
}

// ─────────────────────────────
// TOASTS & MODALS
// ─────────────────────────────
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || '';
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function notify(msg, type = 'success') {
  const el = document.createElement('div');
  const bg = type === 'error' ? '#ff3b3b' : type === 'success' ? '#00C853' : '#2979FF';
  el.style.cssText = `
    pointer-events:auto;
    background:${bg};
    color:${type === 'success' ? '#000' : '#fff'};
    padding:11px 18px;
    border-radius:12px;
    font-size:13px;
    font-weight:700;
    box-shadow:0 8px 24px rgba(0,0,0,.4);
    font-family:Cairo,sans-serif;
    text-align:center
  `;
  el.textContent = String(msg || '');

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.style.cssText = `
      position:fixed;
      top:calc(20px + env(safe-area-inset-top,0px));
      left:50%;
      transform:translateX(-50%);
      z-index:9999;
      display:flex;
      flex-direction:column;
      gap:8px;
      pointer-events:none;
      max-width:90vw
    `;
    document.body.appendChild(container);
  }

  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('open');
  });
});

let lastTap = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTap < 300) e.preventDefault();
  lastTap = now;
}, { passive: false });

// iPhone chat scroll fix
(() => {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput) return;
  chatInput.addEventListener('focus', () => {
    if (/iPhone|iPad/i.test(navigator.userAgent)) {
      setTimeout(() => {
        const el = document.getElementById('chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
      }, 400);
    }
  });
})();

// iOS safe area
(() => {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (!isIOS) return;
  document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom,0px)');
  document.querySelectorAll('.bottom-nav').forEach(n => {
    n.style.paddingBottom = 'calc(10px + env(safe-area-inset-bottom,0px))';
  });
})();

// ─────────────────────────────
// ABSENT / PRESENT
// ─────────────────────────────
function showAbsentEmployees() {
  const ar = window.currentLang === 'ar';
  const presentIds = window._todayPresentIds || [];
  const absentList = (window.allEmployees || []).filter(e => !presentIds.includes(e.id));

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--red)">
      <div style="font-size:16px;font-weight:800;color:var(--red);margin-bottom:14px">
        😴 ${ar ? 'الغائبون اليوم' : 'Absent Today'} (${absentList.length})
      </div>

      ${absentList.length
        ? absentList.map(emp => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div class="emp-avatar" style="width:36px;height:36px;font-size:13px">
              ${((emp.name || '?')[0]).toUpperCase()}
            </div>
            <div>
              <div style="font-size:13px;font-weight:700">${emp.name || '-'}</div>
              <div style="font-size:11px;color:var(--muted)">${emp.branch || '-'}</div>
            </div>
          </div>
        `).join('')
        : `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد غياب' : 'No absences'}</div>`
      }

      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">
        ${ar ? 'إغلاق' : 'Close'}
      </button>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function showPresentEmployees(todayAtt = []) {
  const ar = window.currentLang === 'ar';
  const empMap = {};
  (window.allEmployees || []).forEach(e => { empMap[Number(e.id)] = e; });

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--green)">
      <div style="font-size:16px;font-weight:800;color:var(--green);margin-bottom:14px">
        ✅ ${ar ? 'الحاضرون اليوم' : 'Present Today'} (${todayAtt.length})
      </div>

      ${todayAtt.length === 0
        ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد حضور' : 'None'}</div>`
        : todayAtt.map(a => {
            const emp = empMap[Number(a.employee_id)] || {};
            const lateBadge = a.late_minutes > 0
              ? `<span class="badge badge-yellow" style="font-size:10px">⚠️ ${a.late_minutes}${ar ? 'د' : 'm'}</span>`
              : `<span class="badge badge-green" style="font-size:10px">${ar ? 'في الوقت' : 'On time'}</span>`;

            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">
                  ${emp.profile_photo
                    ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                    : ((emp.name || '?')[0]).toUpperCase()}
                </div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:700">${emp.name || a.employee_id}</div>
                  <div style="font-size:11px;color:var(--muted)">
                    ${emp.branch || ''}${emp.branch ? ' · ' : ''}${ar ? 'دخل' : 'In'}: ${a.check_in || '-'}
                  </div>
                </div>
                ${lateBadge}
              </div>
            `;
          }).join('')
      }

      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">
        ${ar ? 'إغلاق' : 'Close'}
      </button>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─────────────────────────────
// PROFILE PHOTO
// ─────────────────────────────
async function uploadProfilePhoto(event) {
  const file = event?.target?.files?.[0];
  if (!file || !window.currentUser?.id) return;

  const ar = window.currentLang === 'ar';
  const canvas = document.createElement('canvas');
  const img = new Image();
  const reader = new FileReader();

  reader.onload = e => {
    img.onload = async () => {
      const maxSize = 200;
      let w = img.width, h = img.height;

      if (w > h) {
        h = h * maxSize / w;
        w = maxSize;
      } else {
        w = w * maxSize / h;
        h = maxSize;
      }

      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      const base64 = canvas.toDataURL('image/jpeg', 0.7);

      try {
        localStorage.setItem('profile_photo_' + window.currentUser.id, base64);

        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarIcon = document.getElementById('profile-avatar-icon');

        if (avatarImg) {
          avatarImg.src = base64;
          avatarImg.style.display = 'block';
        }
        if (avatarIcon) avatarIcon.style.display = 'none';

        if (typeof window.dbPatch === 'function') {
          await window.dbPatch('employees', { profile_photo: base64 }, `?id=eq.${window.currentUser.id}`).catch(() => {});
        }

        window.currentUser.profile_photo = base64;
        localStorage.setItem('oraimo_user', JSON.stringify(window.currentUser));
        notify(ar ? 'تم تحديث الصورة ✅' : 'Photo updated ✅', 'success');
      } catch (e) {
        notify('Error: ' + e.message, 'error');
      }
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

function loadProfilePhoto() {
  const saved = localStorage.getItem('profile_photo_' + (window.currentUser?.id || ''));
  if (!saved) return;

  const img = document.getElementById('profile-avatar-img');
  const icon = document.getElementById('profile-avatar-icon');
  if (img) {
    img.src = saved;
    img.style.display = 'block';
  }
  if (icon) icon.style.display = 'none';
}

// ─────────────────────────────
// ACCORDION
// ─────────────────────────────
function toggleAcc(id) {
  const body = document.getElementById(id);
  const arrow = document.getElementById(id + '-arrow');
  if (!body) return;

  const isHidden = getComputedStyle(body).display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (arrow) arrow.classList.toggle('open', isHidden);

  if (!isHidden) return;

  if (id === 'acc-branches') callIf('loadBranches');
  if (id === 'acc-products') callIf('loadProductsSettings');
  if (id === 'acc-targets') callIf('loadTargetsList');
  if (id === 'acc-admins') callIf('loadAdminsList');
  if (id === 'acc-team') loadSettingsEmpList();
  if (id === 'acc-shifts') loadShiftSettings();
  if (id === 'acc-tl-myteam') loadTLMyTeamSettings();
}

// ─────────────────────────────
// SETTINGS
// ─────────────────────────────
function loadSettingsEmpList() {
  const el = document.getElementById('settings-emp-list');
  if (!el) return;
  const ar = window.currentLang === 'ar';

  if (!window.allEmployees || !window.allEmployees.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
    return;
  }

  el.innerHTML = window.allEmployees.map(emp => `
    <div class="emp-card">
      <div class="emp-avatar" style="overflow:hidden">
        ${emp.profile_photo
          ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">`
          : ((emp.name || '?')[0]).toUpperCase()}
      </div>
      <div class="emp-info">
        <div class="emp-name">${emp.name || '-'}</div>
        <div class="emp-branch">${emp.branch || '-'}</div>
      </div>
      <div class="emp-actions">
        <button class="action-btn edit" onclick="openEditEmp(${emp.id})">✏️</button>
        <button class="action-btn del" onclick="deleteEmp(${emp.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function loadQ1Analytics() {
  const el = document.getElementById('q1-analytics-content');
  if (!el || !window.Q1_STORES || !window.Q1_STORES.length) return;

  const ar = window.currentLang === 'ar';
  el.innerHTML = window.Q1_STORES.slice(0, 30).map(s => {
    const marActual = s.mar_actual || 0;
    const marProj = s.mar_projected || 0;
    const dailyRate = s.mar_daily || 0;
    const vsFeb = s.feb > 0 ? Math.round((marProj - s.feb) / s.feb * 100) : 0;
    const maxVal = Math.max(s.jan || 0, s.feb || 0, marProj, 1);
    const trendUp = marProj > (s.feb || 0);

    return `
      <div class="q1-card">
        <div class="q1-store-name">${s.store}</div>

        <div class="q1-months">
          <div class="q1-month">
            <div class="q1-month-label">${ar ? 'يناير' : 'Jan'}</div>
            <div class="q1-month-val">${((s.jan || 0) / 1000).toFixed(1)}K</div>
          </div>

          <div class="q1-month">
            <div class="q1-month-label">${ar ? 'فبراير' : 'Feb'}</div>
            <div class="q1-month-val">${((s.feb || 0) / 1000).toFixed(1)}K</div>
          </div>

          <div class="q1-month">
            <div class="q1-month-label">${ar ? 'مارس (فعلي)' : 'Mar (Actual)'}</div>
            <div class="q1-month-val" style="color:var(--yellow)">${(marActual / 1000).toFixed(1)}K</div>
            <div style="font-size:8px;color:var(--muted)">${window.MARCH_DAYS_RECORDED || 0}d</div>
          </div>

          <div class="q1-month" style="background:rgba(0,200,83,.12);border:1px solid rgba(0,200,83,.25)">
            <div class="q1-month-label" style="color:var(--green)">${ar ? 'مارس (متوقع)' : 'Mar (Proj.)'}</div>
            <div class="q1-month-val" style="color:var(--green)">${(marProj / 1000).toFixed(1)}K</div>
            <div class="${trendUp ? 'q1-trend-up' : 'q1-trend-down'}">${trendUp ? '▲' : '▼'} ${Math.abs(vsFeb)}% vs Feb</div>
          </div>
        </div>

        <div class="q1-proj">
          <div>
            <div class="q1-proj-label">${ar ? 'المعدل اليومي' : 'Daily Rate'}</div>
            <div style="font-size:12px;color:var(--muted)">EGP ${dailyRate.toLocaleString()} / ${ar ? 'يوم' : 'day'}</div>
          </div>
          <div class="q1-proj-val">EGP ${(marProj / 1000).toFixed(1)}K</div>
        </div>

        <div class="run-rate-bar">
          <div class="run-rate-fill" style="width:${Math.min(100, Math.round(marProj / maxVal * 100))}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadShiftSettings() {
  const el = document.getElementById('shift-settings-list');
  if (!el) return;
  const ar = window.currentLang === 'ar';

  try {
    const emps = await window.dbGet('employees', '?select=id,name,shift,branch&order=name.asc') || [];
    if (!emps.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
      return;
    }

    el.innerHTML = emps.map(emp => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${emp.name}</div>
          <div style="font-size:10px;color:var(--muted)">${emp.branch || ''}</div>
        </div>

        <select
          data-empid="${emp.id}"
          onchange="updateEmpShift(${emp.id},this.value)"
          style="padding:7px 10px;background:var(--card2);border:1.5px solid var(--border);border-radius:10px;color:var(--text);font-family:Cairo,sans-serif;font-size:12px;font-weight:700;flex-shrink:0"
        >
          <option value="morning" ${(emp.shift || 'morning') === 'morning' ? 'selected' : ''}>🌅 ${ar ? 'صباحي' : 'Morning'}</option>
          <option value="evening" ${emp.shift === 'evening' ? 'selected' : ''}>🌙 ${ar ? 'مسائي' : 'Evening'}</option>
        </select>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = `<div style="color:var(--red);font-size:12px">Error: ${e.message}</div>`;
  }
}

async function updateEmpShift(empId, shift) {
  const ar = window.currentLang === 'ar';
  try {
    await window.dbPatch('employees', { shift }, `?id=eq.${empId}`);
    const emp = (window.allEmployees || []).find(e => Number(e.id) === Number(empId));
    if (emp) emp.shift = shift;
    notify(ar ? '✅ تم تحديث الشيفت' : '✅ Shift updated', 'success');
  } catch (e) {
    notify('Error: ' + e.message, 'error');
  }
}

async function loadTLMyTeamSettings() {
  const el = document.getElementById('tl-myteam-list');
  if (!el) return;

  const ar = window.currentLang === 'ar';
  el.innerHTML = `<div style="text-align:center;padding:16px"><div class="loader"></div></div>`;

  try {
    const teamRes = await window.dbGet(
      'manager_teams',
      `?manager_id=eq.${window.currentUser.id}&select=employee_id`
    ).catch(() => []) || [];

    const teamIds = teamRes.map(r => Number(r.employee_id)).filter(Boolean);

    if (!teamIds.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">${ar ? 'لا يوجد موظفون في فريقك' : 'No team members'}</div>`;
      return;
    }

    const emps = await window.dbGet('employees', '?select=*') || [];
    const myTeam = emps.filter(e => teamIds.includes(Number(e.id)));

    const today = typeof window.todayStr === 'function' ? window.todayStr() : '';
    const attToday = await window.dbGet(
      'attendance',
      `?date=eq.${today}&select=employee_id,check_in,check_out,late_minutes`
    ).catch(() => []) || [];

    const attMap = {};
    attToday.forEach(a => { attMap[Number(a.employee_id)] = a; });

    if (!myTeam.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">${ar ? 'لا يوجد موظفون' : 'No team members'}</div>`;
      return;
    }

    el.innerHTML = myTeam.map(emp => {
      const att = attMap[Number(emp.id)];
      const shiftLabel = emp.shift === 'evening'
        ? (ar ? '🌙 مسائي' : '🌙 Eve')
        : (ar ? '🌅 صباحي' : '🌅 Mor');

      const attBadge = att
        ? (
            att.check_out
              ? `<span class="badge badge-blue" style="font-size:9px">${ar ? 'خرج' : 'Out'} ${att.check_out}</span>`
              : `<span class="badge badge-green" style="font-size:9px">${ar ? 'حاضر' : 'In'} ${att.check_in || ''}${att.late_minutes > 0 ? ' ⚠️' : ''}</span>`
          )
        : `<span class="badge badge-yellow" style="font-size:9px;background:rgba(255,59,59,.15);color:var(--red)">${ar ? 'غائب' : 'Absent'}</span>`;

      return `
        <div class="emp-card" style="margin-bottom:8px">
          <div class="emp-avatar" style="overflow:hidden;flex-shrink:0">
            ${emp.profile_photo
              ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">`
              : ((emp.name || '?')[0]).toUpperCase()}
          </div>

          <div class="emp-info" style="flex:1;min-width:0">
            <div class="emp-name">${emp.name || '-'}</div>
            <div class="emp-branch" style="font-size:10px">${shiftLabel}${emp.branch ? ' · ' + emp.branch : ''}</div>
          </div>

          ${attBadge}
        </div>
      `;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div style="color:var(--red);font-size:12px">Error: ${e.message}</div>`;
  }
}

function getShiftLabel(shift, lang) {
  const ar = lang === 'ar';
  if (shift === 'evening') return ar ? '🌙 مسائي (2م - 10م)' : '🌙 Evening (2PM - 10PM)';
  return ar ? '🌅 صباحي (10ص - 6م)' : '🌅 Morning (10AM - 6PM)';
}

// ─────────────────────────────
// PRODUCT DETAILS
// ─────────────────────────────
function showProductEmployees(productName) {
  const ar = window.currentLang === 'ar';
  const sales = (window._productSalesData || []).filter(s => s.product_name === productName);
  const emps = window._allEmpsData || [];

  const empMap = {};
  emps.forEach(e => { empMap[Number(e.id)] = e; });

  const byEmp = {};
  sales.forEach(s => {
    const empId = Number(s.employee_id);
    if (!byEmp[empId]) {
      byEmp[empId] = {
        name: empMap[empId]?.name || s.employee_id,
        qty: 0,
        total: 0
      };
    }
    byEmp[empId].qty += Number(s.quantity || 0);
    byEmp[empId].total += Number(s.total_amount || 0);
  });

  const sorted = Object.values(byEmp).sort((a, b) => b.qty - a.qty);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:75vh;overflow-y:auto;border-top:2px solid var(--green)">
      <div style="font-size:15px;font-weight:800;margin-bottom:4px;direction:ltr">${productName}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">${ar ? 'مبيعات الموظفين' : 'Employee Sales'}</div>

      ${sorted.length === 0
        ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا توجد مبيعات' : 'No sales'}</div>`
        : sorted.map((e, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:26px;font-size:13px;font-weight:800;color:var(--muted);text-align:center">${i + 1}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700">${e.name}</div>
            </div>
            <div style="text-align:left">
              <div style="font-size:14px;font-weight:800;color:var(--green)">${e.qty} ${ar ? 'قطعة' : 'pcs'}</div>
              <div style="font-size:10px;color:var(--muted)">EGP ${window.fmtEGP ? window.fmtEGP(e.total) : e.total}</div>
            </div>
          </div>
        `).join('')
      }

      <button onclick="this.closest('[style*=fixed]').remove()"
        style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">
        ${ar ? 'إغلاق' : 'Close'}
      </button>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─────────────────────────────
// PHOTO SOURCE — CAMERA ONLY
// ─────────────────────────────
function showPhotoSourceModal(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.setAttribute('capture', 'environment');
  input.click();
}

// ─────────────────────────────
// NAV DIRECTION
// ─────────────────────────────
function fixNavDirection() {
  const isAr = (window.currentLang || 'ar') === 'ar';
  document.querySelectorAll('.bottom-nav').forEach(nav => {
    nav.style.direction = isAr ? 'rtl' : 'ltr';
  });
}

// ─────────────────────────────
// EXPOSE GLOBALS
// ─────────────────────────────
Object.assign(window, {
  empTab,
  adminTab,
  showErr,
  notify,
  openModal,
  closeModal,
  toggleAcc,
  viewSelfie,
  fullSelfie,
  uploadProfilePhoto,
  loadProfilePhoto,
  loadSettingsEmpList,
  loadQ1Analytics,
  loadShiftSettings,
  updateEmpShift,
  loadTLMyTeamSettings,
  getShiftLabel,
  showPresentEmployees,
  showAbsentEmployees,
  showProductEmployees,
  showPhotoSourceModal,
  fixNavDirection
});
// ─────────────────────────────
// HOTFIX: recover broken navigation / settings leakage
// Paste at END of src/modules/ui.js
// ─────────────────────────────
(function () {
  function roleOfSafe() {
    if (typeof window.normalizeRole === 'function') {
      return window.normalizeRole(window.currentUser?.role);
    }
    return String(window.currentUser?.role || '').trim().toLowerCase();
  }

  function isTLSafe() {
    return roleOfSafe() === 'team_leader';
  }

  function isAdminLikeSafe() {
    return ['admin', 'super_admin'].includes(roleOfSafe());
  }

  function showEl(el, display = 'block') {
    if (el) el.style.display = display;
  }

  function hideEl(el) {
    if (el) el.style.display = 'none';
  }

  function safeCall(fn, ...args) {
    if (typeof window[fn] === 'function') {
      try { return window[fn](...args); } catch (e) { console.error(fn, e); }
    }
  }

  function hideAdminSections() {
    [
      'admin-dashboard',
      'admin-attendance',
      'admin-employees',
      'admin-branches',
      'admin-reports',
      'admin-settings',
      'admin-visits',
      'admin-chat'
    ].forEach(id => hideEl(document.getElementById(id)));
  }

  function hideEmpSections() {
    [
      'emp-home',
      'emp-sales',
      'emp-visits',
      'emp-display',
      'emp-profile',
      'emp-chat',
      'emp-specs'
    ].forEach(id => hideEl(document.getElementById(id)));
  }

  function deactivateNav(scope) {
    document.querySelectorAll(scope + ' .nav-item').forEach(n => n.classList.remove('active'));
  }

  function cleanupSettingsState() {
    // اخفاء أي عناصر مؤقتة أو خاصة بالإعدادات خارج تاب settings
    const settings = document.getElementById('admin-settings');
    if (!settings) return;

    // خفّي كل accordion bodies ما عدا لما ندخل settings
    settings.querySelectorAll('.acc-body').forEach(b => {
      b.style.display = 'none';
    });

    settings.querySelectorAll('.acc-arrow').forEach(a => {
      a.classList.remove('open');
    });
  }

  function prepareSettingsUI() {
    const settings = document.getElementById('admin-settings');
    if (!settings) return;

    const allItems = settings.querySelectorAll('.acc-item');
    allItems.forEach(item => {
      item.style.display = '';
    });

    // قسم "فريقي" للتيم ليدر فقط
    let tlSection = document.getElementById('tl-team-acc-item');
    if (isTLSafe()) {
      if (!tlSection) {
        tlSection = document.createElement('div');
        tlSection.id = 'tl-team-acc-item';
        tlSection.className = 'acc-item';
        tlSection.innerHTML = `
          <div class="acc-hdr" onclick="toggleAcc('acc-tl-myteam')">
            <span>👥 فريقي</span>
            <span class="acc-arrow" id="acc-tl-myteam-arrow">▼</span>
          </div>
          <div class="acc-body" id="acc-tl-myteam" style="display:none">
            <div style="font-size:12px;color:var(--muted);margin-bottom:10px">الموظفون المسجلون في فريقك</div>
            <div id="tl-myteam-list">
              <div style="text-align:center;padding:16px"><div class="loader"></div></div>
            </div>
          </div>
        `;
        settings.prepend(tlSection);
      } else {
        tlSection.style.display = '';
      }

      // أخفي باقي الإعدادات غير المطلوبة للتيم ليدر
      allItems.forEach(item => item.style.display = 'none');
      tlSection.style.display = '';
      safeCall('loadTLMyTeamSettings');
    } else {
      if (tlSection) tlSection.style.display = 'none';
    }

    // إدارة الشيفتات للإدمن فقط
    let shiftSection = document.getElementById('acc-shifts-item');
    if (isAdminLikeSafe()) {
      if (!shiftSection) {
        shiftSection = document.createElement('div');
        shiftSection.id = 'acc-shifts-item';
        shiftSection.className = 'acc-item';
        shiftSection.innerHTML = `
          <div class="acc-hdr" onclick="toggleAcc('acc-shifts')">
            <span>🌗 إدارة الشيفتات</span>
            <span class="acc-arrow" id="acc-shifts-arrow">▼</span>
          </div>
          <div class="acc-body" id="acc-shifts" style="display:none">
            <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
              🌅 صباحي: 10:00 – 18:00 | 🌙 مسائي: 14:00 – 22:00
            </div>
            <div id="shift-settings-list">
              <div style="text-align:center;padding:16px"><div class="loader"></div></div>
            </div>
          </div>
        `;
        settings.appendChild(shiftSection);
      } else {
        shiftSection.style.display = '';
      }
    } else {
      if (shiftSection) shiftSection.style.display = 'none';
    }

    cleanupSettingsState();
  }

  function prepareReportsUI() {
    const reportTabsWrap = document.getElementById('report-tabs');
    if (!reportTabsWrap) return;

    const tabs = reportTabsWrap.querySelectorAll('.tab');
    if (!tabs.length) return;

    if (isTLSafe()) {
      tabs.forEach(t => {
        const oc = t.getAttribute('onclick') || '';
        t.style.display = oc.includes('visits') ? '' : 'none';
      });

      const visTab = reportTabsWrap.querySelector('.tab[onclick*="visits"]');
      if (visTab) visTab.click();
    } else {
      tabs.forEach(t => t.style.display = '');
    }
  }

  function restoreTopArea() {
    // لو فيه هيدر / شريط علوي اختفى بسبب display none
    [
      '.topbar',
      '.page-header',
      '.screen-header',
      '.admin-top',
      '.emp-top',
      '.sh'
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.style.display === 'none') el.style.display = '';
      });
    });
  }

  function empTabFixed(tab, el) {
    hideEmpSections();
    deactivateNav('#emp-app');

    const target = document.getElementById('emp-' + tab);
    showEl(target, 'block');
    if (el) el.classList.add('active');

    restoreTopArea();

    if (tab === 'sales') {
      safeCall('renderProducts');
      safeCall('loadTodaySales');
    }

    if (tab === 'profile') {
      const nameEl = document.getElementById('profile-name');
      const branchEl = document.getElementById('profile-branch');
      if (nameEl) nameEl.textContent = window.currentUser?.name || '-';
      if (branchEl) branchEl.textContent = window.currentUser?.branch || '-';
      safeCall('loadEmpMonthlyReport');
      safeCall('loadEmpDailyLog');
      safeCall('loadProfilePhoto');
    }

    if (tab === 'home') safeCall('loadModelTargetAlert');
    if (tab === 'visits') safeCall('loadVisitsTab');
    if (tab === 'display') safeCall('loadDisplayTab');
    if (tab === 'chat') safeCall('loadChatUI');
    if (tab === 'specs') safeCall('renderSpecsList');

    if (typeof window.applyLang === 'function') window.applyLang();
  }

  function adminTabFixed(tab, el) {
    hideAdminSections();
    deactivateNav('#admin-app');

    const target = document.getElementById('admin-' + tab);
    showEl(target, 'block');
    if (el) el.classList.add('active');

    restoreTopArea();

    // مهم: أول ما نخرج من settings ننضف حالة الإعدادات
    if (tab !== 'settings') {
      cleanupSettingsState();
    }

    if (tab === 'dashboard') safeCall('loadAdminDashboard');
    if (tab === 'attendance') safeCall('loadAdminAttendanceTab');
    if (tab === 'employees') safeCall('loadAllEmployees');
    if (tab === 'branches') safeCall('initBranchDashboard');
    if (tab === 'visits') safeCall('loadTLVisitsTab');
    if (tab === 'chat') safeCall('loadAdminChatList');

    if (tab === 'settings') {
      prepareSettingsUI();
    }

    if (tab === 'reports') {
      safeCall('loadAllEmployees');
      setTimeout(prepareReportsUI, 50);
    }

    if (typeof window.applyLang === 'function') window.applyLang();
  }

  function toggleAccFixed(id) {
    const body = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!body) return;

    const isHidden = getComputedStyle(body).display === 'none';

    // اقفل باقي الأكوردينز داخل نفس settings لتحسين السلوك
    const settings = document.getElementById('admin-settings');
    if (settings && isHidden) {
      settings.querySelectorAll('.acc-body').forEach(b => {
        if (b.id !== id) b.style.display = 'none';
      });
      settings.querySelectorAll('.acc-arrow').forEach(a => {
        if (a.id !== id + '-arrow') a.classList.remove('open');
      });
    }

    body.style.display = isHidden ? 'block' : 'none';
    if (arrow) arrow.classList.toggle('open', isHidden);

    if (!isHidden) return;

    if (id === 'acc-branches') safeCall('loadBranches');
    if (id === 'acc-products') safeCall('loadProductsSettings');
    if (id === 'acc-targets') safeCall('loadTargetsList');
    if (id === 'acc-admins') safeCall('loadAdminsList');
    if (id === 'acc-team') safeCall('loadSettingsEmpList');
    if (id === 'acc-shifts') safeCall('loadShiftSettings');
    if (id === 'acc-tl-myteam') safeCall('loadTLMyTeamSettings');
  }

  // Override globals
  window.empTab = empTabFixed;
  window.adminTab = adminTabFixed;
  window.toggleAcc = toggleAccFixed;

  // شغّل استرجاع سريع للواجهة الحالية
  setTimeout(() => {
    restoreTopArea();

    // لو مفيش أي تاب ظاهر، افتح dashboard/admin أو home/emp حسب التطبيق الحالي
    const adminApp = document.getElementById('admin-app');
    const empApp = document.getElementById('emp-app');

    const adminVisible = ['dashboard','attendance','employees','branches','reports','settings','visits','chat']
      .some(t => {
        const el = document.getElementById('admin-' + t);
        return el && getComputedStyle(el).display !== 'none';
      });

    const empVisible = ['home','sales','visits','display','profile','chat','specs']
      .some(t => {
        const el = document.getElementById('emp-' + t);
        return el && getComputedStyle(el).display !== 'none';
      });

    if (adminApp && getComputedStyle(adminApp).display !== 'none' && !adminVisible) {
      window.adminTab('dashboard');
    }

    if (empApp && getComputedStyle(empApp).display !== 'none' && !empVisible) {
      window.empTab('home');
    }
  }, 30);
})();
