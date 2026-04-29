// ═══════════════════════════════════════════════════════════
// modules/admin/reports.js — Employee/product/branch reports
// Provides globals: reportTab, loadEmpReport, loadProductsReport,
//   loadBranchReport, populateVisitReportEmps, initVisitReportMonth,
//   loadVisitsReport, populateDisplayReportEmps, loadDisplayReport
// ═══════════════════════════════════════════════════════════

// ── REPORT TAB SWITCHER + EMP/PRODUCT/BRANCH REPORTS ──
function reportTab(tab,el){
  currentReportTab=tab;
  ['employee','products','branch','q1','visits','display'].forEach(t=>{
    const el2=document.getElementById('report-'+t);
    if(el2)el2.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('#report-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  applyLang();
  if(tab==='products')loadProductsReport();
  if(tab==='branch')loadBranchReport();
  if(tab==='q1')loadQ1Analytics();
  if(tab==='visits'){populateVisitReportEmps().then(()=>initVisitReportMonth());}
  if(tab==='display'){populateDisplayReportEmps();loadDisplayReport();}
}

async function loadEmpReport(){
  const empId=document.getElementById('report-emp-select').value;if(!empId)return;
  const el=document.getElementById('report-content');const ar=currentLang==='ar';
  el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const pm=getPayrollMonth();
  const[att,sales,targetRes,teamRes]=await Promise.all([
    dbGet('attendance',`?employee_id=eq.${empId}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`),
    dbGet('sales',`?employee_id=eq.${empId}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`),
    dbGet('targets',`?employee_id=eq.${empId}&month=eq.${pm.start.substring(0,7)}&select=*`),
    dbGet('manager_teams',`?employee_id=eq.${empId}&select=manager_id`).catch(()=>[])
  ]);
  const emp=allEmployees.find(e=>e.id==empId);
  // find team leader name
  let tlName='—';
  if(teamRes&&teamRes.length>0){
    const tlId=teamRes[0].manager_id;
    // check admins and employees tables
    const tlAdm=await dbGet('admins',`?id=eq.${tlId}&select=name`).catch(()=>[]);
    if(tlAdm&&tlAdm.length>0) tlName=tlAdm[0].name;
    else {
      const tlEmp=allEmployees.find(e=>e.id===tlId);
      if(tlEmp) tlName=tlEmp.name;
    }
  }
  let salesTotal=0;(sales||[]).forEach(s=>salesTotal+=s.total_amount);
  let lateTotal=0;(att||[]).forEach(a=>lateTotal+=(a.late_minutes||0));
  const target=targetRes&&targetRes.length>0?targetRes[0].amount:0;
  const kmodel=targetRes&&targetRes.length>0?(targetRes[0].kmodel_amount||0):0;
  const pct=target>0?Math.min(100,Math.round(salesTotal/target*100)):0;
  const kpct=kmodel>0?Math.min(100,Math.round(salesTotal/kmodel*100)):0;
  const salesByDate={};(sales||[]).forEach(s=>{salesByDate[s.date]=(salesByDate[s.date]||0)+s.total_amount});
  const chartDays=[];const sd=new Date(pm.start),ed=new Date(pm.end),today=new Date();
  for(let d=new Date(sd);d<=ed&&d<=today;d.setDate(d.getDate()+1))chartDays.push({ds:fmtDate(new Date(d)),day:d.getDate()});
  const vals=chartDays.map(d=>salesByDate[d.ds]||0);const maxV=Math.max(...vals,1);
  el.innerHTML=`<div class="card card-glow">
    <div style="font-size:15px;font-weight:800;margin-bottom:2px">${emp?.name||''}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${pm.label}</div>
    <div style="font-size:11px;margin-bottom:12px">👥 ${ar?'التيم ليدر':'Team Leader'}: <span style="color:var(--green);font-weight:700">${tlName}</span></div>
    <div class="stats-grid" style="margin-bottom:10px">
      <div class="stat-card"><div class="stat-label">${ar?'أيام الحضور':'Attendance'}</div><div class="stat-val" style="color:var(--green)">${(att||[]).length}</div></div>
      <div class="stat-card"><div class="stat-label">${ar?'إجمالي التأخير':'Late Total'}</div><div class="stat-val" style="color:var(--yellow)">${lateTotal}${ar?'د':'m'}</div></div>
      <div class="stat-card"><div class="stat-label">${ar?'إجمالي المبيعات':'Total Sales'}</div><div class="stat-val" style="color:var(--green);font-size:15px">EGP ${fmtEGP(salesTotal)}</div></div>
      <div class="stat-card"><div class="stat-label">${ar?'التارجت':'Target'}</div><div class="stat-val" style="font-size:15px">EGP ${fmtEGP(target)}</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>${ar?'التقدم':'Progress'}</span><span style="color:var(--green);font-weight:700">${pct}%</span></div>
    <div class="target-bar"><div class="target-fill" style="width:${pct}%"></div></div>
    ${kmodel>0?`<div style="display:flex;justify-content:space-between;font-size:11px;margin:8px 0 4px"><span style="color:var(--purple)">K Model — EGP ${fmtEGP(kmodel)}</span><span style="color:var(--purple);font-weight:700">${kpct}%</span></div><div class="target-bar"><div style="height:100%;width:${kpct}%;background:var(--purple);border-radius:4px;transition:width .6s"></div></div>`:''}
  </div>
  <div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:10px">📈 ${ar?'مخطط المبيعات اليومي':'Daily Sales Chart'}</div>
    <div class="chart-wrap">${chartDays.slice(-14).map(d=>{const v=salesByDate[d.ds]||0;const h=Math.max(3,Math.round((v/maxV)*120));return`<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}px;background:${v>0?'var(--green)':'var(--border)'}"></div><div class="chart-label">${d.day}</div></div>`}).join('')}</div>
  </div>
  <div style="font-size:13px;font-weight:700;margin:14px 0 8px">${ar?'سجل المبيعات':'Sales Records'}</div>
  ${(sales||[]).length===0?`<div class="empty"><div class="empty-icon">🛒</div>${ar?'لا توجد مبيعات':'No sales'}</div>`:(sales||[]).map(s=>`<div class="history-item"><div class="hist-top"><div class="hist-name">${s.product_name}</div><div class="hist-amount">${s.total_amount.toLocaleString()} EGP</div></div><div style="display:flex;justify-content:space-between"><div class="hist-meta">${s.date}</div><div class="hist-meta">${ar?'كمية':'Qty'}: ${s.quantity} × ${s.unit_price.toLocaleString()}</div></div></div>`).join('')}
  <div style="font-size:13px;font-weight:700;margin:14px 0 8px">${ar?'سجل الحضور':'Attendance Log'}</div>
  <div class="table-wrap"><table>
    <tr><th>${ar?'التاريخ':'Date'}</th><th>${ar?'دخول':'In'}</th><th>${ar?'خروج':'Out'}</th><th>${ar?'تأخير':'Late'}</th><th>📷</th></tr>
    ${(att||[]).map(a=>`<tr><td>${a.date}</td><td>${a.check_in||'-'}</td><td>${a.check_out||'-'}</td><td>${a.late_minutes>0?`<span class="badge badge-yellow">${a.late_minutes}${ar?'د':'m'}</span>`:'<span class="badge badge-green">✓</span>'}</td><td>${a.selfie_in?`<img src="${a.selfie_in}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;cursor:pointer" onclick="fullSelfie('${a.selfie_in}')">`:'-'}</td></tr>`).join('')}
  </table></div>`;
}

async function loadProductsReport(){
  const el=document.getElementById('products-report-content');const ar=currentLang==='ar';
  el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const pm=getPayrollMonth();
  const sales=await dbGet('sales',`?date=gte.${pm.start}&date=lte.${pm.end}&select=product_name,quantity,total_amount`);
  const byProduct={};
  (sales||[]).forEach(s=>{if(!byProduct[s.product_name])byProduct[s.product_name]={qty:0,revenue:0};byProduct[s.product_name].qty+=s.quantity;byProduct[s.product_name].revenue+=s.total_amount;});
  const sorted=Object.entries(byProduct).sort((a,b)=>b[1].revenue-a[1].revenue);
  if(sorted.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">📦</div>${ar?'لا توجد مبيعات':'No sales'}</div>`;return}
  const maxRev=sorted[0][1].revenue;
  window._productSalesData=sales||[];
  window._allEmpsData=await dbGet('employees','?select=*').catch(()=>[])||[];
  el.innerHTML=`<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:12px">📦 ${ar?'اضغط على منتج لعرض تفاصيل الموظفين':'Tap a product for employee details'}</div>
    ${sorted.slice(0,20).map(([name,d],i)=>`<div style="margin-bottom:10px;cursor:pointer" onclick="showProductEmployees('${name.replace(/'/g,"\\\'")}')">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr">${name}</span>
        <span style="color:var(--green);font-weight:700;margin-right:8px">EGP ${fmtEGP(d.revenue)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="perf-bar-bg" style="flex:1"><div class="perf-bar-fill" style="width:${Math.max(3,Math.round(d.revenue/maxRev*100))}%;background:var(--green)"></div></div>
        <span style="font-size:10px;color:var(--muted);min-width:40px">${d.qty} ${ar?'قطعة':'pcs'}</span>
      </div></div>`).join('')}
  </div>`;
}

async function loadBranchReport(){
  const el=document.getElementById('branch-report-content');const ar=currentLang==='ar';
  el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const pm=getPayrollMonth();
  const[sales,allEmp]=await Promise.all([dbGet('sales',`?date=gte.${pm.start}&date=lte.${pm.end}&select=total_amount,employee_id`),dbGet('employees','?select=*')]);
  const byBranch={};
  (sales||[]).forEach(s=>{const emp=(allEmp||[]).find(e=>e.id===s.employee_id);const branch=emp?.branch||(ar?'غير محدد':'Unknown');byBranch[branch]=(byBranch[branch]||0)+s.total_amount;});
  const sorted=Object.entries(byBranch).sort((a,b)=>b[1]-a[1]);
  if(sorted.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">🏪</div>${ar?'لا توجد مبيعات':'No sales'}</div>`;return}
  const maxB=sorted[0][1];
  el.innerHTML=`<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:12px">🏪 ${ar?'تقرير الفروع':'Branch Report'}</div>
    ${sorted.map(([branch,rev],i)=>`<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="font-weight:700">${branch}</span><span style="color:var(--green);font-weight:700">EGP ${fmtEGP(rev)}</span></div>
      <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${Math.max(3,Math.round(rev/maxB*100))}%;background:${i===0?'var(--gold)':i===1?'var(--silver)':i===2?'var(--bronze)':'var(--green)'}"></div></div>
    </div>`).join('')}
  </div>`;
}

// ── ALL EMPLOYEES ──

// ── VISITS REPORT ──
async function populateVisitReportEmps(){
  const sel=document.getElementById('visit-report-emp');if(!sel)return;
  const ar=currentLang==='ar';
  // Load all employees for filter
  const emps=allEmployees.length>0?allEmployees:(await dbGet('employees','?select=id,name&order=name').catch(()=>[])||[]);
  sel.innerHTML='<option value="">'+(ar?'الكل':'All')+'</option>'+
    emps.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  sel.onchange=function(){loadVisitsReport();};
}
function initVisitReportMonth(){
  const el=document.getElementById('visit-report-month');
  if(!el)return;
  // Restore last selected month or use current
  const saved=localStorage.getItem('oraimo_visit_month');
  const current=getPayrollMonth().start.substring(0,7);
  el.value=saved||current;
  el.onchange=function(){localStorage.setItem('oraimo_visit_month',this.value);loadVisitsReport();};
  loadVisitsReport();
}
async function loadVisitsReport(){
  const el=document.getElementById('visits-report-content');if(!el)return;
  const empId=document.getElementById('visit-report-emp')?.value||'';
  const monthEl=document.getElementById('visit-report-month');
  const month=monthEl?.value||getPayrollMonth().start.substring(0,7);
  const ar=currentLang==='ar';
  el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const[y,m]=month.split('-').map(Number);
  const start=`${month}-01`;
  const end=new Date(y,m,0).toISOString().split('T')[0];
  let query=`?visit_date=gte.${start}&visit_date=lte.${end}&order=visit_date.desc&select=*`;
  if(empId) query+=`&employee_id=eq.${empId}`;
  const visits=await dbGet('branch_visits',query).catch(()=>[])||[];
  if(visits.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">📸</div>${ar?'لا توجد زيارات':'No visits'}</div>`;return}
  // Group by employee name
  const byEmp={};
  visits.forEach(v=>{
    const k=v.employee_name||v.manager_name||('ID:'+v.employee_id);
    if(!byEmp[k])byEmp[k]=[];
    byEmp[k].push(v);
  });
  const totalPhotos=visits.reduce((s,v)=>{let c=0;if(v.photo1)c++;if(v.photo2)c++;if(v.photo3)c++;return s+c;},0);
  el.innerHTML=`
  <div class="stats-grid" style="margin-bottom:12px">
    <div class="stat-card"><div class="stat-label">إجمالي الزيارات</div><div class="stat-val" style="color:var(--green)">${visits.length}</div></div>
    <div class="stat-card"><div class="stat-label">الصور المرفوعة</div><div class="stat-val" style="color:var(--blue)">${totalPhotos}</div></div>
  </div>
  ${Object.entries(byEmp).map(([name,empVisits])=>{
    const pCount=empVisits.reduce((s,v)=>{let c=0;if(v.photo1)c++;if(v.photo2)c++;if(v.photo3)c++;return s+c;},0);
    const pct=Math.min(100,Math.round(empVisits.length/150*100));
    return`<div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:14px;font-weight:800">👤 ${name}</div>
        <span class="badge ${pct>=100?'badge-green':pct>=50?'badge-yellow':'badge-red'}">${empVisits.length}/150</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>التقدم</span><span style="color:var(--green);font-weight:700">${pct}%</span></div>
      <div class="target-bar" style="margin-bottom:12px"><div class="target-fill" style="width:${pct}%"></div></div>
      ${empVisits.map(v=>{
        const photos=[v.photo1,v.photo2,v.photo3].filter(Boolean);
        return`<div class="visit-card" style="margin-bottom:8px">
          <div class="visit-header">
            <div><div class="visit-branch-name">🏪 ${v.branch_name}</div><div class="visit-meta">${v.visit_date}</div></div>
            <span class="badge badge-green">${photos.length} 📷</span>
          </div>
          ${v.note?`<div class="visit-note">📝 ${v.note}</div>`:''}
          ${photos.length>0?`<div class="visit-photos-row">${photos.map(src=>`<img class="visit-photo" src="${src}" onclick="fullSelfie('${src}')">`).join('')}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  }).join('')}`;
}

// ── clearOldVisitPhotos moved to modules/admin/visits.js ──
// ── MANAGER TEAM SYSTEM moved to modules/admin/admins.js ──

// ── DISPLAY REPORT ──
async function populateDisplayReportEmps(){
  const sel=document.getElementById('display-report-emp');if(!sel)return;
  sel.innerHTML='<option value="">كل الموظفين</option>'+(allEmployees||[]).filter(e=>e.role!=='team_leader').map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  const mSel=document.getElementById('display-report-month');
  if(mSel){
    const savedDM=localStorage.getItem('oraimo_display_month');
    mSel.value=savedDM||getPayrollMonth().start.substring(0,7);
    mSel.onchange=function(){localStorage.setItem('oraimo_display_month',this.value);loadDisplayReport();};
  }
}

async function loadDisplayReport(){
  const el=document.getElementById('display-report-content');if(!el)return;
  const month=document.getElementById('display-report-month')?.value||getPayrollMonth().start.substring(0,7);
  const empId=document.getElementById('display-report-emp')?.value||'';
  el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const[y,m]=month.split('-').map(Number);
  const start=`${month}-01`;
  const end=new Date(y,m,0).toISOString().split('T')[0];
  let query=`?photo_date=gte.${start}&photo_date=lte.${end}&order=photo_date.desc&select=*`;
  if(empId) query+=`&employee_id=eq.${empId}`;
  const records=await dbGet('display_photos',query).catch(()=>[])||[];
  if(!records.length){el.innerHTML='<div class="empty"><div class="empty-icon">🖼️</div>لا توجد صور</div>';return;}
  const byEmp={};
  records.forEach(r=>{const k=r.employee_name||r.employee_id;if(!byEmp[k])byEmp[k]=[];byEmp[k].push(r);});
  el.innerHTML=Object.entries(byEmp).map(([name,recs])=>`
    <div class="card" style="margin-bottom:10px">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px">👤 ${name} <span class="badge badge-blue">${recs.length} يوم</span></div>
      ${recs.map(r=>{
        const photos=[r.photo1,r.photo2,r.photo3].filter(Boolean);
        return`<div class="visit-card" style="margin-bottom:8px"><div class="visit-header"><div><div class="visit-branch-name">🗓️ ${r.photo_date}</div><div class="visit-meta">${r.branch||''}</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge badge-blue">${photos.length} 📷</span>${currentUser.role!=='viewer'?`<button onclick="deleteDisplayPhoto(${r.id})" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:Cairo,sans-serif">🗑️</button>`:''}</div></div>${r.note?`<div class="visit-note">📝 ${r.note}</div>`:''}<div class="visit-photos-row">${photos.map(src=>`<img class="visit-photo" src="${src}" onclick="fullSelfie('${src}')">`).join('')}</div></div>`;
      }).join('')}
    </div>`).join('');
}

async function deleteDisplayPhoto(id){
  const ar=currentLang==='ar';
  if(!confirm(ar?'هل تريد حذف صور الديسبلاي هذه؟':'Delete this display photo record?')) return;
  try{
    await dbDelete('display_photos',`?id=eq.${id}`);
    notify(ar?'تم الحذف ✅':'Deleted ✅','success');
    loadDisplayReport();
  }catch(e){notify('Error: '+e.message,'error');}
}

// tlVisitPhotos moved to modules/admin/visits.js

