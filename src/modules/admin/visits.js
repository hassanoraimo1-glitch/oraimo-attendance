// ═══════════════════════════════════════════════════════════
// modules/admin/visits.js — Branch visits (regular + TL)
// Provides globals: populateVisitBranchSelect, addVisitPhoto,
//   renderVisitPhotoPreviews, removeVisitPhoto, submitVisit, loadVisitsTab,
//   clearOldVisitPhotos, addTLVisitPhoto, renderTLPreviews, removeTLPhoto,
//   submitTLVisit, loadTLVisitsTab
// Module state: visitPhotos, tlVisitPhotos
// ═══════════════════════════════════════════════════════════

// ── EMPLOYEE VISITS ──
// ── VISITS ──
let visitPhotos=[];

function isValidCameraImage(file, inputEl){
  if(!file) return false;
  if(!file.type || !file.type.startsWith('image/')) return false;

  // best-effort enforcement:
  // requires input in HTML to have capture="environment"
  const capture = inputEl?.getAttribute('capture');
  if(capture !== 'environment' && capture !== 'user'){
    return false;
  }

  return true;
}

function compressImageFile(file, callback){
  const reader=new FileReader();
  reader.onload=ev=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const maxW=800;
      const scale=Math.min(1,maxW/img.width);
      canvas.width=img.width*scale;
      canvas.height=img.height*scale;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const compressed=canvas.toDataURL('image/jpeg',0.35);
      callback(compressed);
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
}

function populateVisitBranchSelect(){
  const sel=document.getElementById('visit-branch-select');if(!sel)return;
  sel.innerHTML='<option value="">-- اختر الفرع --</option>'+allBranches.map(b=>`<option value="${b.name}">${b.name}</option>`).join('');
}

function addVisitPhoto(e){
  const ar=currentLang==='ar';
  if(visitPhotos.length>=3){
    e.target.value='';
    return notify(ar?'الحد الأقصى 3 صور':'Maximum 3 photos','error');
  }

  const input=e.target;
  const file=input.files && input.files[0];
  if(!file){
    input.value='';
    return;
  }

  if(!isValidCameraImage(file, input)){
    input.value='';
    return notify(ar?'يجب رفع صورة الزيارة بالكاميرا فقط':'Visit photo must be captured using camera only','error');
  }

  compressImageFile(file,(compressed)=>{
    visitPhotos.push(compressed);
    renderVisitPhotoPreviews();
  });

  input.value='';
}

function renderVisitPhotoPreviews(){
  const el=document.getElementById('visit-photo-previews');if(!el)return;
  el.innerHTML=visitPhotos.map((src,i)=>`
    <div class="photo-preview-wrap">
      <img src="${src}" alt="">
      <button class="photo-preview-del" onclick="removeVisitPhoto(${i})">✕</button>
    </div>`).join('');
  const zone=document.getElementById('visit-upload-zone');
  if(zone)zone.style.display=visitPhotos.length>=3?'none':'block';
}

function removeVisitPhoto(i){visitPhotos.splice(i,1);renderVisitPhotoPreviews()}

async function submitVisit(){
  const branch=document.getElementById('visit-branch-select').value;
  const note=document.getElementById('visit-note-input').value.trim();
  const ar=currentLang==='ar';
  if(!branch)return notify(ar?'اختر الفرع':'Select branch','error');
  if(visitPhotos.length===0)return notify(ar?'أضف صورة واحدة على الأقل':'Add at least one photo','error');

  try{
    await dbPost('branch_visits',{
      employee_id:currentUser.id,
      employee_name:currentUser.name,
      branch_name:branch,
      note:note||null,
      photo1:visitPhotos[0]||null,
      photo2:visitPhotos[1]||null,
      photo3:visitPhotos[2]||null,
      visit_date:todayStr()
    });
    notify(ar?'تم حفظ الزيارة ✅':'Visit saved ✅','success');
    visitPhotos=[];renderVisitPhotoPreviews();
    document.getElementById('visit-branch-select').value='';
    document.getElementById('visit-note-input').value='';
    loadVisitsTab();
  }catch(e){notify((ar?'خطأ: ':'Error: ')+(e.message||''),'error')}
}

async function loadVisitsTab(){
  populateVisitBranchSelect();
  const pm=getPayrollMonth();
  const visits=await dbGet('branch_visits',`?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`).catch(()=>[])||[];
  const photoCount=visits.reduce((s,v)=>{let c=0;if(v.photo1)c++;if(v.photo2)c++;if(v.photo3)c++;return s+c;},0);
  const done=visits.length,remain=Math.max(0,150-done);
  const visDone=document.getElementById('vis-done');if(visDone)visDone.textContent=done;
  const visRem=document.getElementById('vis-remain');if(visRem)visRem.textContent=remain;
  document.getElementById('vis-photos').textContent=photoCount;
  document.getElementById('emp-visits-count').textContent=done+' / 150';
  const el=document.getElementById('visit-history-list');if(!el)return;
  if(visits.length===0){el.innerHTML='<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';return}
  el.innerHTML=visits.map(v=>{
    const photos=[v.photo1,v.photo2,v.photo3].filter(Boolean);
    return`<div class="visit-card">
      <div class="visit-header">
        <div><div class="visit-branch-name">🏪 ${v.branch_name}</div><div class="visit-meta">${v.visit_date}</div></div>
        <span class="badge badge-green">${photos.length} 📷</span>
      </div>
      ${v.note?`<div class="visit-note">📝 ${v.note}</div>`:''}
      ${photos.length>0?`<div class="visit-photos-row">${photos.map(src=>`<img class="visit-photo" src="${src}" onclick="fullSelfie('${src}')">`).join('')}</div>`:''}
    </div>`;
  }).join('');
}

// ── VISITS ADMIN REPORT ──

// ── CLEAR OLD VISIT PHOTOS (danger zone) ──
async function clearOldVisitPhotos(){
  const ar=currentLang==='ar';
  const cutoff=fmtDate(new Date(Date.now()-60*24*60*60*1000));
  const old=await dbGet('branch_visits',`?visit_date=lt.${cutoff}&select=id`).catch(()=>[])||[];
  if(old.length===0)return;
  for(const r of old){await dbPatch('branch_visits',{photo1:null,photo2:null,photo3:null},`?id=eq.${r.id}`)}
  console.log(`Cleared photos from ${old.length} old visits`);
}


// editingManagerId + managerTeamData moved to modules/admin/admins.js

// ── TEAM LEADER VISITS ──
let tlVisitPhotos = [];

function addTLVisitPhoto(e) {
  const ar=currentLang==='ar';

  if (tlVisitPhotos.length >= 3){
    e.target.value='';
    return notify(ar?'الحد الأقصى 3 صور':'Maximum 3 photos', 'error');
  }

  const input=e.target;
  const file=input.files && input.files[0];
  if (!file){
    input.value='';
    return;
  }

  if(!isValidCameraImage(file, input)){
    input.value='';
    return notify(ar?'يجب رفع صورة الزيارة بالكاميرا فقط':'Visit photo must be captured using camera only','error');
  }

  compressImageFile(file,(compressed)=>{
    tlVisitPhotos.push(compressed);
    renderTLPreviews();
  });

  input.value='';
}

function renderTLPreviews() {
  const el=document.getElementById('tl-visit-previews');if(!el)return;
  el.innerHTML=tlVisitPhotos.map((src,i)=>`<div class="photo-preview-wrap"><img src="${src}"><button class="photo-preview-del" onclick="removeTLPhoto(${i})">✕</button></div>`).join('');
  const zone=document.getElementById('tl-visit-zone');
  if(zone) zone.style.display=tlVisitPhotos.length>=3?'none':'block';
}

function removeTLPhoto(i){tlVisitPhotos.splice(i,1);renderTLPreviews();}

async function submitTLVisit(){
  const branch=document.getElementById('tl-visit-branch').value;
  const note=document.getElementById('tl-visit-note').value.trim();
  const ar=currentLang==='ar';
  if(!branch) return notify(ar?'اختر الفرع':'Select branch','error');
  if(tlVisitPhotos.length===0) return notify(ar?'أضف صورة واحدة على الأقل':'Add at least one photo','error');

  try{
    await dbPost('branch_visits',{
      manager_id:currentUser.id,
      manager_name:currentUser.name,
      branch_name:branch,
      note:note||null,
      photo1:tlVisitPhotos[0]||null,
      photo2:tlVisitPhotos[1]||null,
      photo3:tlVisitPhotos[2]||null,
      visit_date:todayStr()
    });
    notify(ar?'تم حفظ الزيارة ✅':'Visit saved ✅','success');
    tlVisitPhotos=[];renderTLPreviews();
    document.getElementById('tl-visit-branch').value='';
    document.getElementById('tl-visit-note').value='';
    loadTLVisitsTab();
  }catch(e){notify('Error: '+e.message,'error');}
}

async function loadTLVisitsTab(){
  // populate branch select
  const sel=document.getElementById('tl-visit-branch');
  if(sel) sel.innerHTML='<option value="">-- اختر الفرع --</option>'+(allBranches||[]).map(b=>`<option value="${b.name}">${b.name}</option>`).join('');
  const pm=getPayrollMonth();
  const visits=await dbGet('branch_visits',`?manager_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`).catch(()=>[]) || await dbGet('branch_visits',`?employee_id=eq.${currentUser.id}&visit_date=gte.${pm.start}&visit_date=lte.${pm.end}&order=visit_date.desc&select=*`).catch(()=>[])||[];
  const done=visits.length;
  const remain=Math.max(0,150-done);
  const doneEl=document.getElementById('tl-vis-done');
  const remEl=document.getElementById('tl-vis-remain');
  const cntEl=document.getElementById('tl-visit-count');
  if(doneEl) doneEl.textContent=done;
  if(remEl) remEl.textContent=remain;
  if(cntEl) cntEl.textContent=done+' / 150';
  const el=document.getElementById('tl-visit-history');if(!el)return;
  if(!visits.length){el.innerHTML='<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';return;}
  el.innerHTML=visits.map(v=>{
    const photos=[v.photo1,v.photo2,v.photo3].filter(Boolean);
    return`<div class="visit-card"><div class="visit-header"><div><div class="visit-branch-name">🏪 ${v.branch_name}</div><div class="visit-meta">${v.visit_date}</div></div><span class="badge badge-green">${photos.length} 📷</span></div>${v.note?`<div class="visit-note">📝 ${v.note}</div>`:''}<div class="visit-photos-row">${photos.map(src=>`<img class="visit-photo" src="${src}" onclick="fullSelfie('${src}')">`).join('')}</div></div>`;
  }).join('');
}

// ── toggleLeaveFields moved to modules/leaves.js
