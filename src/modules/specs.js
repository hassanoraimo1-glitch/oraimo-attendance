// ═══════════════════════════════════════════════════════════
// modules/specs.js — Oraimo models UI (bilingual {ar,en} + compare)
// List + detail use CSS classes (main.css) so light theme has no dark halos.
// ═══════════════════════════════════════════════════════════

let filteredSpecs = [...ORAIMO_SPECS];

function _t(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[currentLang] || v.ar || v.en || '';
}

function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function filterSpecs() {
  const q = (document.getElementById('specs-search')?.value || '').toLowerCase();
  filteredSpecs = q
    ? ORAIMO_SPECS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code || '').toLowerCase().includes(q) ||
          s.cat.toLowerCase().includes(q)
      )
    : ORAIMO_SPECS;
  renderSpecsList();
}

function renderSpecsList() {
  const el = document.getElementById('specs-list');
  if (!el) return;
  const cats = {};
  filteredSpecs.forEach((s) => {
    if (!cats[s.cat]) cats[s.cat] = [];
    cats[s.cat].push(s);
  });
  el.innerHTML = Object.entries(cats)
    .map(
      ([cat, items]) => `
    <div class="spec-cat-block" style="margin-bottom:8px">
      <div class="spec-cat-hdr">${_esc(cat)}</div>
      ${items
        .map((s) => {
          const safeName = s.name.replace(/'/g, "\\'");
          const accent = _esc(s.color || '#22c55e');
          return `
        <div class="spec-card spec-card--interactive" role="button" tabindex="0" style="--spec-accent:${accent}" onclick="showSpecDetail('${safeName}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showSpecDetail('${safeName}')}">
          <div class="spec-card__accent-bar" aria-hidden="true"></div>
          <div class="spec-card__row">
            <div class="spec-card__icon" aria-hidden="true">${s.img}</div>
            <div class="spec-card__body">
              <div class="spec-card__name">${_esc(s.name.replace('Oraimo ', ''))}</div>
              ${s.code ? `<div class="spec-card__code">${_esc(s.code)}</div>` : ''}
            </div>
            <div class="spec-card__chev" aria-hidden="true">›</div>
          </div>
        </div>`;
        })
        .join('')}
    </div>`
    )
    .join('');
}

function showSpecDetail(name) {
  const s = ORAIMO_SPECS.find((x) => x.name === name);
  if (!s) return;
  const ar = currentLang === 'ar';
  const accent = _esc(s.color || '#22c55e');

  let specsHtml = '';
  if (Array.isArray(s.specs)) {
    specsHtml = s.specs
      .map(
        (v) =>
          `<div class="spec-spec-line"><span class="spec-check">✓</span><span style="font-size:13px;line-height:1.5;color:var(--text)">${_esc(_t(v))}</span></div>`
      )
      .join('');
  } else if (typeof s.specs === 'object') {
    specsHtml = Object.values(s.specs)
      .map(
        (v) =>
          `<div class="spec-spec-line"><span class="spec-check">✓</span><span style="font-size:13px;line-height:1.5;color:var(--text)">${_esc(_t(v))}</span></div>`
      )
      .join('');
  }

  const sellHtml = (s.sell || [])
    .map(
      (pt, i) =>
        `<div class="spec-detail-sell-row">
      <span class="spec-detail-sell-num">${i + 1}</span>
      <span style="font-size:13px;line-height:1.5;color:var(--text)">${_esc(_t(pt))}</span>
    </div>`
    )
    .join('');

  let compareHtml = '';
  if (s.compare) {
    const c = s.compare;
    compareHtml = `<div class="spec-compare-box">
      <div class="spec-compare-title">⚔️ ${ar ? 'مقارنة مع' : 'vs'} ${_esc(_t(c.model) || c.model || '')}</div>
      ${c.price ? `<div style="font-size:12px;color:var(--muted);margin-bottom:10px">${ar ? 'سعر المنافس:' : 'Price:'} ${_esc(_t(c.price))}</div>` : ''}
      ${(c.points || [])
        .map(
          (p) =>
            `<div class="spec-spec-line"><span style="color:var(--green);flex-shrink:0">💪</span><span style="font-size:12px;line-height:1.5;color:var(--text)">${_esc(_t(p))}</span></div>`
        )
        .join('')}
    </div>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'spec-detail-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<div class="spec-detail-sheet" style="--spec-accent:${accent}">
    <div class="spec-detail-head">
      <div class="spec-detail-icon-lg" aria-hidden="true">${s.img}</div>
      <div class="spec-detail-meta">
        <div class="spec-detail-name">${_esc(s.name.replace('Oraimo ', ''))}</div>
        ${s.code ? `<div class="spec-card__code" style="margin-top:2px">${_esc(s.code)}</div>` : ''}
        <div class="spec-card__code" style="margin-top:2px">${_esc(s.cat)}</div>
      </div>
    </div>
    <div class="spec-detail-box">
      <div class="spec-detail-section-title">📋 ${ar ? 'المواصفات' : 'Specs'}</div>
      ${specsHtml}
    </div>
    <div class="spec-detail-sell-wrap">
      <div class="spec-detail-section-title spec-detail-section-title--accent">🏆 ${ar ? 'نقاط البيع' : 'Selling Points'}</div>
      ${sellHtml}
    </div>
    ${compareHtml}
    <button type="button" class="spec-detail-close">${ar ? 'إغلاق' : 'Close'}</button>
  </div>`;

  const close = () => overlay.remove();
  overlay.querySelector('.spec-detail-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
}
