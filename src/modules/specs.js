// ═══════════════════════════════════════════════════════════
// modules/specs.js — Improved Oraimo models UI
// ═══════════════════════════════════════════════════════════

// حماية من عدم تحميل الداتا
let filteredSpecs = Array.isArray(window.ORAIMO_SPECS) ? [...ORAIMO_SPECS] : [];

// ═════════════ FILTER ═════════════
function filterSpecs() {
  const input = document.getElementById('specs-search');
  const q = (input?.value || '').toLowerCase().trim();

  if (!Array.isArray(ORAIMO_SPECS)) {
    filteredSpecs = [];
  } else {
    filteredSpecs = q
      ? ORAIMO_SPECS.filter(s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.cat || '').toLowerCase().includes(q)
        )
      : [...ORAIMO_SPECS];
  }

  renderSpecsList();
}

// ═════════════ RENDER ═════════════
function renderSpecsList() {
  const el = document.getElementById('specs-list');
  if (!el) return;

  if (!filteredSpecs.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--muted)">
        😕 لا توجد نتائج
      </div>`;
    return;
  }

  // grouping
  const cats = {};
  filteredSpecs.forEach(s => {
    const cat = s.cat || 'Other';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(s);
  });

  el.innerHTML = Object.entries(cats).map(([cat, items]) => `
    <div style="margin-bottom:12px">

      <!-- Category -->
      <div style="
        font-size:12px;
        font-weight:800;
        color:var(--muted);
        margin-bottom:8px;
        padding-bottom:6px;
        border-bottom:1px solid var(--border)">
        ${cat}
      </div>

      <!-- Items -->
      ${items.map(s => `
        <div class="spec-card"
             onclick="showSpecDetail('${escapeStr(s.name)}')"
             style="
              background:linear-gradient(145deg,#15151c,#0d0d13);
              border:1px solid rgba(255,255,255,.06);
              border-radius:16px;
              padding:14px;
              margin-bottom:8px;
              cursor:pointer;
              position:relative;
              overflow:hidden;
              transition:.2s">

          <div style="
            position:absolute;
            right:0;
            top:0;
            width:4px;
            height:100%;
            background:${s.color || '#00C853'}">
          </div>

          <div style="display:flex;align-items:center;gap:12px">

            <div style="
              width:48px;
              height:48px;
              border-radius:14px;
              background:${(s.color || '#00C853')}22;
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:24px;
              border:1px solid ${(s.color || '#00C853')}44">
              ${s.img || '📦'}
            </div>

            <div style="flex:1">
              <div style="font-size:13px;font-weight:800">
                ${(s.name || '').replace('Oraimo ', '')}
              </div>
              <div style="font-size:12px;color:var(--muted)">
                ${s.cat || ''}
              </div>
            </div>

            <div style="text-align:right">
              <div style="color:${s.color || '#00C853'};font-weight:900">
                EGP ${(s.price || 0).toLocaleString()}
              </div>
              <div style="font-size:16px;color:var(--muted)">›</div>
            </div>

          </div>
        </div>
      `).join('')}

    </div>
  `).join('');
}

// ═════════════ DETAIL MODAL ═════════════
function showSpecDetail(name) {
  const s = (ORAIMO_SPECS || []).find(x => x.name === name);
  if (!s) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.9);
    z-index:9999;
    display:flex;
    align-items:flex-end`;

  overlay.innerHTML = `
    <div style="
      width:100%;
      background:#111;
      border-radius:20px 20px 0 0;
      padding:20px;
      max-height:90vh;
      overflow:auto">

      <h2 style="margin-bottom:10px">
        ${(s.name || '').replace('Oraimo ', '')}
      </h2>

      <div style="color:${s.color || '#00C853'};font-weight:bold;margin-bottom:10px">
        EGP ${(s.price || 0).toLocaleString()}
      </div>

      <div style="margin-bottom:12px">
        ${(s.specs || []).map(x => `<div>• ${x}</div>`).join('')}
      </div>

      <div style="margin-bottom:12px">
        ${(s.sell || []).map(x => `<div>🔥 ${x}</div>`).join('')}
      </div>

      <button onclick="this.closest('div[style*=fixed]').remove()"
        style="width:100%;padding:12px;border:none;border-radius:12px;background:#00C853;font-weight:bold">
        إغلاق
      </button>
    </div>
  `;

  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

// ═════════════ HELPERS ═════════════
function escapeStr(str) {
  return (str || '').replace(/'/g, "\\'");
}

// ═════════════ GLOBALS (مهم جدًا) ═════════════
window.renderSpecsList = renderSpecsList;
window.filterSpecs = filterSpecs;
window.showSpecDetail = showSpecDetail;
