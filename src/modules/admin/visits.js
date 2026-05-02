// ═══════════════════════════════════════════════════════════
// modules/admin/visits.js — Branch visits (regular + TL)
// Provides globals: populateVisitBranchSelect, addVisitPhoto,
//   renderVisitPhotoPreviews, removeVisitPhoto, submitVisit, loadVisitsTab,
//   clearOldVisitPhotos, addTLVisitPhoto, renderTLPreviews, removeTLPhoto,
//   submitTLVisit, loadTLVisitsTab
// Compatibility globals: openVisitCamera, openTLVisitCamera, showPhotoSourceModal
// Module state: visitPhotos, tlVisitPhotos
// ═══════════════════════════════════════════════════════════

let visitPhotos = [];
let tlVisitPhotos = [];

// ── HELPERS ──────────────────────────────────────────────
function _vRole() {
  const r = String(currentUser?.role || '').trim().toLowerCase();

  if (r === 'superadmin' || r === 'super_admin') return 'super_admin';
  if (r === 'teamleader' || r === 'team_leader') return 'team_leader';
  if (r === 'manager') return 'admin';

  return r;
}

function _isEmployeeUser() {
  return _vRole() === 'employee';
}

function _isTeamLeaderUser() {
  return _vRole() === 'team_leader';
}

function _isAdminReviewUser() {
  const r = _vRole();
  return r === 'admin' || r === 'super_admin';
}

function _isVisitUploader() {
  return _isEmployeeUser() || _isTeamLeaderUser();
}

function _escapeAttr(str) {
  return String(str ?? '').replace(/'/g, "\\'");
}

function _notifyViewOnly() {
  const ar = currentLang === 'ar';
  notify(ar ? 'هذا القسم للمشاهدة فقط' : 'This section is view only', 'error');
}

function _setCameraAttrs(inputEl) {
  if (!inputEl) return;
  inputEl.setAttribute('accept', 'image/*');
  inputEl.setAttribute('capture', 'environment');
}

function _ensureCameraAttrsOnKnownInputs() {
  ['visit-input', 'visit-camera-input', 'tl-visit-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) _setCameraAttrs(el);
  });
}

function _getBranchName(branch) {
  if (!branch) return '';

  return String(
    branch.name ||
    branch.branch_name ||
    branch.title ||
    branch.label ||
    branch.branch ||
    branch.name_ar ||
    branch.name_en ||
    branch.branchName ||
    ''
  ).trim();
}

function _getBranchesSource() {
  try {
    if (Array.isArray(window.allBranches) && window.allBranches.length) {
      return window.allBranches;
    }
  } catch (_) {}

  try {
    if (typeof allBranches !== 'undefined' && Array.isArray(allBranches) && allBranches.length) {
      return allBranches;
    }
  } catch (_) {}

  try {
    if (window.state && Array.isArray(window.state.branches) && window.state.branches.length) {
      return window.state.branches;
    }
  } catch (_) {}

  try {
    if (typeof state !== 'undefined' && Array.isArray(state.branches) && state.branches.length) {
      return state.branches;
    }
  } catch (_) {}

  return [];
}

function _getAllBranchNames() {
  const rows = _getBranchesSource();
  const names = rows.map(_getBranchName).filter(Boolean);
  return [...new Set(names)];
}

function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function _setClosestWrapDisplay(el, show) {
  if (!el) return;
  const wrap = el.closest('.form-group, .field, .input-group, .row, .col, .card, .section');
  if (wrap) {
    wrap.style.display = show ? '' : 'none';
  } else {
    el.style.display = show ? '' : 'none';
  }
}

function _hideEmployeeUploadUI() {
  const branch = document.getElementById('visit-branch-select');
  const note = document.getElementById('visit-note-input');
  const zone = document.getElementById('visit-upload-zone');
  const input = document.getElementById('visit-camera-input') || document.getElementById('visit-input');

  if (branch) {
    branch.disabled = true;
    branch.style.pointerEvents = 'none';
  }
  if (note) {
    note.disabled = true;
    note.style.pointerEvents = 'none';
  }
  if (input) {
    input.disabled = true;
    input.style.pointerEvents = 'none';
  }
  if (zone) zone.style.display = 'none';

  document.querySelectorAll(
    '[onclick*="submitVisit"], [onclick*="openVisitCamera"], [onclick*="showPhotoSourceModal(\'visit"], [onclick*="showPhotoSourceModal(&quot;visit"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.display = 'none';
  });

  _setClosestWrapDisplay(branch, false);
  _setClosestWrapDisplay(note, false);
}

function _showEmployeeUploadUI() {
  const branch = document.getElementById('visit-branch-select');
  const note = document.getElementById('visit-note-input');
  const zone = document.getElementById('visit-upload-zone');
  const input = document.getElementById('visit-camera-input') || document.getElementById('visit-input');

  if (branch) {
    branch.disabled = false;
    branch.style.pointerEvents = '';
  }
  if (note) {
    note.disabled = false;
    note.style.pointerEvents = '';
  }
  if (input) {
    input.disabled = false;
    input.style.pointerEvents = '';
  }

  document.querySelectorAll(
    '[onclick*="submitVisit"], [onclick*="openVisitCamera"], [onclick*="showPhotoSourceModal(\'visit"], [onclick*="showPhotoSourceModal(&quot;visit"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.display = '';
  });

  if (zone) zone.style.display = visitPhotos.length >= 3 ? 'none' : 'block';

  _setClosestWrapDisplay(branch, true);
  _setClosestWrapDisplay(note, true);
}

function _hideTLUploadUI() {
  const branch = document.getElementById('tl-visit-branch');
  const note = document.getElementById('tl-visit-note');
  const zone = document.getElementById('tl-visit-zone');
  const input = document.getElementById('tl-visit-input');

  if (branch) {
    branch.disabled = true;
    branch.style.pointerEvents = 'none';
  }
  if (note) {
    note.disabled = true;
    note.style.pointerEvents = 'none';
  }
  if (input) {
    input.disabled = true;
    input.style.pointerEvents = 'none';
  }
  if (zone) zone.style.display = 'none';

  document.querySelectorAll(
    '[onclick*="submitTLVisit"], [onclick*="openTLVisitCamera"], [onclick*="showPhotoSourceModal(\'tl-visit-input"], [onclick*="showPhotoSourceModal(&quot;tl-visit-input"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.display = 'none';
  });

  _setClosestWrapDisplay(branch, false);
  _setClosestWrapDisplay(note, false);
}

function _showTLUploadUI() {
  const branch = document.getElementById('tl-visit-branch');
  const note = document.getElementById('tl-visit-note');
  const zone = document.getElementById('tl-visit-zone');
  const input = document.getElementById('tl-visit-input');

  if (branch) {
    branch.disabled = false;
    branch.style.pointerEvents = '';
    branch.style.display = '';
  }
  if (note) {
    note.disabled = false;
    note.style.pointerEvents = '';
    note.style.display = '';
  }
  if (input) {
    input.disabled = false;
    input.style.pointerEvents = '';
  }

  document.querySelectorAll(
    '[onclick*="submitTLVisit"], [onclick*="openTLVisitCamera"], [onclick*="showPhotoSourceModal(\'tl-visit-input"], [onclick*="showPhotoSourceModal(&quot;tl-visit-input"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.display = '';
  });

  if (zone) zone.style.display = tlVisitPhotos.length >= 3 ? 'none' : 'block';

  _setClosestWrapDisplay(branch, true);
  _setClosestWrapDisplay(note, true);
}

function _setAdminVisitsHeader() {
  const page = document.getElementById('admin-visits');
  if (!page) return;

  const title = page.querySelector('.sh .sh-title');
  if (title) {
    title.textContent = currentLang === 'ar' ? '📋 كل الزيارات هذا الشهر' : '📋 All Visits This Month';
  }

  const labels = page.querySelectorAll('.stat-card .stat-label');
  if (labels[0]) labels[0].textContent = currentLang === 'ar' ? 'إجمالي الزيارات' : 'Total Visits';
  if (labels[1]) labels[1].textContent = currentLang === 'ar' ? 'إجمالي الصور' : 'Total Photos';
}

function _setTLVisitsHeader() {
  const page = document.getElementById('admin-visits');
  if (!page) return;

  const title = page.querySelector('.sh .sh-title');
  if (title) {
    title.textContent = currentLang === 'ar' ? '📋 زياراتي هذا الشهر' : '📋 My Visits This Month';
  }

  const labels = page.querySelectorAll('.stat-card .stat-label');
  if (labels[0]) labels[0].textContent = currentLang === 'ar' ? 'زيارة هذا الشهر' : 'Visits This Month';
  if (labels[1]) labels[1].textContent = currentLang === 'ar' ? 'متبقي' : 'Remaining';
}

function _setEmployeeVisitsHeader() {
  const labels = document.querySelectorAll('.stat-card .stat-label');
  if (labels[0]) labels[0].textContent = currentLang === 'ar' ? 'زيارة هذا الشهر' : 'Visits This Month';
  if (labels[1]) labels[1].textContent = currentLang === 'ar' ? 'متبقي' : 'Remaining';
}

function _renderVisitCard(v, showOwner = false) {
  const photos = [v.photo1, v.photo2, v.photo3].filter(Boolean);
  const owner = v.manager_name || v.employee_name || '';

  return `
    <div class="visit-card">
      <div class="visit-header">
        <div>
          <div class="visit-branch-name">🏪 ${v.branch_name || ''}</div>
          <div class="visit-meta">${v.visit_date || ''}</div>
          ${showOwner && owner ? `<div class="visit-meta">👤 ${owner}</div>` : ''}
        </div>
        <span class="badge badge-green">${photos.length} 📷</span>
      </div>
      ${v.note ? `<div class="visit-note">📝 ${v.note}</div>` : ''}
      ${photos.length ? `
        <div class="visit-photos-row">
          ${photos.map(src => `<img class="visit-photo" src="${src}" onclick="fullSelfie('${_escapeAttr(src)}')">`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ── CAMERA VALIDATION ────────────────────────────────────
function isValidCameraImage(file, inputEl) {
  if (!file) return false;
  if (!file.type || !file.type.startsWith('image/')) return false;

  const capture = inputEl?.getAttribute('capture');
  if (capture !== 'environment' && capture !== 'user') {
    return false;
  }

  return true;
}

// ── IMAGE COMPRESSION ────────────────────────────────────
function compressImageFile(file, callback) {
  const reader = new FileReader();

  reader.onload = ev => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressed = canvas.toDataURL('image/jpeg', 0.35);
      callback(compressed);
    };

    img.src = ev.target.result;
  };

  reader.readAsDataURL(file);
}

// ── BRANCH SELECTS ───────────────────────────────────────
function populateVisitBranchSelect() {
  const sel = document.getElementById('visit-branch-select');
  if (!sel) return;

  const names = _getAllBranchNames();
  sel.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    names.map(name => `<option value="${name}">${name}</option>`).join('');
}

function populateTLVisitBranchSelect() {
  const sel = document.getElementById('tl-visit-branch');
  if (!sel) return;

  const names = _getAllBranchNames();
  sel.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    names.map(name => `<option value="${name}">${name}</option>`).join('');

  if (names.length === 0) {
    setTimeout(() => {
      const retrySel = document.getElementById('tl-visit-branch');
      if (!retrySel) return;

      const retryNames = _getAllBranchNames();
      retrySel.innerHTML =
        '<option value="">-- اختر الفرع --</option>' +
        retryNames.map(name => `<option value="${name}">${name}</option>`).join('');
    }, 700);
  }
}

// ── EMPLOYEE VISITS ──────────────────────────────────────
function addVisitPhoto(e) {
  const ar = currentLang === 'ar';

  if (!_isEmployeeUser()) {
    if (e?.target) e.target.value = '';
    return _notifyViewOnly();
  }

  if (visitPhotos.length >= 3) {
    e.target.value = '';
    return notify(ar ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
  }

  const input = e.target;
  _setCameraAttrs(input);

  const file = input.files && input.files[0];
  if (!file) {
    input.value = '';
    return;
  }

  if (!isValidCameraImage(file, input)) {
    input.value = '';
    return notify(
      ar ? 'يجب رفع صورة الزيارة بالكاميرا فقط' : 'Visit photo must be captured using camera only',
      'error'
    );
  }

  compressImageFile(file, compressed => {
    visitPhotos.push(compressed);
    renderVisitPhotoPreviews();
  });

  input.value = '';
}

function renderVisitPhotoPreviews() {
  const el = document.getElementById('visit-photo-previews');
  if (!el) return;

  const canDelete = _isEmployeeUser();

  el.innerHTML = visitPhotos.map((src, i) => `
    <div class="photo-preview-wrap">
      <img src="${src}" alt="">
      ${canDelete ? `<button class="photo-preview-del" onclick="removeVisitPhoto(${i})">✕</button>` : ''}
    </div>
  `).join('');

  const zone = document.getElementById('visit-upload-zone');
  if (zone) zone.style.display = visitPhotos.length >= 3 ? 'none' : 'block';
}

function removeVisitPhoto(i) {
  if (!_isEmployeeUser()) return _notifyViewOnly();
  visitPhotos.splice(i, 1);
  renderVisitPhotoPreviews();
}

async function submitVisit() {
  const branchEl = document.getElementById('visit-branch-select');
  const noteEl = document.getElementById('visit-note-input');
  const branch = branchEl ? branchEl.value : '';
  const note = noteEl ? noteEl.value.trim() : '';
  const ar = currentLang === 'ar';

  if (!_isEmployeeUser()) {
    return _notifyViewOnly();
  }

  if (!branch) return notify(ar ? 'اختر الفرع' : 'Select branch', 'error');
  if (visitPhotos.length === 0) {
    return notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');
  }

  try {
    await dbPost('branch_visits', {
      employee_id: currentUser.id,
      employee_name: currentUser.name,
      branch_name: branch,
      note: note || null,
      photo1: visitPhotos[0] || null,
      photo2: visitPhotos[1] || null,
      photo3: visitPhotos[2] || null,
      visit_date: todayStr()
    });

    notify(ar ? 'تم حفظ الزيارة ✅' : 'Visit saved ✅', 'success');

    visitPhotos = [];
    renderVisitPhotoPreviews();

    if (branchEl) branchEl.value = '';
    if (noteEl) noteEl.value = '';

    loadVisitsTab();
  } catch (e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  }
}

async function loadVisitsTab() {
  populateVisitBranchSelect();
  _setEmployeeVisitsHeader();

  const el = document.getElementById('visit-history-list');

  if (!_isEmployeeUser()) {
    _hideEmployeeUploadUI();
    if (el) el.innerHTML = '';
    _setText('vis-done', '0');
    _setText('vis-remain', '0');
    _setText('vis-photos', '0');
    _setText('emp-visits-count', '0 / 150');
    return;
  }

  _showEmployeeUploadUI();

  const pm = getPayrollMonth();
  const visits = await dbGet(
    'branch_visits',
    `?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
  ).catch(() => []) || [];

  const photoCount = visits.reduce((s, v) => {
    let c = 0;
    if (v.photo1) c++;
    if (v.photo2) c++;
    if (v.photo3) c++;
    return s + c;
  }, 0);

  const done = visits.length;
  const remain = Math.max(0, 150 - done);

  _setText('vis-done', String(done));
  _setText('vis-remain', String(remain));
  _setText('vis-photos', String(photoCount));
  _setText('emp-visits-count', done + ' / 150');

  if (!el) return;

  if (visits.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
    return;
  }

  el.innerHTML = visits.map(v => _renderVisitCard(v, false)).join('');
}

// ── CLEAR OLD VISIT PHOTOS ───────────────────────────────
async function clearOldVisitPhotos() {
  const cutoff = fmtDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
  const old = await dbGet('branch_visits', `?visit_date=lt.${cutoff}&select=id`).catch(() => []) || [];

  if (old.length === 0) return;

  for (const r of old) {
    await dbPatch('branch_visits', { photo1: null, photo2: null, photo3: null }, `?id=eq.${r.id}`);
  }

  console.log(`Cleared photos from ${old.length} old visits`);
}

// ── TEAM LEADER VISITS ───────────────────────────────────
function addTLVisitPhoto(e) {
  const ar = currentLang === 'ar';

  if (!_isTeamLeaderUser()) {
    if (e?.target) e.target.value = '';
    return _notifyViewOnly();
  }

  if (tlVisitPhotos.length >= 3) {
    e.target.value = '';
    return notify(ar ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
  }

  const input = e.target;
  _setCameraAttrs(input);

  const file = input.files && input.files[0];
  if (!file) {
    input.value = '';
    return;
  }

  if (!isValidCameraImage(file, input)) {
    input.value = '';
    return notify(
      ar ? 'يجب رفع صورة الزيارة بالكاميرا فقط' : 'Visit photo must be captured using camera only',
      'error'
    );
  }

  compressImageFile(file, compressed => {
    tlVisitPhotos.push(compressed);
    renderTLPreviews();
  });

  input.value = '';
}

function renderTLPreviews() {
  const el = document.getElementById('tl-visit-previews');
  if (!el) return;

  const canDelete = _isTeamLeaderUser();

  el.innerHTML = tlVisitPhotos.map((src, i) => `
    <div class="photo-preview-wrap">
      <img src="${src}">
      ${canDelete ? `<button class="photo-preview-del" onclick="removeTLPhoto(${i})">✕</button>` : ''}
    </div>
  `).join('');

  const zone = document.getElementById('tl-visit-zone');
  if (zone) zone.style.display = tlVisitPhotos.length >= 3 ? 'none' : 'block';
}

function removeTLPhoto(i) {
  if (!_isTeamLeaderUser()) return _notifyViewOnly();
  tlVisitPhotos.splice(i, 1);
  renderTLPreviews();
}

async function submitTLVisit() {
  const branchEl = document.getElementById('tl-visit-branch');
  const noteEl = document.getElementById('tl-visit-note');
  const branch = branchEl ? branchEl.value : '';
  const note = noteEl ? noteEl.value.trim() : '';
  const ar = currentLang === 'ar';

  if (!_isTeamLeaderUser()) {
    return _notifyViewOnly();
  }

  if (!branch) return notify(ar ? 'اختر الفرع' : 'Select branch', 'error');
  if (tlVisitPhotos.length === 0) {
    return notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');
  }

  try {
    await dbPost('branch_visits', {
      manager_id: currentUser.id,
      manager_name: currentUser.name,
      branch_name: branch,
      note: note || null,
      photo1: tlVisitPhotos[0] || null,
      photo2: tlVisitPhotos[1] || null,
      photo3: tlVisitPhotos[2] || null,
      visit_date: todayStr()
    });

    notify(ar ? 'تم حفظ الزيارة ✅' : 'Visit saved ✅', 'success');

    tlVisitPhotos = [];
    renderTLPreviews();

    if (branchEl) branchEl.value = '';
    if (noteEl) noteEl.value = '';

    loadTLVisitsTab();
  } catch (e) {
    notify('Error: ' + (e.message || ''), 'error');
  }
}

async function loadTLVisitsTab() {
  populateTLVisitBranchSelect();

  const doneEl = document.getElementById('tl-vis-done');
  const remEl = document.getElementById('tl-vis-remain');
  const cntEl = document.getElementById('tl-visit-count');
  const el = document.getElementById('tl-visit-history');

  if (!el) return;

  // TEAM LEADER
  if (_isTeamLeaderUser()) {
    _showTLUploadUI();
    _setTLVisitsHeader();

    const pm = getPayrollMonth();

    const byManager = await dbGet(
      'branch_visits',
      `?manager_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
    ).catch(() => []);

    const byEmployee = await dbGet(
      'branch_visits',
      `?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
    ).catch(() => []);

    const visits = (Array.isArray(byManager) && byManager.length)
      ? byManager
      : (Array.isArray(byEmployee) ? byEmployee : []);

    const done = visits.length;
    const remain = Math.max(0, 150 - done);

    if (doneEl) doneEl.textContent = String(done);
    if (remEl) remEl.textContent = String(remain);
    if (cntEl) cntEl.textContent = done + ' / 150';

    if (!visits.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
      return;
    }

    el.innerHTML = visits.map(v => _renderVisitCard(v, false)).join('');
    return;
  }

  // ADMIN / SUPER ADMIN
  if (_isAdminReviewUser()) {
    _hideTLUploadUI();
    _setAdminVisitsHeader();

    const pm = getPayrollMonth();
    const visits = await dbGet(
      'branch_visits',
      `?visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
    ).catch(() => []) || [];

    const totalVisits = visits.length;
    const totalPhotos = visits.reduce((s, v) => {
      let c = 0;
      if (v.photo1) c++;
      if (v.photo2) c++;
      if (v.photo3) c++;
      return s + c;
    }, 0);

    if (doneEl) doneEl.textContent = String(totalVisits);
    if (remEl) remEl.textContent = String(totalPhotos);
    if (cntEl) cntEl.textContent = String(totalVisits);

    if (!visits.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
      return;
    }

    el.innerHTML = visits.map(v => _renderVisitCard(v, true)).join('');
    return;
  }

  // OTHER ROLES
  _hideTLUploadUI();
  if (doneEl) doneEl.textContent = '0';
  if (remEl) remEl.textContent = '0';
  if (cntEl) cntEl.textContent = '0';
  el.innerHTML = '';
}

// ── COMPATIBILITY HELPERS ────────────────────────────────
function openVisitCamera() {
  if (!_isEmployeeUser()) return _notifyViewOnly();

  const input =
    document.getElementById('visit-camera-input') ||
    document.getElementById('visit-input');

  if (!input) {
    return notify(
      currentLang === 'ar' ? 'مدخل الكاميرا غير موجود' : 'Camera input not found',
      'error'
    );
  }

  _setCameraAttrs(input);

  if (visitPhotos.length >= 3) {
    return notify(
      currentLang === 'ar' ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos',
      'error'
    );
  }

  input.value = '';
  input.click();
}

function openTLVisitCamera() {
  if (!_isTeamLeaderUser()) return _notifyViewOnly();

  const input = document.getElementById('tl-visit-input');

  if (!input) {
    return notify(
      currentLang === 'ar' ? 'مدخل الكاميرا غير موجود' : 'Camera input not found',
      'error'
    );
  }

  _setCameraAttrs(input);

  if (tlVisitPhotos.length >= 3) {
    return notify(
      currentLang === 'ar' ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos',
      'error'
    );
  }

  input.value = '';
  input.click();
}

function showPhotoSourceModal(inputId) {
  if (inputId === 'tl-visit-input') {
    openTLVisitCamera();
    return;
  }

  if (inputId === 'visit-input' || inputId === 'visit-camera-input') {
    openVisitCamera();
    return;
  }

  const input = document.getElementById(inputId);
  if (!input) return;

  if (!_isVisitUploader()) return _notifyViewOnly();

  _setCameraAttrs(input);
  input.value = '';
  input.click();
}

// ── INIT ─────────────────────────────────────────────────
function initVisitsModule() {
  _ensureCameraAttrsOnKnownInputs();

  if (_isEmployeeUser()) _showEmployeeUploadUI();
  else _hideEmployeeUploadUI();

  if (_isTeamLeaderUser()) _showTLUploadUI();
  else _hideTLUploadUI();

  populateVisitBranchSelect();
  populateTLVisitBranchSelect();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisitsModule);
} else {
  initVisitsModule();
}

// ── GLOBALS ──────────────────────────────────────────────
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
