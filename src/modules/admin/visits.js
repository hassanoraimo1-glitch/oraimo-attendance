// ═══════════════════════════════════════════════════════════
// modules/admin/visits.js — Branch visits (employee + team leader + admin review)
// Fixed:
// 1) TL save 400 by using existing table schema only
// 2) admin can open visits tab and review all visits
// 3) team leader still can upload via camera only
// 4) no duplicate photo issue
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
  if (typeof notify === 'function') {
    notify(_vLangAr() ? arMsg : enMsg, type);
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
  if (r === 'manager') return 'team_leader';
  if (r === 'team_leader') return 'team_leader';
  if (r === 'super_admin') return 'superadmin';
  if (r === 'superadmin') return 'superadmin';
  if (r === 'admin') return 'admin';
  if (r === 'employee') return 'employee';
  return r || 'employee';
}

function _isTeamLeaderUser() {
  return _normalizeRole(window.currentUser?.role) === 'team_leader';
}

function _isAdminReviewUser() {
  const r = _normalizeRole(window.currentUser?.role);
  return r === 'admin' || r === 'superadmin';
}

function _getBranchName(branch) {
  if (!branch) return '';
  return branch.name || branch.branch_name || branch.title || '';
}

function _ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function _dedupeById(rows) {
  const map = new Map();
  (rows || []).forEach(r => {
    const key = r && r.id != null ? String(r.id) : JSON.stringify(r);
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

async function _ensureBranchesLoaded() {
  if (Array.isArray(window.allBranches) && window.allBranches.length > 0) return;

  if (typeof window.loadBranches === 'function') {
    try {
      await window.loadBranches();
    } catch (e) {
      console.warn('[loadBranches]', e);
    }
  }
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

  if (typeof fullSelfie === 'function') {
    fullSelfie(src);
    return;
  }

  const fs = _vId('selfie-fullscreen');
  const img = _vId('selfie-fs-img');
  if (fs && img) {
    img.src = src;
    fs.classList.add('open');
  } else {
    window.open(src, '_blank');
  }
}

function _getAdminVisitsContainerParts() {
  const page = _vId('admin-visits');
  if (!page) return {};

  const glowCard = page.querySelector('.card.card-glow');
  const shTitle = page.querySelector('.sh .sh-title');
  const headerText = page.querySelector('div[style*="font-size:16px"]');
  const statLabels = page.querySelectorAll('.stat-card .stat-label');

  return { page, glowCard, shTitle, headerText, statLabels };
}

function _applyAdminVisitsReviewMode() {
  const { glowCard, shTitle, headerText, statLabels } = _getAdminVisitsContainerParts();

  if (glowCard) glowCard.style.display = 'none';
  if (shTitle) shTitle.textContent = _vLangAr() ? '📋 كل الزيارات هذا الشهر' : '📋 All Visits This Month';
  if (headerText) headerText.textContent = _vLangAr() ? '📸 كل الزيارات' : '📸 All Visits';

  if (statLabels && statLabels.length >= 2) {
    statLabels[0].textContent = _vLangAr() ? 'إجمالي الزيارات' : 'Total Visits';
    statLabels[1].textContent = _vLangAr() ? 'إجمالي الصور' : 'Total Photos';
  }
}

function _applyTeamLeaderVisitsMode() {
  const { glowCard, shTitle, headerText, statLabels } = _getAdminVisitsContainerParts();

  if (glowCard) glowCard.style.display = 'block';
  if (shTitle) shTitle.textContent = _vLangAr() ? '📋 زياراتي هذا الشهر' : '📋 My Visits This Month';
  if (headerText) headerText.textContent = _vLangAr() ? '📸 صور الديسبلاي' : '📸 Display Visits';

  if (statLabels && statLabels.length >= 2) {
    statLabels[0].textContent = _vLangAr() ? 'زيارة هذا الشهر' : 'Visits This Month';
    statLabels[1].textContent = _vLangAr() ? 'متبقي' : 'Remaining';
  }
}

function _visitCard(v, showOwner = false) {
  const photos = [v.photo1, v.photo2, v.photo3].filter(Boolean);

  return `
    <div class="visit-card">
      <div class="visit-header">
        <div>
          <div class="visit-branch-name">🏪 ${_escapeHtml(v.branch_name || '-')}</div>
          <div class="visit-meta">${_escapeHtml(v.visit_date || '-')}</div>
          ${showOwner ? `<div class="visit-meta" style="margin-top:4px;color:var(--green)">👤 ${_escapeHtml(v.employee_name || v.manager_name || '-')}</div>` : ''}
        </div>
        <span class="badge badge-green">${photos.length} 📷</span>
      </div>
      ${v.note ? `<div class="visit-note">📝 ${_escapeHtml(v.note)}</div>` : ''}
      ${photos.length > 0 ? `
        <div class="visit-photos-row">
          ${photos.map(src => `<img class="visit-photo" src="${src}" onclick="openVisitImagePreview('${String(src).replace(/'/g, "\\'")}')">`).join('')}
        </div>
      ` : ''}
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
            const maxW = 1080;
            const maxH = 1080;
            const ratio = Math.min(1, maxW / img.width, maxH / img.height);

            canvas.width = Math.max(1, Math.round(img.width * ratio));
            canvas.height = Math.max(1, Math.round(img.height * ratio));

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            resolve(canvas.toDataURL('image/jpeg', 0.72));
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

  // لو موجود في HTML، ما نضيفش listener ثاني
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

// ── CAMERA ENTRYPOINTS ────────────────────────────────────
function openVisitCamera() {
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
    _vNotify('فقط التيم ليدر يمكنه رفع الزيارات', 'Only team leader can upload visits', 'error');
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

// توافق مع HTML الحالي
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
  if (!file) return false;
  if (!file.type || !file.type.startsWith('image/')) return false;
  return true;
}

// ── EMPLOYEE VISITS ───────────────────────────────────────
async function populateVisitBranchSelect() {
  await _ensureBranchesLoaded();

  const sel = _vId('visit-branch-select');
  if (!sel) return;

  const branches = _ensureArray(window.allBranches)
    .map(_getBranchName)
    .filter(Boolean);

  sel.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    branches.map(name => `<option value="${_escapeHtml(name)}">${_escapeHtml(name)}</option>`).join('');
}

async function addVisitPhoto(e) {
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
  } catch (e1) {
    console.error('[addVisitPhoto]', e1);
    _vNotify('تعذر معالجة الصورة', 'Failed to process image', 'error');
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
  visitPhotos.splice(i, 1);
  renderVisitPhotoPreviews();
}

async function submitVisit() {
  const branchEl = _vId('visit-branch-select');
  const noteEl = _vId('visit-note-input');

  const branch = (branchEl?.value || '').trim();
  const note = (noteEl?.value || '').trim();

  if (!window.currentUser) {
    _vNotify('يجب تسجيل الدخول أولاً', 'You must login first', 'error');
    return;
  }

  if (!branch) {
    _vNotify('اختر الفرع', 'Select branch', 'error');
    return;
  }

  if (visitPhotos.length === 0) {
    _vNotify('أضف صورة واحدة على الأقل', 'Add at least one photo', 'error');
    return;
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

    _vNotify('تم حفظ الزيارة ✅', 'Visit saved ✅', 'success');

    visitPhotos = [];
    renderVisitPhotoPreviews();
    _clearVisitForm();

    await loadVisitsTab();
  } catch (e) {
    console.error('[submitVisit]', e);
    _vNotify(`خطأ: ${e.message || ''}`, `Error: ${e.message || ''}`, 'error');
  }
}

async function loadVisitsTab() {
  if (!window.currentUser) return;

  await populateVisitBranchSelect();

  const pm = getPayrollMonth();

  const visits = await dbGet(
    'branch_visits',
    `?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
  ).catch(() => []) || [];

  const photoCount = visits.reduce((sum, v) => {
    let c = 0;
    if (v.photo1) c++;
    if (v.photo2) c++;
    if (v.photo3) c++;
    return sum + c;
  }, 0);

  const done = visits.length;
  const remain = Math.max(0, 150 - done);

  const visDone = _vId('vis-done');
  if (visDone) visDone.textContent = done;

  const visRem = _vId('vis-remain');
  if (visRem) visRem.textContent = remain;

  const visPhotos = _vId('vis-photos');
  if (visPhotos) visPhotos.textContent = photoCount;

  const cnt = _vId('emp-visits-count');
  if (cnt) cnt.textContent = done + ' / 150';

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
  if (old.length === 0) return;

  for (const r of old) {
    await dbPatch(
      'branch_visits',
      { photo1: null, photo2: null, photo3: null },
      `?id=eq.${r.id}`
    ).catch(() => null);
  }

  console.log(`Cleared photos from ${old.length} old visits`);
}

// ── TEAM LEADER / ADMIN VISITS TAB ────────────────────────
async function _populateTLVisitBranchSelect() {
  await _ensureBranchesLoaded();

  const sel = _vId('tl-visit-branch');
  if (!sel) return;

  const branches = _ensureArray(window.allBranches)
    .map(_getBranchName)
    .filter(Boolean);

  sel.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    branches.map(name => `<option value="${_escapeHtml(name)}">${_escapeHtml(name)}</option>`).join('');
}

async function addTLVisitPhoto(e) {
  if (!_isTeamLeaderUser()) {
    _vNotify('فقط التيم ليدر يمكنه رفع الزيارات', 'Only team leader can upload visits', 'error');
    if (e?.target) e.target.value = '';
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
  } catch (e1) {
    console.error('[addTLVisitPhoto]', e1);
    _vNotify('تعذر معالجة الصورة', 'Failed to process image', 'error');
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
  tlVisitPhotos.splice(i, 1);
  renderTLPreviews();
}

async function submitTLVisit() {
  if (!_isTeamLeaderUser()) {
    _vNotify('فقط التيم ليدر يمكنه رفع الزيارات', 'Only team leader can upload visits', 'error');
    return;
  }

  const branchEl = _vId('tl-visit-branch');
  const noteEl = _vId('tl-visit-note');

  const branch = (branchEl?.value || '').trim();
  const note = (noteEl?.value || '').trim();

  if (!window.currentUser) {
    _vNotify('يجب تسجيل الدخول أولاً', 'You must login first', 'error');
    return;
  }

  if (!branch) {
    _vNotify('اختر الفرع', 'Select branch', 'error');
    return;
  }

  if (tlVisitPhotos.length === 0) {
    _vNotify('أضف صورة واحدة على الأقل', 'Add at least one photo', 'error');
    return;
  }

  try {
    // ✅ مهم: نفس schema الموجودة في branch_visits
    await dbPost('branch_visits', {
      employee_id: currentUser.id,
      employee_name: currentUser.name,
      branch_name: branch,
      note: note || null,
      photo1: tlVisitPhotos[0] || null,
      photo2: tlVisitPhotos[1] || null,
      photo3: tlVisitPhotos[2] || null,
      visit_date: todayStr()
    });

    _vNotify('تم حفظ الزيارة ✅', 'Visit saved ✅', 'success');

    tlVisitPhotos = [];
    renderTLPreviews();
    _clearTLVisitForm();

    await loadTLVisitsTab();
  } catch (e) {
    console.error('[submitTLVisit]', e);
    _vNotify(`خطأ: ${e.message || ''}`, `Error: ${e.message || ''}`, 'error');
  }
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

  if (nav) nav.style.display = 'flex';
  page.style.display = 'block';

  const pm = getPayrollMonth();
  const allMonthRows = await dbGet(
    'branch_visits',
    `?visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`
  ).catch(() => []) || [];

  // ── TEAM LEADER MODE ──
  if (_isTeamLeaderUser()) {
    _applyTeamLeaderVisitsMode();
    await _populateTLVisitBranchSelect();
    _ensureTLVisitInput();

    const visits = _sortVisitsDesc(
      _dedupeById(
        allMonthRows.filter(v =>
          String(v.employee_id || '') === String(currentUser.id) ||
          String(v.manager_id || '') === String(currentUser.id)
        )
      )
    );

    const done = visits.length;
    const remain = Math.max(0, 150 - done);

    if (doneEl) doneEl.textContent = done;
    if (remEl) remEl.textContent = remain;
    if (cntEl) cntEl.textContent = done + ' / 150';

    if (!visits.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📸</div>${_vLangAr() ? 'لا توجد زيارات هذا الشهر' : 'No visits this month'}</div>`;
      return;
    }

    el.innerHTML = visits.map(v => _visitCard(v, false)).join('');
    return;
  }

  // ── ADMIN / SUPERADMIN REVIEW MODE ──
  if (_isAdminReviewUser()) {
    _applyAdminVisitsReviewMode();

    const visits = _sortVisitsDesc(_dedupeById(allMonthRows));

    const done = visits.length;
    const photoCount = visits.reduce((sum, v) => {
      let c = 0;
      if (v.photo1) c++;
      if (v.photo2) c++;
      if (v.photo3) c++;
      return sum + c;
    }, 0);

    if (doneEl) doneEl.textContent = done;
    if (remEl) remEl.textContent = photoCount;
    if (cntEl) cntEl.textContent = String(done);

    if (!visits.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📸</div>${_vLangAr() ? 'لا توجد زيارات هذا الشهر' : 'No visits this month'}</div>`;
      return;
    }

    el.innerHTML = visits.map(v => _visitCard(v, true)).join('');
    return;
  }

  // أي دور آخر: أخفِ الصفحة
  if (nav) nav.style.display = 'none';
  page.style.display = 'none';
}

// ── INIT ──────────────────────────────────────────────────
function initVisitsModule() {
  _ensureEmployeeVisitInput();
  _ensureTLVisitInput();
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
