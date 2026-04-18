// ═══════════════════════════════════════════════════════════
// modules/admin/targets.js — Monthly targets + model alerts + settings
// Provides globals: loadTargetsList, openEditTarget, addModelTargetRow,
//   openTargetModal, saveTarget, saveWorkTime, loadProductsSettings,
//   saveProductPrice, clearOldPhotos, loadModelTargetAlert, showModelAlertBanner
// ═══════════════════════════════════════════════════════════

// ── TARGETS CRUD ──
async function loadTargetsList(){
  const el=document.getElementById('targets-list');if(!el)return;const ar=currentLang==='ar';
  const pm=getPayrollMonth(),mon=pm.start.substring(0,7);
  const targets=await dbGet('targets',`?month=eq.${mon}&select=*`)||[];
  if(targets.length===0){el.innerHTML=`<div style="color:var(--muted);font-size:12px">${ar?'لا توجد تارجتات لهذه الفترة':'No targets set'}</div>`;return}
  el.innerHTML=targets.map(t=>{
    const emp=allEmployees.find(e=>e.id===t.employee_id);
    const models=t.model_targets||[];
    const modelsHtml=models.length>0?`<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${models.map(m=>`<span style="background:rgba(0,200,83,.1);color:var(--green);border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700">${m.name.split(' ').slice(-1)[0]}: ${m.qty} قطعة</span>`).join('')}</div>`:'';
    return`<div class="history-item">
      <div class="hist-top"><div class="hist-name">${emp?emp.name:(ar?'موظف':'Employee')}</div><div class="hist-amount">EGP ${(t.amount||0).toLocaleString()}</div></div>
      ${modelsHtml}
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <div class="hist-meta">${t.month}</div>
        <button class="action-btn edit" onclick="openEditTarget(${t.employee_id})" style="font-size:10px;padding:3px 8px">✏️ تعديل</button>
      </div>
    </div>`;
  }).join('');
}

async function openEditTarget(empId){
  populateTargetSelect();
  const pm=getPayrollMonth(),mon=pm.start.substring(0,7);
  document.getElementById('target-month').value=mon;
  document.getElementById('model-targets-list').innerHTML='';
  // pre-fill select
  document.getElementById('target-emp-select').value=empId;
  // load existing
  const existing=await dbGet('targets',`?employee_id=eq.${empId}&month=eq.${mon}&select=*`);
  if(existing&&existing.length>0){
    document.getElementById('target-amount').value=existing[0].amount||'';
    const models=existing[0].model_targets||[];
    models.forEach(m=>addModelTargetRow(m.name,m.qty));
  }
  openModal('target-modal');
}
function addModelTargetRow(productName='',qty=0){
  const list=document.getElementById('model-targets-list');
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:6px;align-items:center';
  row.innerHTML=`<select style="flex:2;padding:7px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Cairo,sans-serif;font-size:11px" class="model-target-select">
    <option value="">-- اختر موديل --</option>
    ${PRODUCTS.map(p=>`<option value="${p.name}" ${p.name===productName?'selected':''}>${p.name}</option>`).join('')}
  </select>
  <input type="number" placeholder="كمية" value="${qty||''}" min="1" class="model-target-qty" style="width:65px;padding:7px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Cairo,sans-serif;font-size:12px;text-align:center">
  <button onclick="this.parentElement.remove()" style="background:rgba(255,59,59,.13);color:var(--red);border:none;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px">✕</button>`;
  list.appendChild(row);
}

function openTargetModal(){
  populateTargetSelect();
  document.getElementById('target-month').value=getPayrollMonth().start.substring(0,7);
  document.getElementById('target-amount').value='';
  document.getElementById('model-targets-list').innerHTML='';
  openModal('target-modal');
}

async function saveTarget(){
  const empId=parseInt(document.getElementById('target-emp-select').value);
  const month=document.getElementById('target-month').value;
  const amount=parseInt(document.getElementById('target-amount').value);
  const ar=currentLang==='ar';
  if(!empId||!month||!amount)return notify(ar?'أكمل جميع الحقول':'Fill all fields','error');
  const modelTargets=[];
  document.querySelectorAll('#model-targets-list > div').forEach(row=>{
    const sel=row.querySelector('.model-target-select');
    const inp=row.querySelector('.model-target-qty');
    if(!sel||!inp)return;
    const name=sel.value;
    const qty=parseInt(inp.value)||0;
    if(name&&qty>0)modelTargets.push({name,qty});
  });
  try{
    const existing=await dbGet('targets',`?employee_id=eq.${empId}&month=eq.${month}&select=id`).catch(()=>[]);
    if(existing&&existing.length>0){
      await dbPatch('targets',{amount,model_targets:modelTargets},`?employee_id=eq.${empId}&month=eq.${month}`);
    }else{
      await dbPost('targets',{employee_id:empId,month,amount,model_targets:modelTargets});
    }
    notify(ar?'تم حفظ التارجت ✅':'Target saved ✅','success');
    closeModal('target-modal');
    loadTargetsList();
  }catch(e){
    console.error('saveTarget error:',e);
    notify((ar?'خطأ: ':'Error: ')+(e.message||'unknown'),'error');
  }
}

// ── SETTINGS ──

// ── SETTINGS: WORK TIME + PRODUCT PRICES + DANGER ZONE ──
async function saveWorkTime(){
  const start=document.getElementById('work-start').value,end=document.getElementById('work-end').value;const ar=currentLang==='ar';
  try{const existing=await dbGet('settings','?select=*');if(existing&&existing.length>0)await dbPatch('settings',{work_start:start,work_end:end},'?id=gte.0');else await dbPost('settings',{work_start:start,work_end:end});workSettings={start,end};notify(ar?'تم الحفظ ✅':'Saved ✅','success');}catch(e){notify('Error','error')}
}
async function loadProductsSettings(){
  const el=document.getElementById('products-settings-list');if(!el)return;
  const custom=await dbGet('product_prices','?select=*').catch(()=>[])||[];
  el.innerHTML=PRODUCTS.map(p=>{const cp=custom.find(c=>c.name===p.name),price=cp?cp.price:p.price;const inputId='price-'+p.name.replace(/\s/g,'_').replace(/[^a-zA-Z0-9_]/g,'');return`<div class="history-item"><div class="hist-name" style="font-size:11px;margin-bottom:6px;direction:ltr">${p.name}</div><div style="display:flex;gap:7px;align-items:center"><input type="number" value="${price}" id="${inputId}" style="flex:1;padding:6px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Cairo,sans-serif;font-size:13px"><button class="action-btn edit" onclick="saveProductPrice('${p.name.replace(/'/g,"\'")}','${inputId}')">${currentLang==='ar'?'حفظ':'Save'}</button></div></div>`;}).join('');
}
async function saveProductPrice(name,inputId){const val=parseInt(document.getElementById(inputId).value);const ar=currentLang==='ar';if(!val)return notify(ar?'أدخل سعراً صحيحاً':'Enter valid price','error');try{const existing=await dbGet('product_prices',`?name=eq.${encodeURIComponent(name)}&select=*`);if(existing&&existing.length>0)await dbPatch('product_prices',{price:val},`?name=eq.${encodeURIComponent(name)}`);else await dbPost('product_prices',{name,price:val});notify(ar?'تم حفظ السعر ✅':'Price saved ✅','success');}catch(e){notify('Error','error')}}
async function clearOldPhotos(){const ar=currentLang==='ar';if(!confirm(ar?'حذف صور الأقدم من 30 يوماً؟':'Remove photos older than 30 days?'))return;try{const cutoff=fmtDate(new Date(Date.now()-30*24*60*60*1000));const old=await dbGet('attendance',`?date=lt.${cutoff}&select=id,selfie_in,selfie_out`).catch(()=>[])||[];const withPhotos=old.filter(r=>r.selfie_in||r.selfie_out);if(withPhotos.length===0){notify(ar?'لا توجد صور قديمة':'No old photos','success');return}for(const r of withPhotos){await dbPatch('attendance',{selfie_in:null,selfie_out:null},`?id=eq.${r.id}`)}notify(`${ar?'تم حذف':'Cleared'} ${withPhotos.length} ${ar?'صورة':'photos'} ✅`,'success');}catch(e){notify('Error','error')}}


// ── MODEL TARGET ALERT ──

// ── MODEL TARGET ALERT BANNER ──
async function loadModelTargetAlert(){
  const el=document.getElementById('model-target-alert');if(!el)return;
  const ar=currentLang==='ar';
  const pm=getPayrollMonth(),mon=pm.start.substring(0,7);
  const [targetRes,sales]=await Promise.all([
    dbGet('targets',`?employee_id=eq.${currentUser.id}&month=eq.${mon}&select=*`),
    dbGet('sales',`?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=product_name,quantity`)
  ]);
  if(!targetRes||!targetRes.length){el.innerHTML='';return}
  const models=(targetRes[0].model_targets)||[];
  if(!models.length){el.innerHTML='';return}
  // count sales per product
  const soldQty={};
  (sales||[]).forEach(s=>{soldQty[s.product_name]=(soldQty[s.product_name]||0)+s.quantity});
  // calc days left
  const today=new Date(),endDate=new Date(pm.end);
  const daysLeft=Math.max(0,Math.ceil((endDate-today)/(1000*60*60*24)));
  const totalDays=new Date(pm.end).getDate();
  const daysPassed=totalDays-daysLeft;
  const behindModels=models.filter(m=>{
    const done=soldQty[m.name]||0;
    const expectedByNow=daysPassed>0?Math.round(m.qty/totalDays*daysPassed):0;
    return done<expectedByNow;
  });
  const allOnTrack=behindModels.length===0;
  // show alert if behind
  const lastAlert=parseInt(localStorage.getItem('oraimo_last_model_alert')||'0');
  const now=Date.now();
  const alertEvery=3*24*60*60*1000; // 3 days
  if(!allOnTrack&&(now-lastAlert)>alertEvery){
    localStorage.setItem('oraimo_last_model_alert',now);
    // show alert banner
    setTimeout(()=>showModelAlertBanner(behindModels,soldQty,daysLeft),1000);
  }
  el.innerHTML=`<div class="model-alert-card ${allOnTrack?'on-track':''}">
    <div class="model-alert-title">${allOnTrack?'✅':'⚠️'} ${ar?(allOnTrack?'تارجت الموديلات — على المسار':'تارجت الموديلات — يحتاج اهتمام'):(allOnTrack?'Model Targets — On Track':'Model Targets — Needs Attention')}
      <span style="font-size:10px;color:var(--muted);font-weight:500;margin-right:auto">${daysLeft} ${ar?'يوم متبقي':'days left'}</span>
    </div>
    ${models.map(m=>{
      const done=soldQty[m.name]||0;
      const pct=Math.min(100,Math.round(done/m.qty*100));
      const color=pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--red)';
      return`<div class="model-row">
        <div class="model-name-sm">${m.name.split(' ').slice(-2).join(' ')}</div>
        <div class="model-progress">
          <div style="width:70px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${color};border-radius:3px;transition:.4s"></div></div>
          <div class="model-pct" style="color:${color}">${done}/${m.qty}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function showModelAlertBanner(behindModels,soldQty,daysLeft){
  const ar=currentLang==='ar';
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML=`<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;border-top:2px solid var(--red)">
    <div style="font-size:16px;font-weight:800;color:var(--red);margin-bottom:4px">⚠️ ${ar?'تنبيه: تارجت الموديلات':'Alert: Model Target'}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">${ar?`متبقي ${daysLeft} يوم على نهاية الشهر`:`${daysLeft} days left this month`}</div>
    ${behindModels.map(m=>{const done=soldQty[m.name]||0;const remaining=m.qty-done;return`<div style="background:var(--card2);border-radius:10px;padding:10px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:11px;font-weight:700;direction:ltr">${m.name.split(' ').slice(-2).join(' ')}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${ar?`مباع: ${done} من ${m.qty}`:`Sold: ${done} of ${m.qty}`}</div>
      </div>
      <div style="font-size:14px;font-weight:800;color:var(--red)">-${remaining} ${ar?'قطعة':'pcs'}</div>
    </div>`}).join('')}
    <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:13px;background:linear-gradient(135deg,var(--green),var(--green-dark));border:none;border-radius:12px;color:#000;font-family:Cairo,sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-top:6px">${ar?'حسناً، سأعمل على ذلك':'Got it, I will work on it'}</button>
  </div>`;
  document.body.appendChild(overlay);
}

// ── NAVIGATION ──
