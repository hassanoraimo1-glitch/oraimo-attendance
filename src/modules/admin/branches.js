// ═══════════════════════════════════════════════════════════
// modules/admin/branches.js — Branches CRUD + tier dashboard + CSV upload
// Provides globals: loadBranches, renderBranches, populateBranchSelects,
//   openAddBranch, openEditBranch, saveBranch, deleteBranch,
//   initBranchDashboard, renderTierList, renderNoSalesList,
//   branchDashTab, handleBranchUpload, renderUploadHistory
// Depends on: BRANCH_DATA (from data.js)
// ═══════════════════════════════════════════════════════════

// ── BRANCHES CRUD ──
async function loadBranches(){
  try{
    allBranches=await dbGet('branches','?select=*&order=name')||[];
    try{window.branches=allBranches;}catch(_){}
    renderBranches();
    populateBranchSelects();
  }catch(e){
    console.error('[branches]', e);
    if(typeof notify==='function'){
      const ar=currentLang==='ar';
      notify(ar?'تعذر تحميل الفروع من السيرفر':'Could not load branches from server','error');
    }
  }
}
function renderBranches(){
  const el=document.getElementById('branches-list');if(!el)return;
  el.innerHTML=allBranches.map(b=>`<div class="emp-card"><div class="emp-info"><div class="emp-name">🏪 ${b.name}</div></div><div class="emp-actions"><button class="action-btn edit" onclick="openEditBranch(${b.id},'${b.name}')">✏️</button><button class="action-btn del" onclick="deleteBranch(${b.id})">🗑️</button></div></div>`).join('')||`<div style="color:var(--muted);font-size:12px">${currentLang==='ar'?'لا توجد فروع':'No branches'}</div>`;
}
function populateBranchSelects(){const sel=document.getElementById('emp-form-branch');if(sel)sel.innerHTML=allBranches.map(b=>`<option value="${b.name}">${b.name}</option>`).join('')}
function openAddBranch(){document.getElementById('branch-modal-title').textContent=currentLang==='ar'?'إضافة فرع':'Add Branch';document.getElementById('branch-form-name').value='';document.getElementById('edit-branch-id').value='';openModal('add-branch-modal')}
function openEditBranch(id,name){document.getElementById('branch-modal-title').textContent=currentLang==='ar'?'تعديل الفرع':'Edit Branch';document.getElementById('branch-form-name').value=name;document.getElementById('edit-branch-id').value=id;openModal('add-branch-modal')}
async function saveBranch(){const name=document.getElementById('branch-form-name').value.trim(),id=document.getElementById('edit-branch-id').value;const ar=currentLang==='ar';if(!name)return notify(ar?'أدخل اسم الفرع':'Enter branch name','error');try{if(id)await dbPatch('branches',{name},`?id=eq.${id}`);else await dbPost('branches',{name});notify(ar?'تم الحفظ ✅':'Saved ✅','success');closeModal('add-branch-modal');loadBranches()}catch(e){notify('Error','error')}}
async function deleteBranch(id){if(!confirm(currentLang==='ar'?'حذف الفرع؟':'Delete branch?'))return;await dbDelete('branches',`?id=eq.${id}`);loadBranches()}


// ── BRANCH TIER DASHBOARD + CSV UPLOAD ──
function initBranchDashboard(){
  const sTier=BRANCH_DATA.filter(b=>b.tier==='S');
  const aTier=BRANCH_DATA.filter(b=>b.tier==='A');
  const bTier=BRANCH_DATA.filter(b=>b.tier==='B');
  const noSales=BRANCH_DATA.filter(b=>b.tier==='NO_SALES');
  const ar=currentLang==='ar';

  document.getElementById('kpi-s-count').textContent=sTier.length;
  document.getElementById('kpi-a-count').textContent=aTier.length;
  document.getElementById('kpi-b-count').textContent=bTier.length;

  const totalCurr=BRANCH_DATA.reduce((s,b)=>s+b.revenue,0);
  const totalPrev=BRANCH_DATA.reduce((s,b)=>s+b.prev_revenue,0);
  const totalChange=totalPrev>0?((totalCurr-totalPrev)/totalPrev*100):0;
  document.getElementById('kpi-curr-rev').textContent='EGP '+fmtEGP(totalCurr);
  document.getElementById('kpi-prev-rev').textContent='EGP '+fmtEGP(totalPrev);
  const chEl=document.getElementById('kpi-change');
  chEl.textContent=(totalChange>=0?'+':'')+totalChange.toFixed(1)+'%';
  chEl.style.color=totalChange>=0?'var(--green)':'var(--red)';

  // Top 10 overview
  const top10=BRANCH_DATA.filter(b=>b.revenue>0).slice(0,10);
  const maxR=top10[0]?.revenue||1;
  document.getElementById('branch-top-list').innerHTML=top10.map((b,i)=>{
    const chg=b.prev_revenue>0?((b.revenue-b.prev_revenue)/b.prev_revenue*100):null;
    const tierBadge=b.tier==='S'?'<span class="tier-s">S 🥇</span>':b.tier==='A'?'<span class="tier-a">A 🥈</span>':'<span class="tier-b">B 🥉</span>';
    const pct=Math.max(4,Math.round(b.revenue/maxR*100));
    const medals=['🥇','🥈','🥉'];
    return`<div class="branch-card branch-card.tier-${b.tier.toLowerCase()}-card">
      <div style="display:flex;align-items:center;margin-bottom:8px">
        <span style="font-size:16px;margin-left:6px">${medals[i]||'#'+(i+1)}</span>
        <div class="branch-name">${b.name}</div>
        ${tierBadge}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">
        <span style="color:var(--green);font-weight:800">EGP ${fmtEGP(b.revenue)}</span>
        ${chg!==null?`<span class="${chg>=0?'change-up':'change-down'}">${chg>=0?'+':''}${chg.toFixed(0)}%</span>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px">
        <span>${ar?'سابقاً:':'Prev:'} EGP ${fmtEGP(b.prev_revenue)}</span>
        <span>${ar?'كمية:':'Qty:'} ${b.qty}</span>
      </div>
      <div class="target-bar"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--green),#00e676);border-radius:4px;transition:width .6s"></div></div>
    </div>`;
  }).join('');

  // Tier subtitle info
  document.getElementById('s-tier-subtitle').textContent=ar?`${sTier.length} فرع · EGP ${fmtEGP(sTier[0]?.revenue||0)} → EGP ${fmtEGP(sTier[sTier.length-1]?.revenue||0)}`:`${sTier.length} branches · EGP ${fmtEGP(sTier[0]?.revenue||0)} → EGP ${fmtEGP(sTier[sTier.length-1]?.revenue||0)}`;
  document.getElementById('a-tier-subtitle').textContent=ar?`${aTier.length} فرع · EGP ${fmtEGP(aTier[0]?.revenue||0)} → EGP ${fmtEGP(aTier[aTier.length-1]?.revenue||0)}`:`${aTier.length} branches`;
  document.getElementById('b-tier-subtitle').textContent=ar?`${bTier.length} فرع · EGP ${fmtEGP(bTier[0]?.revenue||0)} → EGP ${fmtEGP(bTier[bTier.length-1]?.revenue||0)}`:`${bTier.length} branches`;

  renderTierList('s-tier-list',sTier,'S');
  renderTierList('a-tier-list',aTier,'A');
  renderTierList('b-tier-list',bTier,'B');
  renderNoSalesList(noSales);
  renderUploadHistory();
}

function renderTierList(elId,branches,tier){
  const el=document.getElementById(elId);if(!el)return;
  const ar=currentLang==='ar';
  const tierColor=tier==='S'?'var(--gold)':tier==='A'?'var(--silver)':'var(--bronze)';
  const maxR=branches[0]?.revenue||1;
  el.innerHTML=branches.map((b,i)=>{
    const chg=b.prev_revenue>0?((b.revenue-b.prev_revenue)/b.prev_revenue*100):null;
    const pct=Math.max(3,Math.round(b.revenue/maxR*100));
    return`<div class="history-item">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
        <div style="font-size:12px;font-weight:700;flex:1">${i+1}. ${b.name}</div>
        <div style="text-align:left;margin-right:6px">
          <div style="font-size:13px;font-weight:800;color:${tierColor}">EGP ${fmtEGP(b.revenue)}</div>
          ${chg!==null?`<div style="font-size:10px;font-weight:700;color:${chg>=0?'var(--green)':'var(--red)'};text-align:left">${chg>=0?'▲':'▼'} ${Math.abs(chg).toFixed(0)}%</div>`:''}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:5px">
        <span>${ar?'سابقاً:':'Prev:'} EGP ${fmtEGP(b.prev_revenue)}</span>
        <span>${ar?'كمية الشهر:':'Qty:'} ${b.qty} / ${ar?'سابق:':'prev:'} ${b.prev_qty}</span>
      </div>
      <div class="target-bar"><div style="height:100%;width:${pct}%;background:${tierColor};border-radius:4px;opacity:.85;transition:width .6s"></div></div>
    </div>`;
  }).join('');
}

function renderNoSalesList(branches){
  const el=document.getElementById('ns-tier-list');if(!el)return;
  const ar=currentLang==='ar';
  el.innerHTML=branches.map(b=>`<div class="history-item" style="border-color:var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:12px;font-weight:700">🏪 ${b.name}</div>
      <span class="tier-ns">${ar?'بدون مبيعات':'No Sales'}</span>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:4px">${ar?'سابقاً:':'Prev:'} EGP ${fmtEGP(b.prev_revenue)} · ${ar?'مخزون:':'Stock:'} ${b.stock}</div>
  </div>`).join('');
}

function branchDashTab(tab,el){
  ['overview','s-tier','a-tier','b-tier','no-sales','upload'].forEach(t=>{
    const d=document.getElementById('branch-'+t);if(d)d.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('#branch-dash-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

function handleBranchUpload(event){
  const file=event.target.files[0];if(!file)return;
  const resultEl=document.getElementById('upload-result');const ar=currentLang==='ar';
  resultEl.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const text=e.target.result,lines=text.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){resultEl.innerHTML=`<div style="color:var(--red);font-size:12px;padding:8px">${ar?'الملف فارغ':'Empty file'}</div>`;return}
      const parsed=[];
      for(let i=1;i<lines.length;i++){const cols=lines[i].split(',');if(cols.length>=2&&cols[0].trim()&&!isNaN(cols[1]))parsed.push({name:cols[0].trim(),sales:parseInt(cols[1])||0});}
      if(parsed.length===0){resultEl.innerHTML=`<div style="color:var(--red);font-size:12px;padding:8px">${ar?'لم يتم التعرف على أي بيانات':'No data recognized'}</div>`;return}
      const record={date:new Date().toLocaleDateString('en-GB'),file:file.name,count:parsed.length,data:parsed};
      uploadHistory.unshift(record);if(uploadHistory.length>10)uploadHistory=uploadHistory.slice(0,10);
      localStorage.setItem('oraimo_upload_history',JSON.stringify(uploadHistory));
      resultEl.innerHTML=`<div class="card" style="border-color:var(--green);margin-top:8px">
        <div style="color:var(--green);font-weight:700;margin-bottom:6px">✅ ${ar?'تم رفع الملف':'File uploaded'}</div>
        <div style="font-size:12px;color:var(--muted)">${parsed.length} ${ar?'فرع':'branches'}</div>
        ${parsed.slice(0,5).map(p=>`<div style="font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">${p.name}: ${p.sales}</div>`).join('')}
      </div>`;
      renderUploadHistory();notify(`✅ ${parsed.length} ${ar?'فرع':'branches'}`,'success');
    }catch(err){resultEl.innerHTML=`<div style="color:var(--red);font-size:12px;padding:8px">${ar?'خطأ في قراءة الملف':'File read error'}: ${err.message}</div>`}
  };
  reader.readAsText(file,'UTF-8');event.target.value='';
}
function renderUploadHistory(){
  const el=document.getElementById('upload-history-list');if(!el)return;const ar=currentLang==='ar';
  if(!uploadHistory||uploadHistory.length===0){el.innerHTML=`<div style="color:var(--muted);font-size:12px">${ar?'لا يوجد سجل بعد':'No history yet'}</div>`;return}
  el.innerHTML=uploadHistory.map(r=>`<div class="history-item" style="margin-bottom:6px">
    <div class="hist-top"><div class="hist-name">${r.file}</div><span class="badge badge-green">${r.count} ${ar?'فرع':'br'}</span></div>
    <div class="hist-meta">${r.date}</div></div>`).join('');
}

// ── REPORTS ──
