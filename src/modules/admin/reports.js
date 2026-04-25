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
  if(el) el.classList.add('active');
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
  if (window.AdminReportsUI?.setLoading) window.AdminReportsUI.setLoading(el);
  else el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
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
  if (window.AdminReportsUI?.renderEmployeeReport) {
    window.AdminReportsUI.renderEmployeeReport(el, {
      ar,
      pmLabel: pm.label,
      empName: emp?.name || '',
      tlName,
      att,
      sales,
      pct,
      kpct,
      kmodel,
      salesTotal,
      lateTotal,
      target,
      chartDays,
      salesByDate,
    });
  } else if (el) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div>' + (ar ? 'واجهة التقارير غير جاهزة' : 'Report UI not ready') + '</div>';
  }
}

async function loadProductsReport(){
  const el=document.getElementById('products-report-content');const ar=currentLang==='ar';
  if (window.AdminReportsUI?.setLoading) window.AdminReportsUI.setLoading(el);
  else el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const pm=getPayrollMonth();
  const sales=await dbGet('sales',`?date=gte.${pm.start}&date=lte.${pm.end}&select=product_name,quantity,total_amount`);
  const byProduct={};
  (sales||[]).forEach(s=>{if(!byProduct[s.product_name])byProduct[s.product_name]={qty:0,revenue:0};byProduct[s.product_name].qty+=s.quantity;byProduct[s.product_name].revenue+=s.total_amount;});
  const sorted=Object.entries(byProduct).sort((a,b)=>b[1].revenue-a[1].revenue);
  if(sorted.length===0){
    if (window.AdminReportsUI?.setEmpty) window.AdminReportsUI.setEmpty(el, '📦', ar?'لا توجد مبيعات':'No sales');
    else el.innerHTML=`<div class="empty"><div class="empty-icon">📦</div>${ar?'لا توجد مبيعات':'No sales'}</div>`;
    return;
  }
  window._productSalesData=sales||[];
  window._allEmpsData=await dbGet('employees','?select=*').catch(()=>[])||[];
  if (window.AdminReportsUI?.renderProductsReport) {
    window.AdminReportsUI.renderProductsReport(el, { ar, sorted });
  }
}

async function loadBranchReport(){
  const el=document.getElementById('branch-report-content');const ar=currentLang==='ar';
  if (window.AdminReportsUI?.setLoading) window.AdminReportsUI.setLoading(el);
  else el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const pm=getPayrollMonth();
  const[sales,allEmp]=await Promise.all([dbGet('sales',`?date=gte.${pm.start}&date=lte.${pm.end}&select=total_amount,employee_id`),dbGet('employees','?select=*')]);
  const byBranch={};
  (sales||[]).forEach(s=>{const emp=(allEmp||[]).find(e=>e.id===s.employee_id);const branch=emp?.branch||(ar?'غير محدد':'Unknown');byBranch[branch]=(byBranch[branch]||0)+s.total_amount;});
  const sorted=Object.entries(byBranch).sort((a,b)=>b[1]-a[1]);
  if(sorted.length===0){
    if (window.AdminReportsUI?.setEmpty) window.AdminReportsUI.setEmpty(el, '🏪', ar?'لا توجد مبيعات':'No sales');
    else el.innerHTML=`<div class="empty"><div class="empty-icon">🏪</div>${ar?'لا توجد مبيعات':'No sales'}</div>`;
    return;
  }
  if (window.AdminReportsUI?.renderBranchReport) {
    window.AdminReportsUI.renderBranchReport(el, { ar, sorted });
  }
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
  if (window.AdminReportsUI?.setLoading) window.AdminReportsUI.setLoading(el);
  else el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const[y,m]=month.split('-').map(Number);
  const start=`${month}-01`;
  const end=new Date(y,m,0).toISOString().split('T')[0];
  let query=`?visit_date=gte.${start}&visit_date=lte.${end}&order=visit_date.desc&select=*`;
  if(empId) query+=`&employee_id=eq.${empId}`;
  const visits=await dbGet('branch_visits',query).catch(()=>[])||[];
  if(visits.length===0){
    if (window.AdminReportsUI?.setEmpty) window.AdminReportsUI.setEmpty(el, '📸', ar?'لا توجد زيارات':'No visits');
    else el.innerHTML=`<div class="empty"><div class="empty-icon">📸</div>${ar?'لا توجد زيارات':'No visits'}</div>`;
    return;
  }
  // Group by employee name
  const byEmp={};
  visits.forEach(v=>{
    const k=v.employee_name||v.manager_name||('ID:'+v.employee_id);
    if(!byEmp[k])byEmp[k]=[];
    byEmp[k].push(v);
  });
  if (window.AdminReportsUI?.renderVisitsReport) {
    window.AdminReportsUI.renderVisitsReport(el, { byEmp, visits });
  }
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
  if (window.AdminReportsUI?.setLoading) window.AdminReportsUI.setLoading(el);
  else el.innerHTML='<div class="full-loader"><div class="loader"></div></div>';
  const[y,m]=month.split('-').map(Number);
  const start=`${month}-01`;
  const end=new Date(y,m,0).toISOString().split('T')[0];
  let query=`?photo_date=gte.${start}&photo_date=lte.${end}&order=photo_date.desc&select=*`;
  if(empId) query+=`&employee_id=eq.${empId}`;
  const records=await dbGet('display_photos',query).catch(()=>[])||[];
  if(!records.length){
    if (window.AdminReportsUI?.setEmpty) window.AdminReportsUI.setEmpty(el, '🖼️', 'لا توجد صور');
    else el.innerHTML='<div class="empty"><div class="empty-icon">🖼️</div>لا توجد صور</div>';
    return;
  }
  const byEmp={};
  records.forEach(r=>{const k=r.employee_name||r.employee_id;if(!byEmp[k])byEmp[k]=[];byEmp[k].push(r);});
  if (window.AdminReportsUI?.renderDisplayReport) {
    window.AdminReportsUI.renderDisplayReport(el, {
      byEmp,
      canDelete: currentUser.role !== 'viewer',
    });
  }
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

