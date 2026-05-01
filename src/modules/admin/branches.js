// ═══════════════════════════════════════════════════════════
// modules/admin/branches.js — Branches CRUD + tier dashboard + CSV upload
// Provides globals: loadBranches, renderBranches, populateBranchSelects,
//   openAddBranch, openEditBranch, saveBranch, deleteBranch,
//   initBranchDashboard, renderTierList, renderNoSalesList,
//   branchDashTab, handleBranchUpload, renderUploadHistory
// Depends on: BRANCH_DATA (from data.js)
// Safe version to avoid null crashes and global redeclare conflicts
// ═══════════════════════════════════════════════════════════

(() => {
  window.allBranches = Array.isArray(window.allBranches) ? window.allBranches : [];

  if (!Array.isArray(window.uploadHistory)) {
    try {
      window.uploadHistory = JSON.parse(localStorage.getItem('oraimo_upload_history') || '[]');
      if (!Array.isArray(window.uploadHistory)) window.uploadHistory = [];
    } catch (_) {
      window.uploadHistory = [];
    }
  }

  function _branchLangAr() {
    return window.currentLang === 'ar';
  }

  function _branchData() {
    return Array.isArray(window.BRANCH_DATA) ? window.BRANCH_DATA : [];
  }

  function _branchNotify(msg, type = 'error') {
    if (typeof window.notify === 'function') {
      window.notify(msg, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](msg);
    }
  }

  function _branchFmtEGP(v) {
    if (typeof window.fmtEGP === 'function') {
      try { return window.fmtEGP(v); } catch (_) {}
    }
    return Number(v || 0).toLocaleString('en-US');
  }

  function _branchEscapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _branchEscapeJs(str) {
    return String(str ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ');
  }

  function _branchSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? '');
  }

  function _branchSetHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function _branchSetStyle(id, prop, value) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = value;
  }

  function _branchNum(v) {
    return Number(v || 0);
  }

  // ── BRANCHES CRUD ──
  async function loadBranches() {
    try {
      window.allBranches = await window.dbGet('branches', '?select=*&order=name') || [];
      renderBranches();
      populateBranchSelects();
    } catch (e) {
      console.error('[branches] loadBranches', e);
    }
  }

  function renderBranches() {
    const el = document.getElementById('branches-list');
    if (!el) return;

    const ar = _branchLangAr();
    const list = Array.isArray(window.allBranches) ? window.allBranches : [];

    if (!list.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px">${ar ? 'لا توجد فروع' : 'No branches'}</div>`;
      return;
    }

    el.innerHTML = list.map(b => `
      <div class="emp-card">
        <div class="emp-info">
          <div class="emp-name">🏪 ${_branchEscapeHtml(b.name)}</div>
        </div>
        <div class="emp-actions">
          <button class="action-btn edit" onclick="openEditBranch(${Number(b.id)},'${_branchEscapeJs(b.name)}')">✏️</button>
          <button class="action-btn del" onclick="deleteBranch(${Number(b.id)})">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function populateBranchSelects() {
    const options = (Array.isArray(window.allBranches) ? window.allBranches : [])
      .map(b => `<option value="${_branchEscapeHtml(b.name)}">${_branchEscapeHtml(b.name)}</option>`)
      .join('');

    [
      'emp-form-branch',
      'visit-branch',
      'branch-select',
      'coverage-branch-select'
    ].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.innerHTML = options;
    });
  }

  function openAddBranch() {
    const ar = _branchLangAr();
    const titleEl = document.getElementById('branch-modal-title');
    const nameEl = document.getElementById('branch-form-name');
    const idEl = document.getElementById('edit-branch-id');

    if (titleEl) titleEl.textContent = ar ? 'إضافة فرع' : 'Add Branch';
    if (nameEl) nameEl.value = '';
    if (idEl) idEl.value = '';

    if (typeof window.openModal === 'function') {
      window.openModal('add-branch-modal');
    }
  }

  function openEditBranch(id, name) {
    const ar = _branchLangAr();
    const titleEl = document.getElementById('branch-modal-title');
    const nameEl = document.getElementById('branch-form-name');
    const idEl = document.getElementById('edit-branch-id');

    if (titleEl) titleEl.textContent = ar ? 'تعديل الفرع' : 'Edit Branch';
    if (nameEl) nameEl.value = name || '';
    if (idEl) idEl.value = id || '';

    if (typeof window.openModal === 'function') {
      window.openModal('add-branch-modal');
    }
  }

  async function saveBranch() {
    const nameEl = document.getElementById('branch-form-name');
    const idEl = document.getElementById('edit-branch-id');
    const name = (nameEl?.value || '').trim();
    const id = idEl?.value || '';
    const ar = _branchLangAr();

    if (!name) {
      _branchNotify(ar ? 'أدخل اسم الفرع' : 'Enter branch name', 'error');
      return;
    }

    try {
      if (id) {
        await window.dbPatch('branches', { name }, `?id=eq.${id}`);
      } else {
        await window.dbPost('branches', { name });
      }

      _branchNotify(ar ? 'تم الحفظ ✅' : 'Saved ✅', 'success');

      if (typeof window.closeModal === 'function') {
        window.closeModal('add-branch-modal');
      }

      await loadBranches();
    } catch (e) {
      console.error('[branches] saveBranch', e);
      _branchNotify(ar ? 'حدث خطأ أثناء الحفظ' : 'Save failed', 'error');
    }
  }

  async function deleteBranch(id) {
    const ar = _branchLangAr();
    if (!confirm(ar ? 'حذف الفرع؟' : 'Delete branch?')) return;

    try {
      await window.dbDelete('branches', `?id=eq.${id}`);
      await loadBranches();
    } catch (e) {
      console.error('[branches] deleteBranch', e);
      _branchNotify(ar ? 'تعذر حذف الفرع' : 'Delete failed', 'error');
    }
  }

  // ── BRANCH TIER DASHBOARD + CSV UPLOAD ──
  function initBranchDashboard() {
    const data = _branchData();
    const ar = _branchLangAr();

    const sTier = data.filter(b => b.tier === 'S');
    const aTier = data.filter(b => b.tier === 'A');
    const bTier = data.filter(b => b.tier === 'B');
    const noSales = data.filter(b => b.tier === 'NO_SALES');

    _branchSetText('kpi-s-count', sTier.length);
    _branchSetText('kpi-a-count', aTier.length);
    _branchSetText('kpi-b-count', bTier.length);

    const totalCurr = data.reduce((s, b) => s + _branchNum(b.revenue), 0);
    const totalPrev = data.reduce((s, b) => s + _branchNum(b.prev_revenue), 0);
    const totalChange = totalPrev > 0 ? ((totalCurr - totalPrev) / totalPrev * 100) : 0;

    _branchSetText('kpi-curr-rev', 'EGP ' + _branchFmtEGP(totalCurr));
    _branchSetText('kpi-prev-rev', 'EGP ' + _branchFmtEGP(totalPrev));

    const chEl = document.getElementById('kpi-change');
    if (chEl) {
      chEl.textContent = (totalChange >= 0 ? '+' : '') + totalChange.toFixed(1) + '%';
      chEl.style.color = totalChange >= 0 ? 'var(--green)' : 'var(--red)';
    }

    const top10 = data.filter(b => _branchNum(b.revenue) > 0).slice(0, 10);
    const maxR = top10[0]?.revenue || 1;

    _branchSetHTML('branch-top-list', top10.map((b, i) => {
      const chg = _branchNum(b.prev_revenue) > 0
        ? ((_branchNum(b.revenue) - _branchNum(b.prev_revenue)) / _branchNum(b.prev_revenue) * 100)
        : null;

      const tierBadge = b.tier === 'S'
        ? '<span class="tier-s">S 🥇</span>'
        : b.tier === 'A'
          ? '<span class="tier-a">A 🥈</span>'
          : '<span class="tier-b">B 🥉</span>';

      const pct = Math.max(4, Math.round((_branchNum(b.revenue) / maxR) * 100));
      const medals = ['🥇', '🥈', '🥉'];

      return `
        <div class="branch-card tier-${String(b.tier || '').toLowerCase()}-card">
          <div style="display:flex;align-items:center;margin-bottom:8px">
            <span style="font-size:16px;margin-left:6px">${medals[i] || '#' + (i + 1)}</span>
            <div class="branch-name">${_branchEscapeHtml(b.name)}</div>
            ${tierBadge}
          </div>

          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">
            <span style="color:var(--green);font-weight:800">EGP ${_branchFmtEGP(b.revenue)}</span>
            ${chg !== null ? `<span class="${chg >= 0 ? 'change-up' : 'change-down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(0)}%</span>` : ''}
          </div>

          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px">
            <span>${ar ? 'سابقاً:' : 'Prev:'} EGP ${_branchFmtEGP(b.prev_revenue)}</span>
            <span>${ar ? 'كمية:' : 'Qty:'} ${_branchNum(b.qty)}</span>
          </div>

          <div class="target-bar">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--green),#00e676);border-radius:4px;transition:width .6s"></div>
          </div>
        </div>
      `;
    }).join(''));

    _branchSetText(
      's-tier-subtitle',
      ar
        ? `${sTier.length} فرع · EGP ${_branchFmtEGP(sTier[0]?.revenue || 0)} → EGP ${_branchFmtEGP(sTier[sTier.length - 1]?.revenue || 0)}`
        : `${sTier.length} branches · EGP ${_branchFmtEGP(sTier[0]?.revenue || 0)} → EGP ${_branchFmtEGP(sTier[sTier.length - 1]?.revenue || 0)}`
    );

    _branchSetText(
      'a-tier-subtitle',
      ar
        ? `${aTier.length} فرع · EGP ${_branchFmtEGP(aTier[0]?.revenue || 0)} → EGP ${_branchFmtEGP(aTier[aTier.length - 1]?.revenue || 0)}`
        : `${aTier.length} branches`
    );

    _branchSetText(
      'b-tier-subtitle',
      ar
        ? `${bTier.length} فرع · EGP ${_branchFmtEGP(bTier[0]?.revenue || 0)} → EGP ${_branchFmtEGP(bTier[bTier.length - 1]?.revenue || 0)}`
        : `${bTier.length} branches`
    );

    renderTierList('s-tier-list', sTier, 'S');
    renderTierList('a-tier-list', aTier, 'A');
    renderTierList('b-tier-list', bTier, 'B');
    renderNoSalesList(noSales);
    renderUploadHistory();
  }

  function renderTierList(elId, branches, tier) {
    const el = document.getElementById(elId);
    if (!el) return;

    const ar = _branchLangAr();
    const list = Array.isArray(branches) ? branches : [];
    const tierColor = tier === 'S' ? 'var(--gold)' : tier === 'A' ? 'var(--silver)' : 'var(--bronze)';
    const maxR = list[0]?.revenue || 1;

    if (!list.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px">${ar ? 'لا توجد بيانات' : 'No data'}</div>`;
      return;
    }

    el.innerHTML = list.map((b, i) => {
      const chg = _branchNum(b.prev_revenue) > 0
        ? ((_branchNum(b.revenue) - _branchNum(b.prev_revenue)) / _branchNum(b.prev_revenue) * 100)
        : null;

      const pct = Math.max(3, Math.round((_branchNum(b.revenue) / maxR) * 100));

      return `
        <div class="history-item">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
            <div style="font-size:12px;font-weight:700;flex:1">${i + 1}. ${_branchEscapeHtml(b.name)}</div>
            <div style="text-align:left;margin-right:6px">
              <div style="font-size:13px;font-weight:800;color:${tierColor}">EGP ${_branchFmtEGP(b.revenue)}</div>
              ${chg !== null ? `<div style="font-size:10px;font-weight:700;color:${chg >= 0 ? 'var(--green)' : 'var(--red)'};text-align:left">${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(0)}%</div>` : ''}
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:5px">
            <span>${ar ? 'سابقاً:' : 'Prev:'} EGP ${_branchFmtEGP(b.prev_revenue)}</span>
            <span>${ar ? 'كمية الشهر:' : 'Qty:'} ${_branchNum(b.qty)} / ${ar ? 'سابق:' : 'prev:'} ${_branchNum(b.prev_qty)}</span>
          </div>

          <div class="target-bar">
            <div style="height:100%;width:${pct}%;background:${tierColor};border-radius:4px;opacity:.85;transition:width .6s"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderNoSalesList(branches) {
    const el = document.getElementById('ns-tier-list');
    if (!el) return;

    const ar = _branchLangAr();
    const list = Array.isArray(branches) ? branches : [];

    if (!list.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px">${ar ? 'لا توجد بيانات' : 'No data'}</div>`;
      return;
    }

    el.innerHTML = list.map(b => `
      <div class="history-item" style="border-color:var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px;font-weight:700">🏪 ${_branchEscapeHtml(b.name)}</div>
          <span class="tier-ns">${ar ? 'بدون مبيعات' : 'No Sales'}</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">
          ${ar ? 'سابقاً:' : 'Prev:'} EGP ${_branchFmtEGP(b.prev_revenue)} · ${ar ? 'مخزون:' : 'Stock:'} ${_branchNum(b.stock)}
        </div>
      </div>
    `).join('');
  }

  function branchDashTab(tab, el) {
    ['overview', 's-tier', 'a-tier', 'b-tier', 'no-sales', 'upload'].forEach(t => {
      _branchSetStyle('branch-' + t, 'display', t === tab ? 'block' : 'none');
    });

    document.querySelectorAll('#branch-dash-tabs .tab').forEach(t => t.classList.remove('active'));
    if (el && el.classList) el.classList.add('active');
  }

  function handleBranchUpload(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const resultEl = document.getElementById('upload-result');
    const ar = _branchLangAr();

    if (resultEl) {
      resultEl.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const text = String(e?.target?.result || '');
        const lines = text.split(/\r?\n/).filter(l => l.trim());

        if (lines.length < 2) {
          if (resultEl) {
            resultEl.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px">${ar ? 'الملف فارغ' : 'Empty file'}</div>`;
          }
          return;
        }

        const parsed = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 2 && cols[0].trim() && !isNaN(cols[1])) {
            parsed.push({
              name: cols[0].trim(),
              sales: parseInt(cols[1], 10) || 0
            });
          }
        }

        if (!parsed.length) {
          if (resultEl) {
            resultEl.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px">${ar ? 'لم يتم التعرف على أي بيانات' : 'No data recognized'}</div>`;
          }
          return;
        }

        const record = {
          date: new Date().toLocaleDateString('en-GB'),
          file: file.name,
          count: parsed.length,
          data: parsed
        };

        window.uploadHistory.unshift(record);
        if (window.uploadHistory.length > 10) {
          window.uploadHistory = window.uploadHistory.slice(0, 10);
        }

        localStorage.setItem('oraimo_upload_history', JSON.stringify(window.uploadHistory));

        if (resultEl) {
          resultEl.innerHTML = `
            <div class="card" style="border-color:var(--green);margin-top:8px">
              <div style="color:var(--green);font-weight:700;margin-bottom:6px">✅ ${ar ? 'تم رفع الملف' : 'File uploaded'}</div>
              <div style="font-size:12px;color:var(--muted)">${parsed.length} ${ar ? 'فرع' : 'branches'}</div>
              ${parsed.slice(0, 5).map(p => `<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">${_branchEscapeHtml(p.name)}: ${_branchNum(p.sales)}</div>`).join('')}
            </div>
          `;
        }

        renderUploadHistory();
        _branchNotify(`✅ ${parsed.length} ${ar ? 'فرع' : 'branches'}`, 'success');
      } catch (err) {
        if (resultEl) {
          resultEl.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px">${ar ? 'خطأ في قراءة الملف' : 'File read error'}: ${_branchEscapeHtml(err?.message || err)}</div>`;
        }
      }
    };

    reader.readAsText(file, 'UTF-8');
    if (event.target) event.target.value = '';
  }

  function renderUploadHistory() {
    const el = document.getElementById('upload-history-list');
    if (!el) return;

    const ar = _branchLangAr();

    if (!Array.isArray(window.uploadHistory) || !window.uploadHistory.length) {
      el.innerHTML = `<div style="color:var(--muted);font-size:12px">${ar ? 'لا يوجد سجل بعد' : 'No history yet'}</div>`;
      return;
    }

    el.innerHTML = window.uploadHistory.map(r => `
      <div class="history-item" style="margin-bottom:6px">
        <div class="hist-top">
          <div class="hist-name">${_branchEscapeHtml(r.file)}</div>
          <span class="badge badge-green">${_branchNum(r.count)} ${ar ? 'فرع' : 'br'}</span>
        </div>
        <div class="hist-meta">${_branchEscapeHtml(r.date)}</div>
      </div>
    `).join('');
  }

  Object.assign(window, {
    loadBranches,
    renderBranches,
    populateBranchSelects,
    openAddBranch,
    openEditBranch,
    saveBranch,
    deleteBranch,
    initBranchDashboard,
    renderTierList,
    renderNoSalesList,
    branchDashTab,
    handleBranchUpload,
    renderUploadHistory
  });
})();
