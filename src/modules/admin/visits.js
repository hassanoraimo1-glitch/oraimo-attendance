// ═══════════════════════════════════════════════════════════
// modules/admin/visits.js — Branch visits (regular + TL Coverage)
// Globals:
//   populateVisitBranchSelect, addVisitPhoto, renderVisitPhotoPreviews,
//   removeVisitPhoto, submitVisit, loadVisitsTab, clearOldVisitPhotos,
//   addTLVisitPhoto, renderTLPreviews, removeTLPhoto, submitTLVisit,
//   loadTLVisitsTab, openVisitCamera, openTLVisitCamera, showPhotoSourceModal,
//   populateTLCoverageBranches, populateTLVisitBranchSelect,
//   selectTLCoverageBranch, handleTLBranchSelectChange, initVisitsModule
// State:
//   visitPhotos, tlVisitPhotos, tlCoverageBranches, tlCoverageBranchId
// ═══════════════════════════════════════════════════════════

let visitPhotos = [];
let tlVisitPhotos = [];
let tlCoverageBranches = [];
let tlCoverageBranchId = null;
let tlBeforePhoto = null;
let tlAfterPhoto = null;

// ── HELPERS ──────────────────────────────────────────────
function _vRole() {
  const raw = String(
    currentUser?.role ||
    currentUser?.user_role ||
    currentUser?.type ||
    ''
  ).trim().toLowerCase();

  if (['superadmin', 'super_admin', 'super admin'].includes(raw)) return 'super_admin';
  if (['teamleader', 'team_leader', 'team leader', 'tl'].includes(raw)) return 'team_leader';
  if (raw === 'manager') return 'admin';

  return raw;
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

function _notify(msg, type = 'error') {
  if (typeof notify === 'function') {
    notify(msg, type);
  } else {
    console[type === 'error' ? 'error' : 'log'](msg);
  }
}

function _notifyViewOnly() {
  const ar = currentLang === 'ar';
  _notify(ar ? 'هذا القسم للمشاهدة فقط' : 'This section is view only', 'error');
}

function _escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function _escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _safeImg(url, cls = 'visit-photo', alt = '') {
  if (!url) return '';
  return `<img class="${cls}" src="${_escapeAttr(url)}" alt="${_escapeAttr(alt)}" onclick="fullSelfie('${_escapeAttr(url)}')" onerror="this.style.display='none'">`;
}

function _setCameraAttrs(inputEl) {
  if (!inputEl) return;
  inputEl.setAttribute('accept', 'image/*');
  inputEl.setAttribute('capture', 'environment');
}

function _ensureCameraAttrsOnKnownInputs() {
  [
    'visit-input',
    'visit-camera-input',
    'tl-visit-input',
    'tl-before-input',
    'tl-after-input',
    'tl-before-photo-input',
    'tl-after-photo-input'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) _setCameraAttrs(el);
  });
}

function _getCurrentEmployeeId() {
  const candidates = [
    currentUser?.employee_id,
    currentUser?.employeeId,
    currentUser?.id,
    currentUser?.user_id,
    currentUser?.profile_id
  ];

  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
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
    if (Array.isArray(window.allBranches) && window.allBranches.length) return window.allBranches;
  } catch (_) {}

  try {
    if (typeof allBranches !== 'undefined' && Array.isArray(allBranches) && allBranches.length) return allBranches;
  } catch (_) {}

  try {
    if (window.state && Array.isArray(window.state.branches) && window.state.branches.length) return window.state.branches;
  } catch (_) {}

  try {
    if (typeof state !== 'undefined' && Array.isArray(state.branches) && state.branches.length) return state.branches;
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
  const wrap = el.closest('.inp-grp, .form-group, .field, .input-group, .row, .col, .card, .section');
  if (wrap) wrap.style.display = show ? '' : 'none';
  else el.style.display = show ? '' : 'none';
}

function _getPayrollMonthSafe() {
  if (typeof getPayrollMonth === 'function') {
    return getPayrollMonth();
  }

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    start: fmt(startDate),
    end: fmt(endDate)
  };
}

function _getPayrollTimestampRange() {
  const pm = _getPayrollMonthSafe();
  const start = `${pm.start}T00:00:00`;
  const endDate = new Date(`${pm.end}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);

  return {
    startEncoded: encodeURIComponent(start),
    endExclusiveEncoded: encodeURIComponent(endDate.toISOString()),
    startDate: pm.start,
    endDate: pm.end
  };
}

function _injectVisitsStyles() {
  if (document.getElementById('visits-module-inline-style')) return;

  const style = document.createElement('style');
  style.id = 'visits-module-inline-style';
  style.textContent = `
    /* hide native file inputs */
    #visit-input,
    #visit-camera-input,
    #tl-visit-input,
    #tl-before-input,
    #tl-after-input,
    #tl-before-photo-input,
    #tl-after-photo-input,
    .force-hidden-file{
      position:fixed !important;
      left:-99999px !important;
      top:auto !important;
      width:1px !important;
      height:1px !important;
      opacity:0 !important;
      pointer-events:none !important;
      z-index:-1 !important;
      overflow:hidden !important;
      display:block !important;
    }

    /* force old TL cards list hidden if select exists */
    #admin-visits #tl-coverage-branches-list{
      display:none !important;
    }

    #admin-visits .inp-grp label,
    #emp-visits .inp-grp label{
      display:block;
      font-size:11px;
      color:var(--muted);
      font-weight:700;
      margin-bottom:8px;
    }

    #admin-visits select,
    #admin-visits input[type="text"],
    #admin-visits input[type="number"],
    #admin-visits textarea,
    #emp-visits select,
    #emp-visits textarea{
      width:100%;
      box-sizing:border-box;
      background:var(--card2);
      color:var(--text);
      border:1.5px solid var(--border);
      border-radius:12px;
      padding:12px 14px;
      font-family:Cairo,sans-serif;
      font-size:13px;
      outline:none;
    }

    #admin-visits select:focus,
    #admin-visits input[type="text"]:focus,
    #admin-visits input[type="number"]:focus,
    #admin-visits textarea:focus,
    #emp-visits select:focus,
    #emp-visits textarea:focus{
      border-color:var(--green);
      box-shadow:0 0 0 3px rgba(0,200,83,.10);
    }

    .visit-card{
      background:var(--card);
      border:1px solid var(--border);
      border-radius:16px;
      padding:12px;
      margin-bottom:12px;
      box-shadow:0 6px 18px rgba(0,0,0,.15);
    }

    .coverage-card{
      overflow:hidden;
    }

    .visit-header{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:10px;
      margin-bottom:8px;
    }

    .visit-branch-name{
      font-size:14px;
      font-weight:800;
      margin-bottom:3px;
      word-break:break-word;
    }

    .visit-meta{
      font-size:11px;
      color:var(--muted);
      margin-bottom:2px;
      word-break:break-word;
    }

    .visit-note{
      background:rgba(255,255,255,.03);
      border:1px solid var(--border);
      border-radius:12px;
      padding:10px;
      font-size:12px;
      margin-top:8px;
      word-break:break-word;
    }

    .visit-photos-row{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:10px;
    }

    .visit-photo{
      width:100%;
      height:130px;
      object-fit:cover;
      border-radius:12px;
      border:1px solid var(--border);
      cursor:pointer;
      background:#111;
    }

    .visit-stats{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      margin-top:8px;
    }

    .stat-box{
      background:rgba(255,255,255,.03);
      border:1px solid var(--border);
      border-radius:12px;
      padding:9px 10px;
    }

    .stat-box .label{
      display:block;
      font-size:10px;
      color:var(--muted);
      margin-bottom:4px;
    }

    .stat-box .value{
      display:block;
      font-size:13px;
      font-weight:800;
      word-break:break-word;
    }

    .photo-preview-wrap{
      position:relative;
      width:88px;
      height:88px;
      border-radius:12px;
      overflow:hidden;
      border:1px solid var(--border);
      background:var(--card2);
    }

    .photo-preview-wrap img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }

    .photo-preview-del{
      position:absolute;
      top:4px;
      right:4px;
      width:22px;
      height:22px;
      border:none;
      border-radius:50%;
      background:rgba(255,59,59,.95);
      color:#fff;
      font-size:12px;
      cursor:pointer;
    }

    .photo-preview-label{
      position:absolute;
      left:6px;
      bottom:6px;
      font-size:10px;
      font-weight:700;
      background:rgba(0,0,0,.6);
      color:#fff;
      padding:2px 6px;
      border-radius:8px;
    }

    .photo-previews{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      min-height:8px;
    }

    .badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:4px;
      font-size:10px;
      padding:5px 8px;
      border-radius:999px;
      font-weight:800;
      border:1px solid var(--border);
      white-space:nowrap;
    }

    .badge-green{
      background:rgba(0,200,83,.12);
      color:var(--green);
      border-color:rgba(0,200,83,.25);
    }

    .badge.a, .badge.b, .badge.c, .badge.s{
      background:rgba(255,255,255,.04);
      color:var(--text);
    }

    .empty{
      text-align:center;
      padding:18px 12px;
      border:1px dashed var(--border);
      border-radius:14px;
      color:var(--muted);
      background:rgba(255,255,255,.02);
    }

    .empty-icon{
      font-size:24px;
      margin-bottom:6px;
    }

    @media (max-width: 768px){
      .visit-photos-row,
      .visit-stats{
        grid-template-columns:1fr;
      }
    }
  `;
  document.head.appendChild(style);
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

function _toggleTLSelectionUI(show) {
  const select = document.getElementById('tl-visit-branch');
  if (select) _setClosestWrapDisplay(select, show);

  const info = document.querySelector('#admin-visits .tlv-branch-info');
  if (info) info.style.display = show ? '' : 'none';
}

function _hideTLUploadUI() {
  const select = document.getElementById('tl-visit-branch');
  const fields = [
    'tl-key-model',
    'tl-stock-qty',
    'tl-bestseller-earbuds',
    'tl-bestseller-watch',
    'tl-notes',
    'tl-visit-note'
  ];

  if (select) {
    select.disabled = true;
    select.style.pointerEvents = 'none';
  }

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = true;
    el.style.pointerEvents = 'none';
  });

  [
    'tl-before-input',
    'tl-after-input',
    'tl-before-photo-input',
    'tl-after-photo-input',
    'tl-visit-input'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });

  [
    'tl-before-photo',
    'tl-after-photo',
    'tl-save-visit-btn',
    'tl-submit-visit-btn'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if ('disabled' in el) el.disabled = true;
    el.style.pointerEvents = 'none';
    el.style.display = 'none';
  });

  const zone = document.getElementById('tl-visit-zone');
  if (zone) zone.style.display = 'none';

  _toggleTLSelectionUI(false);
  _toggleTLFormDetails(false);
}

function _showTLUploadUI() {
  const select = document.getElementById('tl-visit-branch');
  const fields = [
    'tl-key-model',
    'tl-stock-qty',
    'tl-bestseller-earbuds',
    'tl-bestseller-watch',
    'tl-notes',
    'tl-visit-note'
  ];

  if (select) {
    select.disabled = false;
    select.style.pointerEvents = '';
  }

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = false;
    el.style.pointerEvents = '';
  });

  [
    'tl-before-input',
    'tl-after-input',
    'tl-before-photo-input',
    'tl-after-photo-input',
    'tl-visit-input'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });

  [
    'tl-before-photo',
    'tl-after-photo',
    'tl-save-visit-btn',
    'tl-submit-visit-btn'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if ('disabled' in el) el.disabled = false;
    el.style.pointerEvents = '';
    el.style.display = '';
  });

  const zone = document.getElementById('tl-visit-zone');
  if (zone) zone.style.display = 'none';

  _toggleTLSelectionUI(true);
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
          <div class="visit-branch-name">🏪 ${_escapeHtml(v.branch_name || '')}</div>
          <div class="visit-meta">${_escapeHtml(v.visit_date || '')}</div>
          ${showOwner && owner ? `<div class="visit-meta">👤 ${_escapeHtml(owner)}</div>` : ''}
        </div>
        <span class="badge badge-green">${photos.length} 📷</span>
      </div>
      ${v.note ? `<div class="visit-note">📝 ${_escapeHtml(v.note)}</div>` : ''}
      ${photos.length ? `
        <div class="visit-photos-row">
          ${photos.map(src => _safeImg(src, 'visit-photo')).join('')}
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
      const maxW = 1000;
      const scale = Math.min(1, maxW / img.width);

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressed = canvas.toDataURL('image/jpeg', 0.6);
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
    names.map(name => `<option value="${_escapeHtml(name)}">${_escapeHtml(name)}</option>`).join('');
}

function _renderTLCoverageBranchList(container, rows) {
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📍</div>لا توجد فروع مخصصة لك</div>';
    return;
  }

  container.innerHTML = rows.map((row, idx) => `
    <div class="coverage-branch-item${Number(row.id) === Number(tlCoverageBranchId) ? ' selected' : ''}"
         data-branch-id="${row.id}"
         onclick="selectTLCoverageBranch(${idx})">
      <div class="coverage-branch-account">${_escapeHtml(row.account_name || '')}</div>
      <div class="coverage-branch-name">${_escapeHtml(row.branch_name || '')}</div>
      <div class="coverage-branch-segment ${String(row.segment || 'c').toLowerCase()}">${_escapeHtml(row.segment || 'C')}</div>
    </div>
  `).join('');
}

function _renderTLCoverageBranchSelect(selectEl, rows) {
  if (!selectEl) return;

  selectEl.innerHTML =
    '<option value="">-- اختر الفرع --</option>' +
    rows.map(row => `
      <option value="${row.id}" ${Number(row.id) === Number(tlCoverageBranchId) ? 'selected' : ''}>
        ${_escapeHtml(row.account_name || '')} - ${_escapeHtml(row.branch_name || '')}${row.segment ? ` (${_escapeHtml(row.segment)})` : ''}
      </option>
    `).join('');

  if (!selectEl.dataset.boundChange) {
    selectEl.addEventListener('change', handleTLBranchSelectChange);
    selectEl.dataset.boundChange = '1';
  }
}

function _toggleTLFormDetails(show) {
  const wrap = document.getElementById('tl-visit-form-wrap');
  if (wrap) {
    wrap.style.display = show ? '' : 'none';
  }

  [
    'tl-key-model',
    'tl-stock-qty',
    'tl-before-input',
    'tl-after-input',
    'tl-before-photo-input',
    'tl-after-photo-input',
    'tl-before-photo',
    'tl-after-photo',
    'tl-bestseller-earbuds',
    'tl-bestseller-watch',
    'tl-notes',
    'tl-visit-note',
    'tl-save-visit-btn',
    'tl-submit-visit-btn'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el && !wrap) _setClosestWrapDisplay(el, show);
  });
}

function _fillTLStaticDisplays(row) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '-';
  };

  if (!row) {
    setText('tl-account-display', '-');
    setText('tl-branch-display', '-');
    setText('tl-segment-display', '-');
    setText('tl-march-sales-display', '-');
    setText('tl-april-sales-display', '-');
    return;
  }

  setText('tl-account-display', row.account_name || '-');
  setText('tl-branch-display', row.branch_name || '-');
  setText('tl-segment-display', row.segment || '-');
  setText('tl-march-sales-display', row.march_sales ?? '-');
  setText('tl-april-sales-display', row.april_sales ?? '-');
}

function _getSelectedTLCoverageRow() {
  return tlCoverageBranches.find(r => Number(r.id) === Number(tlCoverageBranchId)) || null;
}

function _selectTLCoverageRow(row) {
  if (!row) return;

  tlCoverageBranchId = Number(row.id);
  _fillTLStaticDisplays(row);
  _toggleTLFormDetails(true);

  const listItems = document.querySelectorAll('.coverage-branch-item');
  listItems.forEach(item => {
    const active = Number(item.getAttribute('data-branch-id')) === Number(tlCoverageBranchId);
    item.classList.toggle('selected', active);
  });

  const selectEl = document.getElementById('tl-visit-branch');
  if (selectEl) selectEl.value = String(tlCoverageBranchId);
}

function _resetTLSelection() {
  tlCoverageBranchId = null;

  const listItems = document.querySelectorAll('.coverage-branch-item');
  listItems.forEach(item => item.classList.remove('selected'));

  const selectEl = document.getElementById('tl-visit-branch');
  if (selectEl) selectEl.value = '';

  _fillTLStaticDisplays(null);
  _toggleTLFormDetails(false);
}

async function populateTLCoverageBranches() {
  const container = document.getElementById('tl-coverage-branches-list');
  const selectEl = document.getElementById('tl-visit-branch');

  if (container) container.style.display = 'none';

  if (!_isTeamLeaderUser()) {
    if (container) container.innerHTML = '';
    if (selectEl) selectEl.innerHTML = '<option value="">-- اختر الفرع --</option>';
    tlCoverageBranches = [];
    _resetTLSelection();
    return;
  }

  const employeeId = _getCurrentEmployeeId();

  if (!employeeId) {
    if (container) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">❌</div>تعذر تحديد ID التيم ليدر</div>';
    }
    if (selectEl) {
      selectEl.innerHTML = '<option value="">-- اختر الفرع --</option>';
    }
    console.warn('No employee id found in currentUser:', currentUser);
    tlCoverageBranches = [];
    _resetTLSelection();
    return;
  }

  try {
    const query =
      `?team_leader_id=eq.${employeeId}` +
      `&is_active=eq.true` +
      `&order=account_name.asc,branch_name.asc` +
      `&select=id,team_leader_id,account_name,branch_name,segment,march_sales,april_sales`;

    const data = await dbGet('coverage_branches', query).catch(err => {
      console.error('dbGet coverage_branches error:', err);
      return [];
    });

    tlCoverageBranches = Array.isArray(data) ? data : [];

    if (container) _renderTLCoverageBranchList(container, tlCoverageBranches);
    if (selectEl) _renderTLCoverageBranchSelect(selectEl, tlCoverageBranches);

    if (!tlCoverageBranches.length) {
      _resetTLSelection();
      return;
    }

    const selectedRow = _getSelectedTLCoverageRow();
    if (selectedRow) {
      _selectTLCoverageRow(selectedRow);
      return;
    }

    if (tlCoverageBranches.length === 1) {
      _selectTLCoverageRow(tlCoverageBranches[0]);
      return;
    }

    _resetTLSelection();
  } catch (e) {
    console.error('Failed to load coverage branches:', e);
    tlCoverageBranches = [];
    if (container) {
      container.innerHTML = '<div class="empty"><div class="empty-icon">❌</div>خطأ في تحميل الفروع</div>';
    }
    if (selectEl) {
      selectEl.innerHTML = '<option value="">-- اختر الفرع --</option>';
    }
    _resetTLSelection();
  }
}

function populateTLVisitBranchSelect() {
  return populateTLCoverageBranches();
}

function selectTLCoverageBranch(idx) {
  const row = tlCoverageBranches[idx];
  if (!row) return;
  _selectTLCoverageRow(row);
}

function handleTLBranchSelectChange() {
  const selectEl = document.getElementById('tl-visit-branch');
  if (!selectEl) return;

  const branchId = Number(selectEl.value || 0);
  if (!branchId) {
    _resetTLSelection();
    return;
  }

  const row = tlCoverageBranches.find(r => Number(r.id) === branchId);
  if (row) _selectTLCoverageRow(row);
}

// ── EMPLOYEE VISITS ──────────────────────────────────────
function addVisitPhoto(e) {
  const ar = currentLang === 'ar';

  if (!_isEmployeeUser()) {
    if (e?.target) e.target.value = '';
    return _notifyViewOnly();
  }

  if (visitPhotos.length >= 3) {
    if (e?.target) e.target.value = '';
    return _notify(ar ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
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
    return _notify(
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
      <img src="${_escapeAttr(src)}" alt="">
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

  if (!_isEmployeeUser()) return _notifyViewOnly();

  if (!branch) return _notify(ar ? 'اختر الفرع' : 'Select branch', 'error');
  if (visitPhotos.length === 0) {
    return _notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');
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
      visit_date: typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10)
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

  const pm = _getPayrollMonthSafe();
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
  const cutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const cutoff =
    typeof fmtDate === 'function'
      ? fmtDate(cutoffDate)
      : cutoffDate.toISOString().slice(0, 10);

  const old = await dbGet('branch_visits', `?visit_date=lt.${cutoff}&select=id`).catch(() => []) || [];
  if (old.length === 0) return;

  for (const r of old) {
    await dbPatch('branch_visits', { photo1: null, photo2: null, photo3: null }, `?id=eq.${r.id}`);
  }

  console.log(`Cleared photos from ${old.length} old visits`);
}

// ── TEAM LEADER COVERAGE VISITS ──────────────────────────
function _syncTLPhotosArray() {
  tlVisitPhotos = [tlBeforePhoto, tlAfterPhoto].filter(Boolean);
}

function _inferTLPhotoKind(inputEl) {
  const explicitKind = inputEl?.getAttribute('data-photo-kind');
  if (explicitKind === 'before' || explicitKind === 'after') return explicitKind;

  const id = String(inputEl?.id || '').toLowerCase();

  if (id.includes('before')) return 'before';
  if (id.includes('after')) return 'after';

  return 'after';
}

function addTLVisitPhoto(e) {
  const ar = currentLang === 'ar';

  if (!_isTeamLeaderUser()) {
    if (e?.target) e.target.value = '';
    return _notifyViewOnly();
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
    return _notify(
      ar ? 'يجب رفع صورة الزيارة بالكاميرا فقط' : 'Visit photo must be captured using camera only',
      'error'
    );
  }

  const kind = _inferTLPhotoKind(input);

  compressImageFile(file, compressed => {
    if (kind === 'before') tlBeforePhoto = compressed;
    else tlAfterPhoto = compressed;

    _syncTLPhotosArray();
    renderTLPreviews();
  });

  input.value = '';
}

function renderTLPreviews() {
  const genericEl = document.getElementById('tl-visit-previews');
  const beforeBox = document.getElementById('tl-before-preview');
  const afterBox = document.getElementById('tl-after-preview');
  const canDelete = _isTeamLeaderUser();

  if (beforeBox) {
    beforeBox.innerHTML = tlBeforePhoto
      ? `
        <div class="photo-preview-wrap">
          <img src="${_escapeAttr(tlBeforePhoto)}" alt="before">
          ${canDelete ? `<button class="photo-preview-del" onclick="removeTLPhoto('before')">✕</button>` : ''}
        </div>
      `
      : '';
  }

  if (afterBox) {
    afterBox.innerHTML = tlAfterPhoto
      ? `
        <div class="photo-preview-wrap">
          <img src="${_escapeAttr(tlAfterPhoto)}" alt="after">
          ${canDelete ? `<button class="photo-preview-del" onclick="removeTLPhoto('after')">✕</button>` : ''}
        </div>
      `
      : '';
  }

  if (genericEl) {
    const cards = [];

    if (tlBeforePhoto) {
      cards.push(`
        <div class="photo-preview-wrap">
          <img src="${_escapeAttr(tlBeforePhoto)}" alt="before">
          <div class="photo-preview-label">Before</div>
          ${canDelete ? `<button class="photo-preview-del" onclick="removeTLPhoto('before')">✕</button>` : ''}
        </div>
      `);
    }

    if (tlAfterPhoto) {
      cards.push(`
        <div class="photo-preview-wrap">
          <img src="${_escapeAttr(tlAfterPhoto)}" alt="after">
          <div class="photo-preview-label">After</div>
          ${canDelete ? `<button class="photo-preview-del" onclick="removeTLPhoto('after')">✕</button>` : ''}
        </div>
      `);
    }

    genericEl.innerHTML = cards.join('');
  }

  const zone = document.getElementById('tl-visit-zone');
  if (zone) zone.style.display = 'none';
}

function removeTLPhoto(which) {
  if (!_isTeamLeaderUser()) return _notifyViewOnly();

  if (which === 'before') {
    tlBeforePhoto = null;
  } else if (which === 'after') {
    tlAfterPhoto = null;
  } else if (Number.isInteger(which)) {
    const ordered = [];
    if (tlBeforePhoto) ordered.push('before');
    if (tlAfterPhoto) ordered.push('after');
    const key = ordered[which];
    if (key === 'before') tlBeforePhoto = null;
    if (key === 'after') tlAfterPhoto = null;
  }

  _syncTLPhotosArray();
  renderTLPreviews();
}

function _getTLInputValue(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const val = typeof el.value === 'string' ? el.value.trim() : '';
    if (val !== '') return val;
  }
  return '';
}

function _getSelectedCoverageBranchIdFromUI() {
  if (tlCoverageBranchId) return Number(tlCoverageBranchId);

  const selectEl = document.getElementById('tl-visit-branch');
  if (selectEl && selectEl.value) {
    const n = Number(selectEl.value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

async function submitTLVisit() {
  const ar = currentLang === 'ar';
  const employeeId = _getCurrentEmployeeId();
  const selectedBranchId = _getSelectedCoverageBranchIdFromUI();

  if (!_isTeamLeaderUser()) return _notifyViewOnly();
  if (!employeeId) return _notify(ar ? 'تعذر تحديد ID التيم ليدر' : 'Unable to detect team leader id', 'error');
  if (!selectedBranchId) return _notify(ar ? 'اختر فرع للزيارة' : 'Select a branch to visit', 'error');
  if (!tlAfterPhoto) return _notify(ar ? 'أضف صورة بعد التعديل (After Photo)' : 'Add After Photo', 'error');

  const keyModel = _getTLInputValue('tl-key-model');
  const stockRaw = _getTLInputValue('tl-stock-qty');
  const bestEarbuds = _getTLInputValue('tl-bestseller-earbuds');
  const bestWatch = _getTLInputValue('tl-bestseller-watch');
  const notes = _getTLInputValue('tl-notes', 'tl-visit-note');

  let totalStockQty = null;
  if (stockRaw !== '') {
    const parsed = Number(stockRaw);
    totalStockQty = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  }

  try {
    await dbPost('coverage_branch_visits', {
      coverage_branch_id: Number(selectedBranchId),
      team_leader_id: Number(employeeId),
      key_model_sales: keyModel || null,
      total_stock_qty: totalStockQty,
      before_photo_url: tlBeforePhoto || null,
      after_photo_url: tlAfterPhoto || null,
      best_seller_earbuds: bestEarbuds || null,
      best_seller_smart_watch: bestWatch || null,
      notes: notes || null,
      visited_at: new Date().toISOString()
    });

    _notify(ar ? 'تم حفظ الزيارة ✅' : 'Coverage visit saved ✅', 'success');

    tlBeforePhoto = null;
    tlAfterPhoto = null;
    _syncTLPhotosArray();
    renderTLPreviews();

    [
      'tl-key-model',
      'tl-stock-qty',
      'tl-bestseller-earbuds',
      'tl-bestseller-watch',
      'tl-notes',
      'tl-visit-note'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    _resetTLSelection();
    await populateTLCoverageBranches();
    await loadTLVisitsTab();
  } catch (e) {
    console.error('submitTLVisit error:', e);
    _notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  }
}

function _renderTLVisitCard(v, showOwner = false) {
  const branch = v.coverage_branch || {};
  const accountName = branch.account_name || '';
  const branchName = branch.branch_name || '';
  const segment = branch.segment || '';
  const marchSales = branch.march_sales ?? '-';
  const aprilSales = branch.april_sales ?? '-';
  const ownerLine = showOwner
    ? `<div class="visit-meta">👤 TL ID: ${_escapeHtml(v.team_leader_id ?? '')}</div>`
    : '';

  return `
    <div class="visit-card coverage-card">
      <div class="visit-header">
        <div>
          <div class="visit-branch-name">🏪 ${_escapeHtml(branchName)}</div>
          <div class="visit-meta">${_escapeHtml(accountName)}</div>
          ${segment ? `<div class="visit-meta"><span class="badge ${String(segment).toLowerCase()}">${_escapeHtml(segment)}</span></div>` : ''}
          <div class="visit-meta">${_escapeHtml(v.visited_at ? new Date(v.visited_at).toLocaleString('ar-EG') : '')}</div>
          ${ownerLine}
        </div>
        <span class="badge badge-green">${v.after_photo_url ? '📷' : '❌'}</span>
      </div>

      <div class="visit-stats">
        <div class="stat-box">
          <span class="label">March Sales</span>
          <span class="value">${_escapeHtml(marchSales)}</span>
        </div>
        <div class="stat-box">
          <span class="label">April Sales</span>
          <span class="value">${_escapeHtml(aprilSales)}</span>
        </div>
      </div>

      ${v.key_model_sales ? `<div class="visit-note">📦 Key Model: ${_escapeHtml(v.key_model_sales)}</div>` : ''}
      ${v.total_stock_qty !== null && v.total_stock_qty !== undefined ? `<div class="visit-note">📊 Stock Qty: ${_escapeHtml(v.total_stock_qty)}</div>` : ''}
      ${v.best_seller_earbuds ? `<div class="visit-note">🎧 Best Seller Earbuds: ${_escapeHtml(v.best_seller_earbuds)}</div>` : ''}
      ${v.best_seller_smart_watch ? `<div class="visit-note">⌚ Best Seller Smart Watch: ${_escapeHtml(v.best_seller_smart_watch)}</div>` : ''}
      ${v.notes ? `<div class="visit-note">📝 ${_escapeHtml(v.notes)}</div>` : ''}

      ${(v.before_photo_url || v.after_photo_url) ? `
        <div class="visit-photos-row">
          ${v.before_photo_url ? _safeImg(v.before_photo_url, 'visit-photo', 'before') : ''}
          ${v.after_photo_url ? _safeImg(v.after_photo_url, 'visit-photo', 'after') : ''}
        </div>
      ` : ''}
    </div>
  `;
}

async function loadTLVisitsTab() {
  await populateTLCoverageBranches();

  const doneEl = document.getElementById('tl-vis-done');
  const remEl = document.getElementById('tl-vis-remain');
  const cntEl = document.getElementById('tl-visit-count');
  const el = document.getElementById('tl-visit-history');

  if (!el) return;

  // TEAM LEADER
  if (_isTeamLeaderUser()) {
    _showTLUploadUI();
    _setTLVisitsHeader();

    const employeeId = _getCurrentEmployeeId();
    if (!employeeId) {
      if (doneEl) doneEl.textContent = '0';
      if (remEl) remEl.textContent = '0';
      if (cntEl) cntEl.textContent = '0 / 150';
      el.innerHTML = '<div class="empty"><div class="empty-icon">❌</div>تعذر تحديد ID التيم ليدر</div>';
      return;
    }

    const range = _getPayrollTimestampRange();
    const select =
      'id,coverage_branch_id,team_leader_id,key_model_sales,total_stock_qty,before_photo_url,after_photo_url,best_seller_earbuds,best_seller_smart_watch,notes,visited_at,coverage_branch:coverage_branches(id,account_name,branch_name,segment,march_sales,april_sales)';

    const visits = await dbGet(
      'coverage_branch_visits',
      `?team_leader_id=eq.${employeeId}&visited_at=gte.${range.startEncoded}&visited_at=lt.${range.endExclusiveEncoded}&order=visited_at.desc&select=${select}`
    ).catch(err => {
      console.error('loadTLVisitsTab team leader error:', err);
      return [];
    }) || [];

    const done = visits.length;
    const remain = Math.max(0, 150 - done);

    if (doneEl) doneEl.textContent = String(done);
    if (remEl) remEl.textContent = String(remain);
    if (cntEl) cntEl.textContent = done + ' / 150';

    if (!visits.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
      return;
    }

    el.innerHTML = visits.map(v => _renderTLVisitCard(v, false)).join('');
    return;
  }

  // ADMIN / SUPER ADMIN
  if (_isAdminReviewUser()) {
    _hideTLUploadUI();
    _setAdminVisitsHeader();

    const range = _getPayrollTimestampRange();
    const select =
      'id,coverage_branch_id,team_leader_id,key_model_sales,total_stock_qty,before_photo_url,after_photo_url,best_seller_earbuds,best_seller_smart_watch,notes,visited_at,coverage_branch:coverage_branches(id,account_name,branch_name,segment,march_sales,april_sales)';

    const visits = await dbGet(
      'coverage_branch_visits',
      `?visited_at=gte.${range.startEncoded}&visited_at=lt.${range.endExclusiveEncoded}&order=visited_at.desc&select=${select}`
    ).catch(err => {
      console.error('loadTLVisitsTab admin error:', err);
      return [];
    }) || [];

    const totalVisits = visits.length;
    const totalPhotos = visits.reduce((sum, v) => {
      let c = 0;
      if (v.before_photo_url) c++;
      if (v.after_photo_url) c++;
      return sum + c;
    }, 0);

    if (doneEl) doneEl.textContent = String(totalVisits);
    if (remEl) remEl.textContent = String(totalPhotos);
    if (cntEl) cntEl.textContent = String(totalVisits);

    if (!visits.length) {
      el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
      return;
    }

    el.innerHTML = visits.map(v => _renderTLVisitCard(v, true)).join('');
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
    return _notify(
      currentLang === 'ar' ? 'مدخل الكاميرا غير موجود' : 'Camera input not found',
      'error'
    );
  }

  _setCameraAttrs(input);

  if (visitPhotos.length >= 3) {
    return _notify(
      currentLang === 'ar' ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos',
      'error'
    );
  }

  input.value = '';
  input.click();
}

function openTLVisitCamera(kind = 'after') {
  if (!_isTeamLeaderUser()) return _notifyViewOnly();

  let input = null;

  if (kind === 'before') {
    input =
      document.getElementById('tl-before-input') ||
      document.getElementById('tl-before-photo-input');
  } else {
    input =
      document.getElementById('tl-after-input') ||
      document.getElementById('tl-after-photo-input') ||
      document.getElementById('tl-visit-input');
  }

  if (!input) {
    return _notify(
      currentLang === 'ar' ? 'مدخل الكاميرا غير موجود' : 'Camera input not found',
      'error'
    );
  }

  input.setAttribute('data-photo-kind', kind);
  _setCameraAttrs(input);
  input.value = '';
  input.click();
}

function showPhotoSourceModal(inputId) {
  if (inputId === 'tl-before-input' || inputId === 'tl-before-photo-input') {
    openTLVisitCamera('before');
    return;
  }

  if (inputId === 'tl-after-input' || inputId === 'tl-after-photo-input' || inputId === 'tl-visit-input') {
    openTLVisitCamera('after');
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
  _injectVisitsStyles();
  _ensureCameraAttrsOnKnownInputs();

  if (_isEmployeeUser()) _showEmployeeUploadUI();
  else _hideEmployeeUploadUI();

  if (_isTeamLeaderUser()) _showTLUploadUI();
  else _hideTLUploadUI();

  populateVisitBranchSelect();
  populateTLCoverageBranches();
  renderVisitPhotoPreviews();
  renderTLPreviews();

  const tlSelect = document.getElementById('tl-visit-branch');
  if (tlSelect && !tlSelect.dataset.boundChange) {
    tlSelect.addEventListener('change', handleTLBranchSelectChange);
    tlSelect.dataset.boundChange = '1';
  }

  _toggleTLFormDetails(false);
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
window.populateTLVisitBranchSelect = populateTLVisitBranchSelect;
window.selectTLCoverageBranch = selectTLCoverageBranch;
window.handleTLBranchSelectChange = handleTLBranchSelectChange;
window.initVisitsModule = initVisitsModule;

// auto init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    try { initVisitsModule(); } catch (e) { console.error('initVisitsModule error:', e); }
  }, { once: true });
} else {
  setTimeout(() => {
    try { initVisitsModule(); } catch (e) { console.error('initVisitsModule error:', e); }
  }, 0);
}
