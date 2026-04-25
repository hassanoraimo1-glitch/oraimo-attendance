// ═══════════════════════════════════════════════════════════
// modules/admin/dashboard.js — Admin dashboard (home) + perf ranking
// Provides globals: getManagerTeamIds, loadAdminDashboard,
//   renderPerformanceRanking, showAttList
// ═══════════════════════════════════════════════════════════

/** IDs of employees assigned to the current manager / team leader (manager_teams). */
async function getManagerTeamIds() {
  if (!currentUser?.id) return [];
  const rows =
    (await dbGet('manager_teams', `?manager_id=eq.${currentUser.id}&select=employee_id`).catch(() => [])) || [];
  return rows.map((r) => Number(r.employee_id)).filter((id) => !Number.isNaN(id));
}

async function loadAdminDashboard(){
  const loader=document.getElementById('dash-loader');
  const dashC=document.getElementById('dash-content');
  if(loader) loader.style.display='none';
  if(dashC) dashC.style.display='block';
  try{
    const today=todayStr(),pm=getPayrollMonth(),ar=currentLang==='ar';
    const yestDate=new Date(Date.now()-86400000).toISOString().split('T')[0];

    const [allEmp, todayAtt, yestAtt, todaySales, monthSales, leaves] = await Promise.all([
      dbGet('employees','?select=*').catch(()=>[]),
      dbGet('attendance',`?date=eq.${today}&select=*`).catch(()=>[]),
      dbGet('attendance',`?date=eq.${yestDate}&select=*`).catch(()=>[]),
      dbGet('sales',`?date=eq.${today}&select=total_amount,employee_id`).catch(()=>[]),
      dbGet('sales',`?date=gte.${pm.start}&date=lte.${pm.end}&select=total_amount,employee_id,product_name`).catch(()=>[]),
      dbGet('leave_requests','?status=eq.pending&select=*').catch(()=>[])
    ]);

    allEmployees=allEmp||[];
    if(currentUser&&(currentUser.role==='manager'||currentUser.role==='team_leader')){
      const teamIds=await getManagerTeamIds();
      if(teamIds&&teamIds.length>0){
        const idSet=new Set(teamIds.map((id)=>Number(id)));
        allEmployees=allEmployees.filter((e)=>idSet.has(Number(e.id)));
      }else{
        allEmployees=[];
      }
    }

    const present=(todayAtt||[]).length;
    window._todayAtt=todayAtt||[];
    window._todayPresentIds=(todayAtt||[]).map(a=>a.employee_id);
    document.getElementById('adm-present').textContent=present;
    document.getElementById('adm-absent').textContent=Math.max(0,allEmployees.length-present);

    window._yestAtt=yestAtt||[];
    window._yestPresentIds=(yestAtt||[]).map(a=>a.employee_id);
    const yp=document.getElementById('adm-present-yest');
    const ya=document.getElementById('adm-absent-yest');
    if(yp) yp.textContent=(yestAtt||[]).length;
    if(ya) ya.textContent=Math.max(0,allEmployees.length-(yestAtt||[]).length);

    let todayTotal=0,monthTotal=0;
    (todaySales||[]).forEach(s=>todayTotal+=s.total_amount);
    (monthSales||[]).forEach(s=>monthTotal+=s.total_amount);
    document.getElementById('adm-sales-today').textContent='EGP '+fmtEGP(todayTotal);
    document.getElementById('adm-sales-month').textContent='EGP '+fmtEGP(monthTotal);
    renderPerformanceRanking(monthSales||[]);

    applyLang();
    const el=document.getElementById('adm-emp-today');
    if(el){
      if (window.AdminUI?.renderDashboardEmployees) {
        window.AdminUI.renderDashboardEmployees({
          container: el,
          employees: allEmployees,
          todayAtt: todayAtt || [],
          isViewer: currentUser.role === 'viewer',
          isArabic: ar,
          emptyText: ar ? 'لا يوجد موظفون' : 'No employees',
        });
      } else {
        el.innerHTML = '';
      }
    }
    const lel=document.getElementById('adm-leave-requests');
    if(lel){
      if (window.AdminUI?.renderPendingLeaves) {
        window.AdminUI.renderPendingLeaves({
          container: lel,
          leaves: leaves || [],
          isViewer: currentUser.role === 'viewer',
          isArabic: ar,
          emptyText: ar ? 'لا توجد طلبات معلقة' : 'No pending requests',
        });
      } else {
        lel.innerHTML = '';
      }
    }
  }catch(e){console.error('[dashboard]',e)}
}

async function renderPerformanceRanking(monthSales){
  const el=document.getElementById('adm-performance-list');const ar=currentLang==='ar';
  if(!el||allEmployees.length===0){if(el)el.innerHTML=`<div class="empty"><div class="empty-icon">📊</div>${ar?'لا توجد بيانات':'No data'}</div>`;return}
  const salesByEmp={};monthSales.forEach(s=>{salesByEmp[s.employee_id]=(salesByEmp[s.employee_id]||0)+s.total_amount});
  const empsOnly=allEmployees.filter(e=>e.role!=='team_leader');
  const ranked=empsOnly.map(e=>({...e,sales:salesByEmp[e.id]||0})).sort((a,b)=>b.sales-a.sales);
  if (window.AdminUI?.renderPerformance) {
    window.AdminUI.renderPerformance({
      container: el,
      ranked,
      isArabic: ar,
    });
  }
}

function showAttList(type,day){
  const ar=currentLang==='ar';
  const isToday=day==='today';
  const attData=isToday?(window._todayAtt||[]):(window._yestAtt||[]);
  const presentIds=attData.map(a=>a.employee_id);
  const empMap={};(allEmployees||[]).forEach(e=>{empMap[e.id]=e;});
  const isPresent=type==='present';
  const list=isPresent
    ?attData.map(a=>({emp:empMap[a.employee_id]||{name:String(a.employee_id)},att:a}))
    :allEmployees.filter(e=>!presentIds.includes(e.id)).map(e=>({emp:e,att:null}));
  if (window.AdminUI?.showAttendanceOverlay) {
    window.AdminUI.showAttendanceOverlay({
      list,
      isPresent,
      isToday,
      isArabic: ar,
    });
  }
}
