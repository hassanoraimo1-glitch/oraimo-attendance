// ═══════════════════════════════════════════════════════════
// modules/specs.js — Oraimo models database UI (Specs tab)
// ═══════════════════════════════════════════════════════════

let filteredSpecs = [...ORAIMO_SPECS];

// 1. تصفية المنتجات بناءً على البحث
window.filterSpecs = function() {
  const q = (document.getElementById('specs-search')?.value || '').toLowerCase();
  filteredSpecs = q 
    ? ORAIMO_SPECS.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.cat.toLowerCase().includes(q) || 
        s.code.toLowerCase().includes(q)
      ) 
    : ORAIMO_SPECS;
  renderSpecsList();
};

// 2. رندر القائمة الرئيسية للمواصفات
window.renderSpecsList = function() {
  const el = document.getElementById('specs-list');
  if (!el) return;
  
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'ar';
  
  // تجميع المنتجات حسب الفئة
  const cats = {};
  filteredSpecs.forEach(s => {
    if (!cats[s.cat]) cats[s.cat] = [];
    cats[s.cat].push(s);
  });

  if (filteredSpecs.length === 0) {
    el.innerHTML = `<div style="text-align:center; padding:40px; opacity:0.5;">${lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No results found'}</div>`;
    return;
  }

  el.innerHTML = Object.entries(cats).map(([cat, items]) => `
    <div style="margin-bottom:20px">
      <div style="font-size:12px; font-weight:800; color:var(--muted); letter-spacing:1px; margin-bottom:10px; padding:4px 0; border-bottom:1px solid var(--border); text-transform:uppercase;">
        ${cat}
      </div>
      <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
        ${items.map(s => `
          <div class="spec-card" onclick="showSpecDetail('${s.name.replace(/'/g, "\\'")}')" 
               style="background:var(--card-bg); padding:15px; border-radius:12px; border:1px solid var(--border); cursor:pointer; position:relative; overflow:hidden;">
            <div style="position:absolute; left:0; top:0; bottom:0; width:4px; background:${s.color || 'var(--accent)'}"></div>
            <div style="font-weight:bold; font-size:15px; margin-bottom:4px;">${s.name}</div>
            <div style="font-size:11px; opacity:0.6;">${s.code}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
};

// 3. عرض تفاصيل المنتج في مودال (الهيكل الجديد)
window.showSpecDetail = function(name) {
  const s = ORAIMO_SPECS.find(x => x.name === name);
  if (!s) return;

  const lang = typeof currentLang !== 'undefined' ? currentLang : 'ar';

  const modalHtml = `
    <div style="padding:10px; color:var(--text); font-family:inherit;">
      
      <div style="text-align:center; margin-bottom:25px; padding-bottom:15px; border-bottom:1px solid var(--border)">
        <div style="display:inline-block; padding:5px 15px; border-radius:20px; background:${s.color}15; color:${s.color}; font-size:11px; font-weight:800; margin-bottom:10px; text-transform:uppercase;">
          ${s.cat}
        </div>
        <div style="font-size:22px; font-weight:900; color:var(--text); line-height:1.2;">${s.name}</div>
        <div style="font-size:13px; opacity:0.6; margin-top:5px;">Model: ${s.code}</div>
      </div>

      <div style="margin-bottom:20px">
        <div style="font-size:13px; font-weight:800; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span style="color:${s.color}">🛠️</span> ${lang === 'ar' ? 'المواصفات التقنية' : 'Technical Specs'}
        </div>
        <div style="display:grid; grid-template-columns: 1fr; gap:8px;">
          ${Object.entries(s.specs).map(([key, val]) => `
            <div style="background:var(--card-bg); padding:10px 15px; border-radius:10px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11px; opacity:0.5; text-transform:capitalize;">${key.replace('_', ' ')}</span>
              <span style="font-size:13px; font-weight:600;">${val[lang]}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:20px; background:${s.color}08; border-radius:15px; padding:15px; border:1px dashed ${s.color}44;">
        <div style="font-size:13px; font-weight:800; margin-bottom:12px; color:${s.color};">
          🏆 ${lang === 'ar' ? 'نقاط البيع القوية' : 'Strong Selling Points'}
        </div>
        ${s.sell.map(pt => `
          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:8px; font-size:13px; line-height:1.4;">
            <span style="color:${s.color}; font-weight:bold;">•</span>
            <span>${pt[lang]}</span>
          </div>
        `).join('')}
      </div>

      ${s.compare ? `
        <div style="background:#ff44440a; border-radius:15px; padding:15px; border:1px solid #ff444422;">
          <div style="font-size:13px; font-weight:800; margin-bottom:12px; color:#ff4444; display:flex; justify-content:space-between;">
            <span>⚔️ ${lang === 'ar' ? 'ضد المنافس' : 'Vs Competitor'}</span>
            <span style="font-size:11px; padding:2px 8px; background:#ff444422; border-radius:5px;">${s.compare.model}</span>
          </div>
          
          <div style="font-size:12px; margin-bottom:10px; padding:8px; background:rgba(0,0,0,0.2); border-radius:8px;">
            <b style="color:#ff4444">${lang === 'ar' ? 'سعر المنافس:' : 'Comp. Price:'}</b> ${s.compare.price[lang]}
          </div>

          ${s.compare.points.map(p => `
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; margin-bottom:6px;">
              <span style="color:#4CAF50">✅</span>
              <span>${p[lang]}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <button class="btn" onclick="closeModal()" style="width:100%; margin-top:20px; background:var(--border); color:var(--text); border:none;">
        ${lang === 'ar' ? 'إغلاق' : 'Close'}
      </button>
    </div>
  `;

  if (typeof showModal === 'function') {
    showModal(modalHtml);
  } else {
    // Fallback if showModal is not global
    const detailEl = document.getElementById('spec-detail-content');
    if (detailEl) {
      detailEl.innerHTML = modalHtml;
      document.getElementById('spec-detail-overlay').style.display = 'flex';
    }
  }
};
