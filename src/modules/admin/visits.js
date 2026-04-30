// ═══════════════════════════════════════════════════════════
// modules/admin/visits.js — Branch visits (regular + TL Coverage)
// Provides globals: populateVisitBranchSelect, addVisitPhoto, renderVisitPhotoPreviews, removeVisitPhoto, submitVisit, loadVisitsTab, clearOldVisitPhotos
// Module state: visitPhotos, tlVisitPhotos, tlCoverageBranchId
// ═══════════════════════════════════════════════════════════

let visitPhotos = [];
let tlVisitPhotos = [];
let tlCoverageBranchId = null;

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
  return String(str ?? '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function _notify(msg, type = 'error') {
  // Use existing notify function if available
  if (typeof window.notify !== 'undefined') {
    window.notify(msg, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${msg}`);
  }
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
    branch.name || branch.branch_name || branch.title || branch.label || 
    branch.branch || branch.name_ar || branch.name_en || branch.branchName || ''
  ).trim();
}

function _getAllBranchNames() {
  try {
    if (Array.isArray(window.allBranches) && window.allBranches.length) {
      return window.allBranches.map(_getBranchName).filter(Boolean);
    }
    if (typeof allBranches !== 'undefined' && Array.isArray(allBranches)) {
      return allBranches.map(_getBranchName).filter(Boolean);
    }
    if (window.state && Array.isArray(window.state.branches)) {
      return window.state.branches.map(_getBranchName).filter(Boolean);
    }
    if (typeof state !== 'undefined' && Array.isArray(state.branches)) {
      return state.branches.map(_getBranchName).filter(Boolean);
    }
  } catch (_) {}
  return [];
}

function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function _setClosestWrapDisplay(el, show) {
  if (!el) return;
  const wrap = el.closest('.form-group, .field, .input-group, .row, .col, .card, .section');
  if (wrap) wrap.style.display = show ? '' : 'none';
  else el.style.display = show ? '' : 'none';
}

function _hideEmployeeUploadUI() {
  const branch = document.getElementById('visit-branch-select');
  const note = document.getElementById('visit-note-input');
  const zone = document.getElementById('visit-upload-zone');
  const input = document.getElementById('visit-camera-input') || document.getElementById('visit-input');

  if (branch) { branch.disabled = true; branch.style.pointerEvents = 'none'; }
  if (note) { note.disabled = true; note.style.pointerEvents = 'none'; }
  if (input) { input.disabled = true; input.style.pointerEvents = 'none'; }
  if (zone) zone.style.display = 'none';

  document.querySelectorAll('[onclick*="submitVisit"], [onclick*="openVisitCamera"]')
    .forEach(btn => { if ('disabled' in btn) btn.disabled = true; btn.style.pointerEvents = 'none'; btn.style.display = 'none'; });

  _setClosestWrapDisplay(branch, false);
  _setClosestWrapDisplay(note, false);
}

function _showEmployeeUploadUI() {
  const branch = document.getElementById('visit-branch-select');
  const note = document.getElementById('visit-note-input');
  const zone = document.getElementById('visit-upload-zone');
  const input = document.getElementById('visit-camera-input') || document.getElementById('visit-input');

  if (branch) { branch.disabled = false; branch.style.pointerEvents = ''; }
  if (note) { note.disabled = false; note.style.pointerEvents = ''; }
  if (input) { input.disabled = false; input.style.pointerEvents = ''; }

  document.querySelectorAll('[onclick*="submitVisit"], [onclick*="openVisitCamera"]')
    .forEach(btn => { if ('disabled' in btn) btn.disabled = false; btn.style.pointerEvents = ''; btn.style.display = ''; });

  if (zone) zone.style.display = visitPhotos.length >= 3 ? 'none' : 'block';
  _setClosestWrapDisplay(branch, true);
  _setClosestWrapDisplay(note, true);
}

function _hideTLUploadUI() {
  const branch = document.getElementById('tl-visit-branch');
  const note = document.getElementById('tl-visit-note');
  const zone = document.getElementById('tl-visit-zone');
  const input = document.getElementById('tl-visit-input');

  if (branch) { branch.disabled = true; branch.style.pointerEvents = 'none'; }
  if (note) { note.disabled = true; note.style.pointerEvents = 'none'; }
  if (input) { input.disabled = true; input.style.pointerEvents = 'none'; }
  if (zone) zone.style.display = 'none';

  document.querySelectorAll('[onclick*="submitTLVisit"], [onclick*="openTLVisitCamera"]')
    .forEach(btn => { if ('disabled' in btn) btn.disabled = true; btn.style.pointerEvents = 'none'; btn.style.display = 'none'; });

  _setClosestWrapDisplay(branch, false);
  _setClosestWrapDisplay(note, false);
}

function _showTLUploadUI() {
  const branch = document.getElementById('tl-visit-branch');
  const note = document.getElementById('tl-visit-note');
  const zone = document.getElementById('tl-visit-zone');
  const input = document.getElementById('tl-visit-input');

  if (branch) { branch.disabled = false; branch.style.pointerEvents = ''; branch.style.display = ''; }
  if (note) { note.disabled = false; note.style.pointerEvents = ''; note.style.display = ''; }
  if (input) { input.disabled = false; input.style.pointerEvents = ''; }

  document.querySelectorAll('[onclick*="submitTLVisit"], [onclick*="openTLVisitCamera"]')
    .forEach(btn => { if ('disabled' in btn) btn.disabled = false; btn.style.pointerEvents = ''; btn.style.display = ''; });

  if (zone) zone.style.display = tlVisitPhotos.length >= 3 ? 'none' : 'block';
  _setClosestWrapDisplay(branch, true);
  _setClosestWrapDisplay(note, true);
}

function _setAdminVisitsHeader() {
  const page = document.getElementById('admin-visits');
  if (!page) return;
  const title = page.querySelector('.sh .sh-title');
  if (title) title.textContent = currentLang === 'ar' ? '📋 كل الزيارات هذا الشهر' : '📋 All Visits This Month';
  const labels = page.querySelectorAll('.stat-card .stat-label');
  if (labels[0]) labels[0].textContent = currentLang === 'ar' ? 'إجمالي الزيارات' : 'Total Visits';
  if (labels[1]) labels[1].textContent = currentLang === 'ar' ? 'إجمالي الصور' : 'Total Photos';
}

function _setTLVisitsHeader() {
  const page = document.getElementById('admin-visits');
  if (!page) return;
  const title = page.querySelector('.sh .sh-title');
  if (title) title.textContent = currentLang === 'ar' ? '📋 زياراتي هذا الشهر' : '📋 My Visits This Month';
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
      ${photos.length ? `<div class="visit-photos-row">${photos.map(src => `<img class="visit-photo" src="${src}" onclick="fullSelfie('${_escapeAttr(src)}')">`).join('')}</div>` : ''}
    </div>
  `;
}

// ── CAMERA VALIDATION ────────────────────────────────────
function isValidCameraImage(file, inputEl) {
  if (!file) return false;
  if (!file.type || !file.type.startsWith('image/')) return false;
  const capture = inputEl?.getAttribute('capture');
  if (capture !== 'environment' && capture !== 'user') return false;
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
      const ctx = canvas.getContext('d');
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
  sel.innerHTML = '<option value="">-- اختر الفرع --</option>' + names.map(name => `<option value="${name}">${name}</option>`).join('');
}

async function populateTLCoverageBranches() {
  const container = document.getElementById('tl-coverage-branches-list');
  if (!container) return;

  if (!_isTeamLeaderUser()) {
    container.innerHTML = '';
    return;
  }

  try {
    const data = await dbGet('coverage_branches', `?team_leader_id=eq.${currentUser.id}&is_active=true&order=account_name,branch_name&select=*`);
    
    if (!data || !data.length) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">📍</div>لا توجد فروع مخصصة لك</div>';
      return;
    }

    container.innerHTML = data.map((row, idx) => `
      <div class="coverage-branch-item" data-branch-id="${row.id}" onclick="selectTLCoverageBranch(${idx})">
        <div class="coverage-branch-account">${row.account_name}</div>
        <div class="coverage-branch-name">${row.branch_name}</div>
        <div class="coverage-branch-segment ${row.segment.toLowerCase()}">${row.segment}</div>
      </div>
    `).join('');

  } catch (e) {
    console.error('Failed to load coverage branches:', e);
    container.innerHTML = '<div class="empty"><div class="empty-icon">❌</div>خطأ في تحميل الفروع</div>';
  }
}

function selectTLCoverageBranch(idx) {
  const items = document.querySelectorAll('.coverage-branch-item');
  if (!items[idx]) return;
  
  const row = items[idx];
  const branchId = parseInt(row.getAttribute('data-branch-id'));
  
  // Clear previous selection
  items.forEach(item => item.classList.remove('selected'));
  
  // Select this one
  row.classList.add('selected');
  tlCoverageBranchId = branchId;
  
  // Show form fields
  const formFields = ['tl-key-model', 'tl-stock-qty', 'tl-before-photo', 'tl-after-photo', 'tl-bestseller-earbuds', 'tl-bestseller-watch', 'tl-notes'];
  formFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  
  // Pre-fill static data
  const selectedRow = items[idx];
  const accountName = selectedRow.querySelector('.coverage-branch-account')?.textContent || '';
  const branchName = selectedRow.querySelector('.coverage-branch-name')?.textContent || '';
  const segment = selectedRow.querySelector('.coverage-branch-segment')?.textContent || '';
  
  if (document.getElementById('tl-account-display')) document.getElementById('tl-account-display').textContent = accountName;
  if (document.getElementById('tl-branch-display')) document.getElementById('tl-branch-display').textContent = branchName;
  if (document.getElementById('tl-segment-display')) document.getElementById('tl-segment-display').textContent = segment;
}

// ── EMPLOYEE VISITS ──────────────────────────────────────
function addVisitPhoto(e) {
  const ar = currentLang === 'ar';

  if (!_isEmployeeUser()) {
    if (e?.target) e.target.value = '';
    return _notify(ar ? 'هذا القسم للمشاهدة فقط' : 'This section is view only', 'error');
  }

  if (visitPhotos.length >= 3) {
    e.target.value = '';
    return _notify(ar ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
  }

  const input = e.target;
  _setCameraAttrs(input);

  const file = input.files && input.files[0];
  if (!file) { input.value = ''; return; }

  if (!isValidCameraImage(file, input)) {
    input.value = '';
    return _notify(ar ? 'يجب رفع صورة الزيارة بالكاميرا فقط' : 'Visit photo must be captured using camera only', 'error');
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
  if (!_isEmployeeUser()) return _notify('هذا القسم للمشاهدة فقط', 'error');
  visitPhotos.splice(i, 1);
  renderVisitPhotoPreviews();
}

async function submitVisit() {
  const branchEl = document.getElementById('visit-branch-select');
  const noteEl = document.getElementById('visit-note-input');
  const branch = branchEl ? branchEl.value : '';
  const note = noteEl ? noteEl.value.trim() : '';
  const ar = currentLang === 'ar';

  if (!_isEmployeeUser()) return _notify('هذا القسم للمشاهدة فقط', 'error');
  if (!branch) return _notify(ar ? 'اختر الفرع' : 'Select branch', 'error');
  if (visitPhotos.length === 0) return _notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');

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

    _notify(ar ? 'تم حفظ الزيارة ✅' : 'Visit saved ✅', 'success');

    visitPhotos = [];
    renderVisitPhotoPreviews();

    if (branchEl) branchEl.value = '';
    if (noteEl) noteEl.value = '';

    loadVisitsTab();
  } catch (e) {
    _notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
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
  const visits = await dbGet('branch_visits', `?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`).catch(() => []) || [];

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

async function clearOldVisitPhotos() {
  const cutoff = fmtDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
  const old = await dbGet('branch_visits', `?visit_date=lt.${cutoff}&select=id`).catch(() => []) || [];

  if (old.length === 0) return;

  for (const r of old) {
    await dbPatch('branch_visits', { photo1: null, photo2: null, photo3: null }, `?id=eq.${r.id}`);
  }

  console.log(`Cleared photos from ${old.length} old visits`);
}

// ── TEAM LEADER COVERAGE VISITS ──────────────────────────
function addTLVisitPhoto(e) {
  const ar = currentLang === 'ar';

  if (!_isTeamLeaderUser()) {
    if (e?.target) e.target.value = '';
    return _notify('هذا القسم للمشاهدة فقط', 'error');
  }

  if (tlVisitPhotos.length >= 3) {
    e.target.value = '';
    return _notify(ar ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
  }

  const input = e.target;
  _setCameraAttrs(input);

  const file = input.files && input.files[0];
  if (!file) { input.value = ''; return; }

  if (!isValidCameraImage(file, input)) {
    input.value = '';
    return _notify(ar ? 'يجب رفع صورة الزيارة بالكاميرا فقط' : 'Visit photo must be captured using camera only', 'error');
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
  if (!_isTeamLeaderUser()) return _notify('هذا القسم للمشاهدة فقط', 'error');
  tlVisitPhotos.splice(i, 1);
  renderTLPreviews();
}

async function submitTLVisit() {
  const ar = currentLang === 'ar';

  if (!_isTeamLeaderUser()) return _notify('هذا القسم للمشاهدة فقط', 'error');
  if (!tlCoverageBranchId) return _notify(ar ? 'اختر فرع للزيارة' : 'Select a branch to visit', 'error');
  if (tlVisitPhotos.length === 0) return _notify(ar ? 'أضف صورة بعد التعديل (After Photo)' : 'Add After Photo', 'error');

  // Collect form data
  const keyModel = document.getElementById('tl-key-model')?.value || '';
  const stockQty = parseInt(document.getElementById('tl-stock-qty')?.value) || 0;
  const beforePhoto = document.getElementById('tl-before-photo')?.value || null;
  const bestEarbuds = document.getElementById('tl-bestseller-earbuds')?.value || '';
  const bestWatch = document.getElementById('tl-bestseller-watch')?.value || '';
  const notes = document.getElementById('tl-notes')?.value?.trim() || '';

  try {
    await dbPost('coverage_branch_visits', {
      coverage_branch_id: tlCoverageBranchId,
      team_leader_id: currentUser.id,
      key_model_sales: keyModel || null,
      total_stock_qty: stockQty || null,
      before_photo_url: beforePhoto || null,
      after_photo_url: tlVisitPhotos[0] || null,
      best_seller_earbuds: bestEarbuds || null,
      best_seller_smart_watch: bestWatch || null,
      notes: notes || null,
      visited_at: new Date().toISOString()
    });

    _notify(ar ? 'تم حفظ الزيارة ✅' : 'Coverage visit saved ✅', 'success');

    // Reset
    tlVisitPhotos = [];
    renderTLPreviews();
    tlCoverageBranchId = null;
    document.getElementById('tl-visit-input').value = '';
    
    // Clear form
    ['tl-key-model', 'tl-stock-qty', 'tl-bestseller-earbuds', 'tl-bestseller-watch', 'tl-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    
    // Hide form
    const formFields = ['tl-key-model', 'tl-stock-qty', 'tl-before-photo', 'tl-after-photo', 'tl-bestseller-earbuds', 'tl-bestseller-watch', 'tl-notes'];
    formFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Re-populate branches
    populateTLCoverageBranches();
    loadTLVisitsTab();
  } catch (e) {
    _notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  }
}

async function loadTLVisitsTab() {
  populateTLCoverageBranches();

  const doneEl = document.getElementById('tl-vis-done');
  const remEl = document.getElementById('tl-vis-remain');
  const cntEl = document.getElementById('tl-visit-count');
  const el = document.getElementById('tl-visit-history');

  if (!el) return;

  if (_isTeamLeaderUser()) {
    _showTLUploadUI();
    _setTLVisitsHeader();

    const pm = getPayrollMonth();
    
    // Get coverage visits for TL
    const coverageVisits = await dbGet('coverage_branch_visits', 
      `?team_leader_id=eq.${currentUser.id}&visited_at=gte.${pm.start}&visited_at=lte.${pm.end}&order=visited_at.desc&select=*`
    ).catch(() => []) || [];

    const done = coverageVisits.length;
    const remain = Math.max(0, 150 - done);

    if (doneEl) doneEl.textContent = String(done);
    if (remEl) remEl.textContent = String(remain);
    if (cntEl) cntEl.textContent = done + ' / 150';

    if (!coverageVisits.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
      return;
    }

    el.innerHTML = coverageVisits.map(v => _renderTLVisitCard(v)).join('');
    return;
  }

  if (_isAdminReviewUser()) {
    _hideTLUploadUI();
    _setAdminVisitsHeader();

    const pm = getPayrollMonth();
    const coverageVisits = await dbGet('coverage_branch_visits', 
      `?visited_at=gte.${pm.start}&visited_at=lte.${pm.end}&order=visited_at.desc&select=*`
    ).catch(() => []) || [];

    if (!coverageVisits.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
      return;
    }

    el.innerHTML = coverageVisits.map(v => _renderTLVisitCard(v, true)).join('');
    return;
  }

  _hideTLUploadUI();
  if (doneEl) doneEl.textContent = '0';
  if (remEl) remEl.textContent = '0';
  if (cntEl) cntEl.textContent = '0';
  el.innerHTML = '';
}

function _renderTLVisitCard(v, showDetails = false) {
  const account = v.coverage_branch?.account_name || '';
  const branch = v.coverage_branch?.branch_name || '';
  const segment = v.coverage_branch?.segment || '';
  const marchSales = v.coverage_branch?.march_sales || '-';
  const aprilSales = v.coverage_branch?.april_sales || '-';

  return `
    <div class="visit-card coverage-card">
      <div class="visit-header">
        <div>
          <div class="visit-branch-name">🏪 ${branch}</div>
          <div class="visit-meta">${account}</div>
          <div class="visit-meta"><span class="badge ${segment.toLowerCase()}">${segment}</span></div>
          <div class="visit-meta">${v.visited_at ? new Date(v.visited_at).toLocaleDateString('ar-EG') : ''}</div>
        </div>
        <span class="badge badge-green">${v.after_photo_url ? '📷' : '❌'}</span>
      </div>
      ${showDetails ? `
        <div class="visit-stats">
          <div class="stat-box">
            <span class="label">March Sales</span>
            <span class="value">${marchSales}</span>
          </div>
          <div class="stat-box">
            <span class="label">April Sales</span>
            <span class="value">${aprilSales}</span>
          </div>
        </div>
      ` : ''}
      ${v.notes ? `<div class="visit-note">📝 ${v.notes}</div>` : ''}
      ${v.after_photo_url ? `<img class="visit-photo" src="${v.after_photo_url}" onclick="fullSelfie('${_escapeAttr(v.after_photo_url)}')">` : ''}
    </div>
  `;
}

// ── COMPATIBILITY HELPERS ────────────────────────────────
function openVisitCamera() {
  if (!_isEmployeeUser()) return _notify('هذا القسم للمشاهدة فقط', 'error');
  const input = document.getElementById('visit-camera-input') || document.getElementById('visit-input');
  if (!input) return _notify('مدخل الكاميرا غير موجود', 'error');
  _setCameraAttrs(input);
  if (visitPhotos.length >= 3) return _notify('الحد الأقصى 3 صور', 'error');
  input.value = '';
  input.click();
}

function openTLVisitCamera() {
  if (!_isTeamLeaderUser()) return _notify('هذا القسم للمشاهدة فقط', 'error');
  const input = document.getElementById('tl-visit-input');
  if (!input) return _notify('مدخل الكاميرا غير موجود', 'error');
  _setCameraAttrs(input);
  if (tlVisitPhotos.length >= 3) return _notify('الحد الأقصى 3 صور', 'error');
  input.value = '';
  input.click();
}

function showPhotoSourceModal(inputId) {
  if (inputId === 'tl-visit-input') { openTLVisitCamera(); return; }
  if (inputId === 'visit-input' || inputId === 'visit-camera-input') { openVisitCamera(); return; }
  const input = document.getElementById(inputId);
  if (!input) return;
  if (!_isVisitUploader()) return _notify('هذا القسم للمشاهدة فقط', 'error');
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
  populateTLCoverageBranches();
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
window.populateTLCoverageBranches = populateTLCoverageBranches;
window.selectTLCoverageBranch = selectTLCoverageBranch;
