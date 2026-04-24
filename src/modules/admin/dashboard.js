// ═══════════════════════════════════════════════════════════
// modules/admin/dashboard.js — Admin dashboard (home) + perf ranking
// Provides globals: loadAdminDashboard, renderPerformanceRanking
// ═══════════════════════════════════════════════════════════

// ── ADMIN DASHBOARD ──
async function loadAdminDashboard(){
  // Show loader, hide content
  const loader=document.getElementById('dash-loader');
  const dashC=document.getElementById('dash-content');
  if(loader) loader.style.display='none';
  if(dashC) dashC.style.display='block';
  try{
    const today=todayStr(),pm=getPayrollMonth(),ar=currentLang==='ar';
    let allEmp=await dbGet('employees','?select=*');allEmployees=allEmp||[];
    // Filter for team leader: only show their team
    if(currentUser&&(currentUser.role==='manager'||currentUser.role==='team_leader')){
      const teamIds=await getManagerTeamIds();
      if(teamIds&&teamIds.length>0) allEmployees=allEmployees.filter(e=>teamIds.includes(e.id));
      else allEmployees=[];
    }
    const todayAtt=await dbGet('attendance',`?date=eq.${today}&select=*`);
    const present=todayAtt?todayAtt.length:0;
    document.getElementById('adm-present').textContent=present;
    window._todayPresentIds=(todayAtt||[]).map(a=>a.employee_id);
    window._todayAtt=todayAtt||[];
    document.getElementById('adm-absent').textContent=Math.max(0,allEmployees.length-present);
    // Yesterday
    const yestDate=new Date(Date.now()-86400000).toISOString().split('T')[0];
    const yestAtt=await dbGet('attendance',`?date=eq.${yestDate}&select=*`).catch(()=>[])||[];
    window._yestAtt=yestAtt;
    window._yestPresentIds=yestAtt.map(a=>a.employee_id);
    const yp=document.getElementById('adm-present-yest'),ya=document.getElementById('adm-absent-yest');
    if(yp) yp.textContent=yestAtt.length;
    if(ya) ya.textContent=Math.max(0,allEmployees.length-yestAtt.length);
    const presentEl=document.getElementById('adm-present');
    if(presentEl){presentEl.style.cursor='pointer';presentEl.onclick=function(){showAttList('present','today');};}
    const[todaySales,monthSales]=await Promise.all([dbGet('sales',`?date=eq.${today}&select=total_amount,employee_id`),dbGet('sales',`?date=gte.${pm.start}&date=lte.${pm.end}&select=total_amount,employee_id,product_name`)]);
    let todayTotal=0,monthTotal=0;
    (todaySales||[]).forEach(s=>todayTotal+=s.total_amount);(monthSales||[]).forEach(s=>monthTotal+=s.total_amount);
    document.getElementById('adm-sales-today').textContent='EGP '+fmtEGP(todayTotal);
    document.getElementById('adm-sales-month').textContent='EGP '+fmtEGP(monthTotal);
    renderPerformanceRanking(monthSales||[]);
    // Hide loader, show content
    applyLang();
    const el=document.getElementById('adm-emp-today');
    if(el){
      if(allEmployees.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">👥</div>${ar?'لا يوجد موظفون':'No employees'}</div>`;}
      else{
        const isViewer=currentUser.role==='viewer';
        el.innerHTML=allEmployees.map(emp=>{
          const att=todayAtt&&todayAtt.find(a=>a.employee_id===emp.id);
          const mapLink=att&&att.location_lat?`https://maps.google.com/?q=${att.location_lat},${att.location_lng}`:null;
          return`<div class="emp-card">
            <div class="emp-avatar" style="overflow:hidden">${emp.profile_photo?`<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">`:emp.name[0].toUpperCase()}</div>
            <div class="emp-info">
              <div class="emp-name">${emp.name}</div><div class="emp-branch">${emp.branch||'-'}</div>
              ${att?`<div style="font-size:10px;color:var(--green);margin-top:2px">${ar?'دخول':'In'}: ${att.check_in}${att.late_minutes>0?(ar?' (تأخر '+att.late_minutes+' د)':' ('+att.late_minutes+'m late)'):''} ${att.check_out?(ar?'· خروج: ':'· Out: ')+att.check_out:''}</div>`:''}
              ${mapLink?`<a href="${mapLink}" target="_blank" style="font-size:10px;color:var(--blue);text-decoration:none">📍 ${ar?'عرض الموقع':'View Location'}</a>`:att?`<div style="font-size:10px;color:var(--muted)">📍 ${ar?'لا يوجد موقع':'No location'}</div>`:''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
              <span class="badge ${att?(att.check_out?'badge-blue':'badge-green'):'badge-red'}">${att?(att.check_out?(ar?'غادر':'Left'):(ar?'حاضر':'Present')):(ar?'غائب':'Absent')}</span>
              ${att&&att.selfie_in?`<img src="${att.selfie_in}" class="selfie-preview" onclick="viewSelfie('${emp.name}','${att.selfie_in}','${att.selfie_out||''}','${mapLink||''}')">`:''} 
              ${!isViewer?`<button class="action-btn warn" onclick="openWarnModal(${emp.id},'${emp.name}')">⚠️</button>`:''}
            </div></div>`;
        }).join('');
      }
    }
    const leaves=await dbGet('leave_requests','?status=eq.pending&select=*');
    const lel=document.getElementById('adm-leave-requests');
    if(lel){
      if(!leaves||leaves.length===0){lel.innerHTML=`<div style="color:var(--muted);font-size:12px;padding:8px">${ar?'لا توجد طلبات معلقة':'No pending requests'}</div>`;}
      else{
        const isViewer=currentUser.role==='viewer';
        lel.innerHTML=leaves.map(l=>`<div class="perm-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:700">${l.employee_name}</div>
            <span class="badge ${l.leave_type==='vacation'?'badge-blue':'badge-yellow'}">${l.leave_type==='vacation'?(ar?'إجازة':'Vacation'):(ar?'إذن':'Permission')}</span>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${l.reason}</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${l.leave_type==='vacation'?(ar?'تاريخ: ':'Date: ')+(l.leave_date||''):(ar?'المدة: ':'Duration: ')+l.duration_minutes+(ar?' د':' min')}</div>
          ${!isViewer?`<div style="display:flex;gap:8px"><button class="perm-btn approve" onclick="respondLeave(${l.id},'approved')">✅ ${ar?'موافقة':'Approve'}</button><button class="perm-btn reject" onclick="respondLeave(${l.id},'rejected')">❌ ${ar?'رفض':'Reject'}</button></div>`:''}
          </div>`).join('');
      }
    }
  }catch(e){console.error(e)}
}

async function renderPerformanceRanking(monthSales){
  const el=document.getElementById('adm-performance-list');const ar=currentLang==='ar';
  if(!el||allEmployees.length===0){if(el)el.innerHTML=`<div class="empty"><div class="empty-icon">📊</div>${ar?'لا توجد بيانات':'No data'}</div>`;return}
  const salesByEmp={};monthSales.forEach(s=>{salesByEmp[s.employee_id]=(salesByEmp[s.employee_id]||0)+s.total_amount});
  // Filter out team leaders from performance ranking
  const empsOnly=allEmployees.filter(e=>e.role!=='team_leader');
  const ranked=empsOnly.map(e=>({...e,sales:salesByEmp[e.id]||0})).sort((a,b)=>b.sales-a.sales);
  const maxSales=ranked[0]?.sales||1;const medals=['🥇','🥈','🥉'];
  el.innerHTML=ranked.map((e,i)=>`<div class="perf-bar-wrap">
    <div class="perf-rank">${medals[i]||'#'+(i+1)}</div>
    <div class="perf-name">${e.name}</div>
    <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${e.sales>0?Math.max(4,Math.round(e.sales/maxSales*100)):0}%;background:${i===0?'var(--gold)':i===1?'var(--silver)':i===2?'var(--bronze)':'var(--green)'}"></div></div>
    <div class="perf-val">EGP ${fmtEGP(e.sales)}</div></div>`).join('');
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
  const color=isPresent?'var(--green)':'var(--red)';
  const icon=isPresent?'✅':'😴';
  const titleAr=isPresent?(isToday?'الحاضرون اليوم':'حاضرون أمس'):(isToday?'الغائبون اليوم':'غائبون أمس');
  const titleEn=isPresent?(isToday?'Present Today':'Present Yesterday'):(isToday?'Absent Today':'Absent Yesterday');
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML=`<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid ${color}">
    <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:14px">${icon} ${ar?titleAr:titleEn} (${list.length})</div>
    ${list.length===0?`<div style="text-align:center;color:var(--muted);padding:20px">${ar?'لا يوجد':'None'}</div>`:
    list.map(item=>{
      const e=item.emp,a=item.att;
      const detail=a?`${ar?'دخول':'In'}: ${a.check_in||'-'}${a.late_minutes>0?' · ⚠️'+a.late_minutes+(ar?'د':'m'):''}${a.check_out?(ar?' · خروج: ':' · Out: ')+a.check_out:''}`:(e.branch||'-');
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">${e.profile_photo?`<img src="${e.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(e.name||'?')[0].toUpperCase()}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">${e.name||'?'}</div><div style="font-size:11px;color:var(--muted)">${detail}</div></div>
      </div>`;}).join('')}
    <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar?'إغلاق':'Close'}</button>
  </div>`;
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
}
