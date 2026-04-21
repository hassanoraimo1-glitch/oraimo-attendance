let filteredSpecs = [...ORAIMO_SPECS];

function filterSpecs(){
  const q=(document.getElementById('specs-search')?.value||'').toLowerCase();
  filteredSpecs=q?ORAIMO_SPECS.filter(s=>s.name.toLowerCase().includes(q)||s.cat.toLowerCase().includes(q)):ORAIMO_SPECS;
  renderSpecsList();
}

function renderSpecsList(){
  const el=document.getElementById('specs-list');if(!el)return;

  const cats={};
  filteredSpecs.forEach(s=>{
    if(!cats[s.cat]) cats[s.cat]=[];
    cats[s.cat].push(s);
  });

  el.innerHTML=Object.entries(cats).map(([cat,items])=>`
    <div style="margin-bottom:8px">
      <div style="font-size:12px;font-weight:800;color:var(--muted);margin-bottom:8px">${cat}</div>
      ${items.map(s=>`
        <div class="spec-card" onclick="showSpecDetail('${s.name}')"
        style="padding:14px;margin-bottom:8px;border-radius:16px;cursor:pointer;background:#111">
          
          <div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:22px">${s.img}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700">${s.name.replace('Oraimo ','')}</div>
              <div style="color:${s.color};font-weight:800">EGP ${s.price}</div>
            </div>
          </div>

        </div>
      `).join('')}
    </div>
  `).join('');
}

function showSpecDetail(name){
  const s=ORAIMO_SPECS.find(x=>x.name===name);
  if(!s) return;

  const ar=currentLang==='ar';

  const specsHTML = Object.entries(s.specs).map(([k,v])=>`
    <div>✓ ${ar ? v.ar : v.en}</div>
  `).join('');

  const sellHTML = s.sell.map((pt,i)=>`
    <div>${i+1}- ${ar ? pt.ar : pt.en}</div>
  `).join('');

  const compareHTML = `
    <div style="margin-top:10px">
      <b>${ar ? 'مقارنة:' : 'Comparison:'}</b>
      <div>${s.compare.model}</div>
      <div>${ar ? s.compare.price.ar : s.compare.price.en}</div>
      ${s.compare.points.map(p=>`<div>• ${ar ? p.ar : p.en}</div>`).join('')}
    </div>
  `;

  alert(`
${s.name}

${specsHTML}

${sellHTML}

${compareHTML}
`);
}
