// ═══════════════════════════════════════════════════════════
// src/modules/admin/visits.js — Branch visits
// Employee: upload own visits
// Team Leader: upload own visits
// Admin/Superadmin: review all visits only
// ═══════════════════════════════════════════════════════════

let visitPhotos = [];
let tlVisitPhotos = [];

// ── HELPERS ───────────────────────────────────────────────
function _vId(id) {
  return document.getElementById(id);
}

function _vLangAr() {
  return (window.currentLang || 'ar') === 'ar';
}

function _vNotify(arMsg, enMsg, type = 'info') {
  if (typeof window.notify === 'function') {
    window.notify(_vLangAr() ? arMsg : enMsg, type);
  }
}

function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function _normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();

  if (!r) return 'employee';
  if (r === 'super_admin') return 'superadmin';
  if (r === 'superadmin') return 'superadmin';
  if (r === 'manager') return 'admin';
  if (r === 'viewer') return 'admin';
  if (r === 'admin') return 'admin';
  if (r === 'teamleader') return 'team_leader';
  if (r === 'team_leader') return 'team_leader';
  if (r === 'employee') return 'employee';

  return r;
}

function _isEmployeeUser() {
  return _normalizeRole(window.currentUser?.role) === 'employee';
}

function _isTeamLeaderUser() {
  return _normalizeRole(window.currentUser?.role) === 'team_leader';
}

function _isAdminReviewUser() {
  const r = _normalizeRole(window.currentUser?.role);
  return r === 'admin' || r === 'superadmin';
}

function _ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

function _dedupeById(rows) {
  const map = new Map();
  _ensureArray(rows).forEach(r => {
    const key = r?.id != null ? String(r.id) : JSON.stringify(r);
    if (!map.has(key)) map.set(key, r);
  });
  return [...map.values()];
}

function _sortVisitsDesc(rows) {
  return _ensureArray(rows).sort((a, b) => {
    const ad = String(a?.visit_date || '');
    const bd = String(b?.visit_date || '');
    if (ad === bd) {
      return String(b?.created_at || '').localeCompare(String(a?.created_at || ''));
    }
    return bd.localeCompare(ad);
  });
}

function _setCameraAttrs(input) {
  if (!input) return;
  input.setAttribute('accept', 'image/*');
  input.setAttribute('capture', 'environment');
}

function _extractBranchName(row) {
  if (!row || typeof row !== 'object') return '';
  const candidates = [
    row.name,
    row.branch_name,
    row.title,
    row.branch,
    row.branchName,
    row.name_ar,
    row.name_en,
    row.label
  ];

  for (const v of candidates) {
    const s = String(v || '').trim();
    if (s) return s;
  }
  return '';
}

async function _ensureBranchesLoaded() {
  if (Array.isArray(window.allBranches) && window.allBranches.length > 0) {
    return window.allBranches;
  }

  if (typeof window.loadBranches === 'function') {
    try {
      await window.loadBranches();
    } catch (e) {
      console.warn('[loadBranches]', e);
    }
  }

  if (Array.isArray(window.allBranches) && window.allBranches.length > 0) {
    return window.allBranches;
  }

  try {
    const direct = await dbGet('branches', '?select=*').catch(() => []);
    if (Array.isArray(direct)) {
      window.allBranches = direct;
      return direct;
    }
  } catch (e) {
    console.warn('[branches direct fetch]', e);
  }

  window.allBranches = [];
  return [];
}

function _uniqueBranchNames(rows) {
  const set = new Set();
  _ensureArray(rows).forEach(r => {
    const n = _extractBranchName(r);
    if (n) set.add(n);
  });
  return [...set];
}

function _clearVisitForm() {
  const branchEl = _vId('visit-branch-select');
  const noteEl = _vId('visit-note-input');
  if (branchEl) branchEl.value = '';
  if (noteEl) noteEl.value = '';
}

function _clearTLVisitForm() {
  const branchEl = _vId('tl-visit-branch');
  const noteEl = _vId('tl-visit-note');
  if (branchEl) branchEl.value = '';
  if (noteEl) noteEl.value = '';
}

function _renderPhotosCount(targetArr, zoneId) {
  const zone = _vId(zoneId);
  if (zone) zone.style.display = targetArr.length >= 3 ? 'none' : 'block';
}

function _safeFullImage(src) {
  if (!src) return;

  if (typeof window.fullSelfie === 'function') {
    window.fullSelfie(src);
    return;
  }

  window.open(src, '_blank');
}

function _disableEl(id, hide = false) {
  const el = _vId(id);
  if (!el) return;
  if ('disabled' in el) el.disabled = true;
  el.style.pointerEvents = 'none';
  if (hide) el.style.display = 'none';
}

function _enableEl(id) {
  const el = _vId(id);
  if (!el) return;
  if ('disabled' in el) el.disabled = false;
  el.style.pointerEvents = '';
  el.style.display = '';
}

function _hideEmployeeUploadUI() {
  [
    'visit-branch-select',
    'visit-note-input',
    'visit-upload-zone',
    'visit-camera-input'
  ].forEach(id => _disableEl(id, id !== 'visit-photo-previews'));

  document.querySelectorAll(
    '[onclick*="submitVisit"], [onclick*="openVisitCamera"], [onclick*="showPhotoSourceModal(\'visit-camera-input"], [onclick*="showPhotoSourceModal(\'visit-input"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.display = 'none';
  });
}

function _showEmployeeUploadUI() {
  [
    'visit-branch-select',
    'visit-note-input',
    'visit-upload-zone',
    'visit-camera-input'
  ].forEach(_enableEl);

  document.querySelectorAll(
    '[onclick*="submitVisit"], [onclick*="openVisitCamera"], [onclick*="showPhotoSourceModal(\'visit-camera-input"], [onclick*="showPhotoSourceModal(\'visit-input"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.display = '';
  });
}

function _hideTLUploadUI() {
  [
    'tl-visit-branch',
    'tl-visit-note',
    'tl-visit-zone',
    'tl-visit-previews',
    'tl-visit-input'
  ].forEach(id => _disableEl(id, id !== 'tl-visit-previews'));

  document.querySelectorAll(
    '#admin-visits [onclick*="submitTLVisit"], #admin-visits [onclick*="openTLVisitCamera"], #admin-visits [onclick*="showPhotoSourceModal"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.display = 'none';
  });
}

function _showTLUploadUI() {
  [
    'tl-visit-branch',
    'tl-visit-note',
    'tl-visit-zone',
    'tl-visit-previews',
    'tl-visit-input'
  ].forEach(_enableEl);

  document.querySelectorAll(
    '#admin-visits [onclick*="submitTLVisit"], #admin-visits [onclick*="openTLVisitCamera"], #admin-visits [onclick*="showPhotoSourceModal"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.display = '';
  });
}

function _applyReviewOnlyMode() {
  _hideEmployeeUploadUI();
  _hideTLUploadUI();
}

function _applyEmployeeMode() {
  _showEmployeeUploadUI();
}

function _applyTeamLeaderMode() {
  _hideEmployeeUploadUI();
  _showTLUploadUI();
}

function _visitCard(v, showOwner = false) {
  const photos = [v.photo1, v.photo2, v.photo3].filter(Boolean);

  return `
    <div class="visit-card">
      <div class="visit-header">
        <div>
          <div class="visit-branch-name">🏪 ${_escapeHtml(v.branch_name || '-')}</div>
          <div class="visit-meta">${_escapeHtml(v.visit_date || '-')}</div>
          ${showOwner ? `<div class="visit-meta" style="margin-top:4px;color:var(--green)">👤 ${_escapeHtml(v.employee_name || '-')}</div>` : ''}
        </div>
        <span class="badge badge-green">${photos.length} 📷</span>
      </div>
      ${v.note ? `<div class="visit-note">📝 ${_escapeHtml(v.note)}</div>` : ''}
      ${
        photos.length
          ? `<div class="visit-photos-row">
              ${photos.map(src => `<img class="visit-photo" src="${src}" onclick="openVisitImagePreview('${String(src).replace(/'/g, "\\'")}')">`).join('')}
            </div>`
          : ''
      }
    </div>
  `;
}

// ── IMAGE COMPRESSION ─────────────────────────────────────
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    try {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('Invalid image file'));
        return;
      }

      const reader = new FileReader();

      reader.onload = ev => {
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxW = 560;
            const maxH = 560;
            const ratio = Math.min(1, maxW / img.width, maxH / img.height);

            canvas.width = Math.max(1, Math.round(img.width * ratio));
            canvas.height = Math.max(1, Math.round(img.height * ratio));

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context failed'));
              return;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.35));
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Image load failed'));
        img.src = ev.target.result;
      };

      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
}

// ── INPUTS ────────────────────────────────────────────────
function _ensureEmployeeVisitInput() {
  let input = _vId('visit-camera-input');

  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'visit-camera-input';
    input.style.display = 'none';
    input.onchange = addVisitPhoto;
    document.body.appendChild(input);
  }

  _setCameraAttrs(input);
  return input;
}

function _ensureTLVisitInput() {
  let input = _vId('tl-visit-input');

  if (input) {
    _setCameraAttrs(input);
    return input;
  }

  input = document.createElement('input');
  input.type = 'file';
  input.id = 'tl-visit-input';
  input.style.display = 'none';
  input.onchange = addTLVisitPhoto;
  _setCameraAttrs(input);
  document.body.appendChild(input);

  return input;
}

// ── CAMERA ENTRY ──────────────────────────────────────────
function openVisitCamera() {
  if (!_isEmployeeUser()) {
    _vNotify('هذا الجزء للمراجعة فقط وليس للرفع', 'This section is review only, not upload', 'info');
    return;
  }

  const input = _ensureEmployeeVisitInput();

  if (visitPhotos.length >= 3) {
    _vNotify('الحد الأقصى 3 صور', 'Maximum 3 photos', 'error');
    return;
  }

  input.value = '';
  input.click();
}

function openTLVisitCamera() {
  if (!_isTeamLeaderUser()) {
    _vNotify('هذا الجزء للمراجعة فقط وليس للرفع', 'This section is review only, not upload', 'info');
    return;
  }

  const input = _ensureTLVisitInput();

  if (tlVisitPhotos.length >= 3) {
    _vNotify('الحد الأقصى 3 صور', 'Maximum 3 photos', 'error');
    return;
  }

  input.value = '';
  input.click();
}

function showPhotoSourceModal(inputId) {
  if (inputId === 'tl-visit-input') {
    openTLVisitCamera();
    return;
  }

  if (inputId === 'visit-camera-input' || inputId === 'visit-input') {
    openVisitCamera();
    return;
  }

  const input = _vId(inputId);
  if (input) {
    _setCameraAttrs(input);
    input.value = '';
    input.click();
  }
}

function isValidCameraImage(file) {
  return !!(file && file.type && file.type.startsWith('image/'));
}

// ── EMPLOYEE VISITS ───────────────────────────────────────
async function populateVisitBranchSelect() {
  const rows = await _ensureBranchesLoaded();
  const sel = _vId('visit-branch-select');
  if (!sel) return;

  const branches = _uniqueBranchNames(rows);
  sel.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    branches.map(name => `<option value="${_escapeHtml(name)}">${_escapeHtml(name)}</option>`).join('');
}

async function addVisitPhoto(e) {
  if (!_isEmployeeUser()) {
    if (e?.target) e.target.value = '';
    _vNotify('هذا الجزء للمراجعة فقط وليس للرفع', 'This section is review only, not upload', 'info');
    return;
  }

  const input = e?.target;
  const file = input?.files && input.files[0];

  if (visitPhotos.length >= 3) {
    if (input) input.value = '';
    _vNotify('الحد الأقصى 3 صور', 'Maximum 3 photos', 'error');
    return;
  }

  if (!file) {
    if (input) input.value = '';
    return;
  }

  if (!isValidCameraImage(file)) {
    if (input) input.value = '';
    _vNotify('يجب اختيار صورة صحيحة', 'Please choose a valid image', 'error');
    return;
  }

  try {
    const compressed = await compressImageFile(file);
    visitPhotos.push(compressed);
    renderVisitPhotoPreviews();
  } catch (e) {
    console.error('[addVisitPhoto]', e);
    _vNotify(
      `تعذر معالجة الصورة: ${e?.message || 'خطأ غير معروف'}`,
      `Failed to process image: ${e?.message || 'Unknown error'}`,
      'error'
    );
  } finally {
    if (input) input.value = '';
  }
}

function renderVisitPhotoPreviews() {
  const el = _vId('visit-photo-previews');
  if (!el) return;

  el.innerHTML = visitPhotos.map((src, i) => `
    <div class="photo-preview-wrap">
      <img src="${src}" alt="">
      <button class="photo-preview-del" onclick="removeVisitPhoto(${i})">✕</button>
    </div>
  `).join('');

  _renderPhotosCount(visitPhotos, 'visit-upload-zone');
}

function removeVisitPhoto(i) {
  if (!_isEmployeeUser()) {
    _vNotify('هذا الجزء للمشاهدة فقط', 'This section is view only', 'info');
    return;
  }

  if (i < 0 || i >= visitPhotos.length) return;
  visitPhotos.splice(i, 1);
  renderVisitPhotoPreviews();
}

async function submitVisit() {
  if (!_isEmployeeUser()) {
    _vNotify('هذا الجزء للمراجعة فقط وليس للرفع', 'This section is review only, not upload', 'info');
    return;
  }

  const branch = (_vId('visit-branch-select')?.value || '').trim();
  const note = (_vId('visit-note-input')?.value || '').trim();

  if (!window.currentUser) {
    _vNotify('يجب تسجيل الدخول أولاً', 'You must login first', 'error');
    return;
  }

  if (!branch) {
    _vNotify('اختر الفرع', 'Select branch', 'error');
    return;
  }

  if (!visitPhotos.length) {
    _vNotify('أضف صورة واحدة على الأقل', 'Add at least one photo', 'error');
    return;
  }

  const basePayload = {
    employee_name: currentUser.name || null,
    branch_name: branch,
    note: note || null,
    photo1: visitPhotos[0] || null,
    photo2: visitPhotos[1] || null,
    photo3: visitPhotos[2] || null,
    visit_date: typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10)
  };

  const tries = [];
  const numericId = Number(currentUser.id);

  if (!Number.isNaN(numericId) && Number.isFinite(numericId)) {
    tries.push({ ...basePayload, employee_id: numericId });
  }

  tries.push({ ...basePayload, employee_id: currentUser.id });
  tries.push({ ...basePayload });

  let lastErr = null;

  for (const payload of tries) {
    try {
      await dbPost('branch_visits', payload);

      _vNotify('تم حفظ الزيارة ✅', 'Visit saved ✅', 'success');
      visitPhotos = [];
      renderVisitPhotoPreviews();
      _clearVisitForm();
      await loadVisitsTab();
      return;
    } catch (e) {
      console.error('[submitVisit try failed]', payload, e);
      lastErr = e;
    }
  }

  const msg = String(lastErr?.message || '');
  _vNotify(
    `تعذر حفظ الزيارة: ${msg || 'خطأ غير معروف'}`,
    `Failed to save visit: ${msg || 'Unknown error'}`,
    'error'
  );
}

async function loadVisitsTab() {
  if (!window.currentUser) return;
  if (!_isEmployeeUser()) {
    _applyReviewOnlyMode();
    return;
  }

  _applyEmployeeMode();
  await populateVisitBranchSelect();

  const pm = getPayrollMonth();
  const visits = await dbGet(
    'branch_visits',
    `?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
  ).catch(() => []) || [];

  const done = visits.length;
  const remain = Math.max(0, 150 - done);
  const photoCount = visits.reduce((sum, v) => {
    let c = 0;
    if (v.photo1) c++;
    if (v.photo2) c++;
    if (v.photo3) c++;
    return sum + c;
  }, 0);

  const visDone = _vId('vis-done');
  const visRem = _vId('vis-remain');
  const visPhotos = _vId('vis-photos');
  const cnt = _vId('emp-visits-count');

  if (visDone) visDone.textContent = done;
  if (visRem) visRem.textContent = remain;
  if (visPhotos) visPhotos.textContent = photoCount;
  if (cnt) cnt.textContent = `${done} / 150`;

  const el = _vId('visit-history-list');
  if (!el) return;

  if (!visits.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📸</div>${_vLangAr() ? 'لا توجد زيارات هذا الشهر' : 'No visits this month'}</div>`;
    return;
  }

  el.innerHTML = _sortVisitsDesc(visits).map(v => _visitCard(v, false)).join('');
}

// ── CLEAR OLD VISIT PHOTOS ────────────────────────────────
async function clearOldVisitPhotos() {
  const cutoff = fmtDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
  const old = await dbGet('branch_visits', `?visit_date=lt.${cutoff}&select=id`).catch(() => []) || [];
  if (!old.length) return;

  for (const r of old) {
    await dbPatch('branch_visits', {
      photo1: null,
      photo2: null,
      photo3: null
    }, `?id=eq.${r.id}`).catch(() => null);
  }
}

// ── TEAM LEADER / ADMIN TAB ───────────────────────────────
async function _populateTLVisitBranchSelect() {
  const rows = await _ensureBranchesLoaded();
  const sel = _vId('tl-visit-branch');
  if (!sel) return;

  const branches = _uniqueBranchNames(rows);
  sel.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    branches.map(name => `<option value="${_escapeHtml(name)}">${_escapeHtml(name)}</option>`).join('');
}

async function addTLVisitPhoto(e) {
  if (!_isTeamLeaderUser()) {
    if (e?.target) e.target.value = '';
    _vNotify('هذا الجزء للمراجعة فقط وليس للرفع', 'This section is review only, not upload', 'info');
    return;
  }

  const input = e?.target;
  const file = input?.files && input.files[0];

  if (tlVisitPhotos.length >= 3) {
    if (input) input.value = '';
    _vNotify('الحد الأقصى 3 صور', 'Maximum 3 photos', 'error');
    return;
  }

  if (!file) {
    if (input) input.value = '';
    return;
  }

  if (!isValidCameraImage(file)) {
    if (input) input.value = '';
    _vNotify('يجب اختيار صورة صحيحة', 'Please choose a valid image', 'error');
    return;
  }

  try {
    const compressed = await compressImageFile(file);
    tlVisitPhotos.push(compressed);
    renderTLPreviews();
  } catch (e) {
    console.error('[addTLVisitPhoto]', e);
    _vNotify(
      `تعذر معالجة الصورة: ${e?.message || 'خطأ غير معروف'}`,
      `Failed to process image: ${e?.message || 'Unknown error'}`,
      'error'
    );
  } finally {
    if (input) input.value = '';
  }
}

function renderTLPreviews() {
  const el = _vId('tl-visit-previews');
  if (!el) return;

  el.innerHTML = tlVisitPhotos.map((src, i) => `
    <div class="photo-preview-wrap">
      <img src="${src}" alt="">
      <button class="photo-preview-del" onclick="removeTLPhoto(${i})">✕</button>
    </div>
  `).join('');

  _renderPhotosCount(tlVisitPhotos, 'tl-visit-zone');
}

function removeTLPhoto(i) {
  if (!_isTeamLeaderUser()) {
    _vNotify('هذا الجزء للمشاهدة فقط', 'This section is view only', 'info');
    return;
  }

  if (i < 0 || i >= tlVisitPhotos.length) return;
  tlVisitPhotos.splice(i, 1);
  renderTLPreviews();
}

async function submitTLVisit() {
  if (!_isTeamLeaderUser()) {
    _vNotify('هذا الجزء للمراجعة فقط وليس للرفع', 'This section is review only, not upload', 'info');
    return;
  }

  const branch = (_vId('tl-visit-branch')?.value || '').trim();
  const note = (_vId('tl-visit-note')?.value || '').trim();

  if (!window.currentUser) {
    _vNotify('يجب تسجيل الدخول أولاً', 'You must login first', 'error');
    return;
  }

  if (!branch) {
    _vNotify('اختر الفرع', 'Select branch', 'error');
    return;
  }

  if (!tlVisitPhotos.length) {
    _vNotify('أضف صورة واحدة على الأقل', 'Add at least one photo', 'error');
    return;
  }

  const basePayload = {
    employee_name: currentUser.name || null,
    branch_name: branch,
    note: note || null,
    photo1: tlVisitPhotos[0] || null,
    photo2: tlVisitPhotos[1] || null,
    photo3: tlVisitPhotos[2] || null,
    visit_date: typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10)
  };

  const tries = [];
  const numericId = Number(currentUser.id);

  if (!Number.isNaN(numericId) && Number.isFinite(numericId)) {
    tries.push({ ...basePayload, employee_id: numericId });
  }

  tries.push({ ...basePayload, employee_id: currentUser.id });
  tries.push({ ...basePayload });

  let lastErr = null;

  for (const payload of tries) {
    try {
      await dbPost('branch_visits', payload);

      _vNotify('تم حفظ الزيارة ✅', 'Visit saved ✅', 'success');
      tlVisitPhotos = [];
      renderTLPreviews();
      _clearTLVisitForm();
      await loadTLVisitsTab();
      return;
    } catch (e) {
      console.error('[submitTLVisit try failed]', payload, e);
      lastErr = e;
    }
  }

  const msg = String(lastErr?.message || '');
  _vNotify(
    `تعذر حفظ الزيارة: ${msg || 'خطأ غير معروف'}`,
    `Failed to save visit: ${msg || 'Unknown error'}`,
    'error'
  );
}

async function loadTLVisitsTab() {
  if (!window.currentUser) return;

  const page = _vId('admin-visits');
  const nav = _vId('adm-visits-nav');
  const doneEl = _vId('tl-vis-done');
  const remEl = _vId('tl-vis-remain');
  const cntEl = _vId('tl-visit-count');
  const el = _vId('tl-visit-history');

  if (!page || !el) return;

  const role = _normalizeRole(currentUser.role);

  if (nav) nav.style.display = 'flex';
  page.style.display = 'block';

  const pm = getPayrollMonth();
  const allMonthRows = await dbGet(
    'branch_visits',
    `?visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
  ).catch(() => []) || [];

  if (role === 'team_leader') {
    _applyTeamLeaderMode();
    _ensureTLVisitInput();
    await _populateTLVisitBranchSelect();

    const myName = String(currentUser.name || '').trim();
    const myId = String(currentUser.id || '').trim();

    const visits = _sortVisitsDesc(_dedupeById(
      allMonthRows.filter(v =>
        String(v.employee_id || '') === myId ||
        String(v.employee_name || '').trim() === myName
      )
    ));

    const done = visits.length;
    const remain = Math.max(0, 150 - done);

    if (doneEl) doneEl.textContent = done;
    if (remEl) remEl.textContent = remain;
    if (cntEl) cntEl.textContent = `${done} / 150`;

    if (!visits.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📸</div>${_vLangAr() ? 'لا توجد زيارات هذا الشهر' : 'No visits this month'}</div>`;
      return;
    }

    el.innerHTML = visits.map(v => _visitCard(v, false)).join('');
    return;
  }

  if (_isAdminReviewUser()) {
    _applyReviewOnlyMode();

    const title = page.querySelector('.sh .sh-title');
    if (title) {
      title.textContent = _vLangAr() ? '📋 كل الزيارات هذا الشهر' : '📋 All Visits This Month';
    }

    const labels = page.querySelectorAll('.stat-card .stat-label');
    if (labels[0]) labels[0].textContent = _vLangAr() ? 'إجمالي الزيارات' : 'Total Visits';
    if (labels[1]) labels[1].textContent = _vLangAr() ? 'إجمالي الصور' : 'Total Photos';

    const visits = _sortVisitsDesc(_dedupeById(allMonthRows));
    const totalVisits = visits.length;
    const totalPhotos = visits.reduce((s, v) => s + [v.photo1, v.photo2, v.photo3].filter(Boolean).length, 0);

    if (doneEl) doneEl.textContent = totalVisits;
    if (remEl) remEl.textContent = totalPhotos;
    if (cntEl) cntEl.textContent = String(totalVisits);

    if (!visits.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📸</div>${_vLangAr() ? 'لا توجد زيارات هذا الشهر' : 'No visits this month'}</div>`;
      return;
    }

    el.innerHTML = visits.map(v => _visitCard(v, true)).join('');
    return;
  }

  if (nav) nav.style.display = 'none';
  page.style.display = 'none';
}

// ── INIT ──────────────────────────────────────────────────
function initVisitsModule() {
  _ensureEmployeeVisitInput();
  _ensureTLVisitInput();

  if (_isAdminReviewUser()) {
    _applyReviewOnlyMode();
  } else if (_isTeamLeaderUser()) {
    _applyTeamLeaderMode();
  } else if (_isEmployeeUser()) {
    _applyEmployeeMode();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisitsModule);
} else {
  initVisitsModule();
}

// ── GLOBALS ───────────────────────────────────────────────
window.populateVisitBranchSelect = populateVisitBranchSelect;
window.addVisitPhoto = addVisitPhoto;
window.renderVisitPhotoPreviews = renderVisitPhotoPreviews;
window.removeVisitPhoto = removeVisitPhoto;
window.submitVisit = submitVisit;
window.loadVisitsTab = loadVisitsTab;
window.clearOldVisitPhotos = clearOldVisitPhotos;

window.addTLVisitPhoto = addTLVisitPhoto;
window.renderTLPreviews = renderTLPreviews;
window.removeTLPhoto = removeTLPhoto;
window.submitTLVisit = submitTLVisit;
window.loadTLVisitsTab = loadTLVisitsTab;

window.openVisitCamera = openVisitCamera;
window.openTLVisitCamera = openTLVisitCamera;
window.showPhotoSourceModal = showPhotoSourceModal;
window.openVisitImagePreview = _safeFullImage;
