// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// Depends on: fallbacks.js (dbGet/dbPost, notify, applyLang)
// ═══════════════════════════════════════════════════════════

function showApp(){
  if(!currentUser)return showPage('login-page');
  applyLang();
  // Hide الفريق nav (moved to settings)
  setTimeout(()=>{
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
      const oc=n.getAttribute('onclick')||'';
      if(oc.includes("'employees'")) n.style.display='none';
    });
  },50);
  // ALWAYS reset nav state first to prevent bleed from previous session
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{n.style.display='';n.classList.remove('active');});
  const visNavReset=document.getElementById('adm-visits-nav');
  if(visNavReset) visNavReset.style.display='none';
  document.querySelectorAll('#report-tabs .tab').forEach(t=>t.style.display='');
  ['add-emp-btn','add-emp-btn2'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
  document.getElementById('admins-section').style.display='none';
  // Make first nav item active
  const firstNav=document.querySelector('#admin-app .bottom-nav .nav-item');
  if(firstNav) firstNav.classList.add('active');

  const isAdmin=['superadmin','admin','manager','viewer','team_leader'].includes(currentUser.role);
  if(isAdmin){
    document.getElementById('admin-name-top').textContent=currentUser.name||'Admin';
    const chip=document.getElementById('admin-role-chip');
    chip.textContent=currentUser.role==='superadmin'?'Super Admin':currentUser.role==='manager'?'Team Leader':currentUser.role==='team_leader'?'Team Leader':currentUser.role.charAt(0).toUpperCase()+currentUser.role.slice(1);
    chip.className='role-chip badge role-'+currentUser.role;
    if(currentUser.role==='viewer')document.getElementById('settings-nav-item').style.display='none';
    if(currentUser.role==='superadmin')document.getElementById('admins-section').style.display='block';
    if(currentUser.role==='viewer'){const b=document.getElementById('add-emp-btn');if(b)b.style.display='none'}
    showPage('admin-app');
    loadAdminDashboard();loadAllEmployees();loadBranches();clearOldVisitPhotos();
    if(currentUser.role==='superadmin'||currentUser.role==='admin')loadAdminsList();
    // Reset all nav items to visible for admin/superadmin
    if(currentUser.role==='superadmin'||currentUser.role==='admin'||currentUser.role==='viewer'){
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>n.style.display='');
      document.getElementById('adm-visits-nav').style.display='none';
    }
    if(currentUser.role==='manager'){
      // Manager from admins table: show visits nav too
      setTimeout(()=>{
        const admVisNav=document.getElementById('adm-visits-nav');
        if(admVisNav) admVisNav.style.display='flex';
      },100);
    }
  setTimeout(fixNavDirection, 100);
  if(currentUser.role==='team_leader'){
      // Team leader: visits + employees + settings (for team mgmt), hide branches/reports
      setTimeout(()=>{
        // show visits nav
        const admVisNav=document.getElementById('adm-visits-nav');
        if(admVisNav) admVisNav.style.display='flex';
        // show settings nav (team leader manages their team there)
        const settingsNavEl=document.getElementById('settings-nav-item');
        if(settingsNavEl) settingsNavEl.style.display='flex';
        // hide branches nav
        const branchesNavEl=document.getElementById('adm-branches-nav');
        if(branchesNavEl) branchesNavEl.style.display='none';
        // hide reports nav
        document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
          const oc=n.getAttribute('onclick')||'';
          if(oc.includes('reports')) n.style.display='none';
        });
        // hide add employee button
        ['add-emp-btn','add-emp-btn2'].forEach(id=>{
          const el=document.getElementById(id);
          if(el) el.style.display='none';
        });
        // auto-navigate to visits tab
        const visNavEl=document.getElementById('adm-visits-nav');
        if(visNavEl){
          document.querySelectorAll('#admin-app .nav-item').forEach(n=>n.classList.remove('active'));
          visNavEl.classList.add('active');
          ['dashboard','employees','branches','reports','settings'].forEach(t=>{
            const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
          });
          const vd=document.getElementById('admin-visits');
          if(vd) vd.style.display='block';
          loadTLVisitsTab();
        }
      },200);
    }
  }else{
    showPage('emp-app');
    document.getElementById('emp-name-top').textContent=currentUser.name;
    document.getElementById('profile-name').textContent=currentUser.name;
    document.getElementById('profile-branch').textContent=currentUser.branch||'';
    const dayLabel=currentLang==='ar'?DAYS_AR[currentUser.day_off]:DAYS_EN[currentUser.day_off];
    document.getElementById('profile-dayoff').innerHTML=`<span class="badge badge-blue">${currentLang==='ar'?'الإجازة:':'Day Off:'} ${dayLabel||'-'}</span>`;
    loadEmpData();renderProducts();loadModelTargetAlert();
    // Hide visits tab (team leaders only via admin app)
    const visNav=document.querySelector('#emp-app .nav-item[onclick*=\"visits\"]');
    if(visNav) visNav.style.display='none';
  }
  // Register OneSignal for ALL users (admin + employees) & fix nav direction
  if(typeof registerOneSignalUser==='function') registerOneSignalUser();
  setTimeout(fixNavDirection, 100);
}

// ── BACK BUTTON HANDLING ──
(function(){
  window.addEventListener('popstate', function(e) {
    // If chat is open, close chat first
    const chatModal=document.getElementById('chat-modal');
    if(chatModal&&chatModal.classList.contains('open')){closeChat();history.pushState(null,'',location.href);return;}
    // If any modal is open, close it
    const openModal=document.querySelector('.modal-overlay.open');
    if(openModal){openModal.classList.remove('open');history.pushState(null,'',location.href);return;}
    // Always trap back — never let user leave the app while logged in
    history.pushState(null,'',location.href);
  });
  // Push two states so the first back press is absorbed
  history.pushState(null,'',location.href);
  history.pushState(null,'',location.href);
})();

// ── AUTH ──
async function doLogin(){
  if(_isSubmitting) return;
  const username=document.getElementById('login-user').value.trim();
  const pass=document.getElementById('login-pass').value.trim();
  const errEl=document.getElementById('login-err');
  const btn=document.querySelector('#login-page .btn-green');
  const ar=currentLang==='ar';
  if(!username||!pass){errEl.textContent=ar?'أدخل بيانات الدخول':'Enter your credentials';return;}
  _isSubmitting=true;
  if(btn){btn.disabled=true;btn.textContent=ar?'جاري الدخول...':'Signing in...';}
  errEl.textContent='';
  try{
    if(username==='admin'&&pass==='Oraimo@Admin2026'){
      window.currentUser={role:'superadmin',name:'Super Admin'};
      localStorage.setItem('oraimo_user',JSON.stringify(window.currentUser));
      showApp();return;
    }
    const uname=encodeURIComponent(username);
    const admRes=await dbGet('admins',`?username=eq.${uname}&select=*`).catch(()=>[]);
    const admMatch=(admRes||[]).find(r=>r.password===pass);
    if(admMatch){
      window.currentUser={...admMatch,role:admMatch.role||'admin'};
      delete window.currentUser.password;
      localStorage.setItem('oraimo_user',JSON.stringify(window.currentUser));
      showApp();return;
    }
    const empRes=await dbGet('employees',`?username=eq.${uname}&select=*`).catch(()=>[]);
    const empMatch=(empRes||[]).find(r=>r.password===pass);
    if(!empMatch){errEl.textContent=ar?'بيانات دخول غير صحيحة':'Invalid credentials';return;}
    window.currentUser={...empMatch,role:empMatch.role||'employee'};
    delete window.currentUser.password;
    localStorage.setItem('oraimo_user',JSON.stringify(window.currentUser));
    showApp();
  }catch(e){
    console.error('[login]',e);
    errEl.textContent=ar?'خطأ في الاتصال، حاول مرة أخرى':'Connection error, try again';
  }finally{
    _isSubmitting=false;
    if(btn){btn.disabled=false;btn.textContent=ar?'تسجيل الدخول':'Sign In';}
  }
}
function doLogout(){
  // Stop any active camera
  if(videoStream){try{videoStream.getTracks().forEach(t=>t.stop());}catch(_){}videoStream=null;}
  // Stop chat polling
  if(chatSubscription){
    try{if(typeof chatSubscription==='function')chatSubscription();else clearInterval(chatSubscription);}catch(_){}
    chatSubscription=null;
  }
  currentChat=null;
  // Clear session — مش بنعمل reload عشان التطبيق يفضل شغال
  localStorage.removeItem('oraimo_user');
  window.currentUser=null;
  
  allAdmins=[];allBranches=[];
  managerTeamData={};
  // Reset admin nav
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{n.style.display='';n.classList.remove('active');});
  const visNav=document.getElementById('adm-visits-nav');if(visNav)visNav.style.display='none';
  // Reset tabs
  ['dashboard','employees','branches','reports','settings','visits'].forEach(t=>{
    const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
  });
  document.querySelectorAll('#report-tabs .tab').forEach(t=>t.style.display='');
  ['add-emp-btn','add-emp-btn2'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
  // Clear login form
  const lu=document.getElementById('login-user');if(lu)lu.value='';
  const lp=document.getElementById('login-pass');if(lp)lp.value='';
  const le=document.getElementById('login-err');if(le)le.textContent='';
  showPage('login-page');
}

// ── CLOCK ──
function startClock(){
  function tick(){
    const now=new Date(),locale=currentLang==='ar'?'ar-EG':'en-US';
    const el=document.getElementById('live-clock'),del=document.getElementById('live-date');
    if(el)el.textContent=now.toLocaleTimeString(locale,{hour12:false});
    if(del)del.textContent=now.toLocaleDateString(locale,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  }
  tick();setInterval(tick,1000);
}

// ── EMP DATA ──
