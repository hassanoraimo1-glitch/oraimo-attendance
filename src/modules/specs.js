// ═══════════════════════════════════════════════════════════
// modules/specs.js — Oraimo models database UI (Specs tab)
// Provides globals: filterSpecs, renderSpecsList, showSpecDetail
// Depends on: ORAIMO_SPECS (from data.js)
// ═══════════════════════════════════════════════════════════

let filteredSpecs = [...ORAIMO_SPECS];

function filterSpecs(){
  const q=(document.getElementById('specs-search')?.value||'').toLowerCase();
  filteredSpecs=q?ORAIMO_SPECS.filter(s=>s.name.toLowerCase().includes(q)||s.cat.includes(q)):ORAIMO_SPECS;
  renderSpecsList();
}

function renderSpecsList(){
  const el=document.getElementById('specs-list');if(!el)return;
  const ar=currentLang==='ar';
  // Group by category
  const cats={};
  filteredSpecs.forEach(s=>{if(!cats[s.cat])cats[s.cat]=[];cats[s.cat].push(s);});
  el.innerHTML=Object.entries(cats).map(([cat,items])=>`
    <div style="margin-bottom:8px">
      <div style="font-size:12px;font-weight:800;color:var(--muted);letter-spacing:1px;margin-bottom:8px;padding:4px 0;border-bottom:1px solid var(--border)">${cat}</div>
      ${items.map(s=>`
        <div class="spec-card" onclick="showSpecDetail('${s.name.replace(/'/g,"\\'")}')" style="background:linear-gradient(145deg,#15151c,#0d0d13);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;margin-bottom:8px;cursor:pointer;transition:.15s;position:relative;overflow:hidden">
          <div style="position:absolute;top:0;right:0;width:3px;height:100%;background:${s.color};border-radius:0 16px 16px 0"></div>
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:48px;height:48px;border-radius:14px;background:${s.color}22;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;border:1px solid ${s.color}44">${s.img}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr">${s.name.replace('Oraimo ','')}</div>
              <div style="font-size:13px;color:${s.color};font-weight:900;margin-top:2px">EGP ${s.price.toLocaleString()}</div>
            </div>
            <div style="font-size:20px;color:var(--muted)">›</div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function showSpecDetail(name){
  const s=ORAIMO_SPECS.find(x=>x.name===name);if(!s)return;
  const ar=currentLang==='ar';
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(8px)';
  overlay.innerHTML=`<div style="background:linear-gradient(160deg,#15151c,#0a0a10);border-radius:24px 24px 0 0;padding:24px 20px;width:100%;max-height:88vh;overflow-y:auto;border-top:3px solid ${s.color};box-shadow:0 -20px 60px rgba(0,0,0,.6)">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:18px;background:${s.color}22;display:flex;align-items:center;justify-content:center;font-size:32px;border:2px solid ${s.color}44;flex-shrink:0">${s.img}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:800;direction:ltr;overflow:hidden;text-overflow:ellipsis">${s.name.replace('Oraimo ','')}</div>
        <div style="font-size:20px;font-weight:900;color:${s.color};margin-top:2px">EGP ${s.price.toLocaleString()}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.cat}</div>
      </div>
    </div>

    <div style="background:rgba(255,255,255,.03);border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid rgba(255,255,255,.06)">
      <div style="font-size:12px;font-weight:800;color:var(--muted);letter-spacing:1px;margin-bottom:12px">📋 المواصفات الرئيسية</div>
      ${s.specs.map(spec=>`<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
        <span style="color:${s.color};font-size:14px;margin-top:2px;flex-shrink:0">✓</span>
        <span style="font-size:13px;line-height:1.5">${spec}</span>
      </div>`).join('')}
    </div>

    <div style="background:${s.color}11;border-radius:16px;padding:16px;margin-bottom:20px;border:1px solid ${s.color}33">
      <div style="font-size:12px;font-weight:800;color:${s.color};letter-spacing:1px;margin-bottom:12px">🏆 نقاط البيع الأقوى</div>
      ${s.sell.map((pt,i)=>`<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;padding:8px;background:rgba(255,255,255,.03);border-radius:10px">
        <span style="background:${s.color};color:#000;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0;margin-top:1px">${i+1}</span>
        <span style="font-size:13px;line-height:1.5">${pt}</span>
      </div>`).join('')}
    </div>

    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:14px;background:linear-gradient(135deg,${s.color},${s.color}99);border:none;border-radius:16px;color:#000;font-family:Cairo,sans-serif;font-size:15px;font-weight:800;cursor:pointer">${ar?'إغلاق':'Close'}</button>
  </div>`;
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
}
