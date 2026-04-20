// ═══════════════════════════════════════════════════════════
// modules/auth.js
// ═══════════════════════════════════════════════════════════

function showApp(){
  if(!currentUser)return showPage('login-page');
  applyLang();

  // RESET: كل الـ nav مخفي أول
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
    n.style.display='none';
    n.classList.remove('active');
  });

  const isAdmin=['superadmin','admin','manager','viewer','team_leader'].includes(currentUser.role);

  if(isAdmin){
    document.getElementById('admin-name-top').textContent=currentUser.name||'Admin';
    const chip=document.getElementById('admin-role-chip');
    chip.textContent=currentUser.role==='superadmin'?'Super Admin':
                     currentUser.role==='manager'?'Team Leader':
                     currentUser.role==='team_leader'?'Team Leader':
                     currentUser.role.charAt(0).toUpperCase()+currentUser.role.slice(1);
    chip.className='role-chip badge role-'+currentUser.role;

    const role=currentUser.role;

    if(role==='superadmin'||role==='admin'||role==='viewer'||role==='manager'){
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        const id=n.id||'';
        if(oc.includes("'employees'")) n.style.display='none';
        else if(id==='adm-visits-nav') n.style.display='none';
        else n.style.display='flex';
      });
    } else if(role==='team_leader'){
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        const id=n.id||'';
        if(oc.includes("'dashboard'")) n.style.display='flex';
        else if(id==='adm-visits-nav') n.style.display='flex';
        else if(id==='settings-nav-item') n.style.display='flex';
        else n.style.display='none';
      });
    }

    if(role==='superadmin') document.getElementById('admins-section').style.display='block';
    else document.getElementById('admins-section').style.display='none';
    if(role==='viewer'){
      const b=document.getElementById('add-emp-btn');if(b)b.style.display='none';
      document.getElementById('settings-nav-item').style.display='none';
    }

    showPage('admin-app');

    if(role==='team_leader'){
      ['dashboard','employees','branches','reports','settings','chat'].forEach(t=>{
        const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
      });
      const vd=document.getElementById('admin-visits');if(vd)vd.style.display='block';
      document.getElementById('adm-visits-nav').classList.add('active');
      loadTLVisitsTab();
    } else {
      ['employees','branches','reports','settings','visits','chat'].forEach(t=>{
        const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
      });
      const dd=document.getElementById('admin-dashboard');if(dd)dd.style.display='block';
      const dashNav=document.querySelector('#admin-app .bottom-nav .nav-item[onclick*="dashboard"]');
      if(dashNav){document.querySelectorAll('#admin-app .nav-item').forEach(n=>n.classList.remove('active'));dashNav.classList.add('active');}
      loadAdminDashboard();
    }

    loadAllEmployees();loadBranches();clearOldVisitPhotos();
    if(role==='superadmin'||role==='admin') loadAdminsList();
    setTimeout(fixNavDirection,100);

  } else {
    showPage('emp-app');
    const homeNav=document.querySelector('#emp-app .nav-item');
    if(typeof empTab==='function'&&homeNav) empTab('home',homeNav);
    else { const h=document.getElementById('emp-home');if(h)h.style.display='block'; }
    document.getElementById('emp-name-top').textContent=currentUser.name;
    document.getElementById('profile-name').textContent=currentUser.name;
    document.getElementById('profile-branch').textContent=currentUser.branch||'';
    const dayLabel=currentLang==='ar'?DAYS_AR[currentUser.day_off]:DAYS_EN[currentUser.day_off];
    document.getElementById('profile-dayoff').innerHTML=`<span class="badge badge-blue">${currentLang==='ar'?'الإجازة:':'Day Off:'} ${dayLabel||'-'}</span>`;
    loadEmpData();renderProducts();loadModelTargetAlert();
    const visNav=document.querySelector('#emp-app .nav-item[onclick*="visits"]');
    if(visNav) visNav.style.display='none';
  }
  if(typeof registerOneSignalUser==='function') registerOneSignalUser();
  setTimeout(fixNavDirection,100);
}

// ── BACK BUTTON ──
(function(){
  window.addEventListener('popstate',function(){
    const chatModal=document.getElementById('chat-modal');
    if(chatModal&&chatModal.classList.contains('open')){if(typeof closeChat==='function')closeChat();history.pushState(null,'',location.href);return;}
    const openModal=document.querySelector('.modal-overlay.open');
    if(openModal){openModal.classList.remove('open');history.pushState(null,'',location.href);return;}
    history.pushState(null,'',location.href);
  });
  try{history.pushState(null,'',location.href);history.pushState(null,'',location.href);}catch(_){}
})();

// ── LOGIN ──
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
    // Super Admin
    if(username==='admin'&&pass==='Oraimo@Admin2026'){
      window.currentUser={role:'superadmin',name:'Super Admin'};
      localStorage.setItem('oraimo_user',JSON.stringify(window.currentUser));
      showApp();return;
    }
    // Admin table
    const admRes=await dbGet('admins',`?username=eq.${encodeURIComponent(username)}&select=*`).catch(()=>[]);
    const admMatch=(admRes||[]).find(r=>r.password===pass);
    if(admMatch){
      window.currentUser={...admMatch,role:admMatch.role||'admin'};
      delete window.currentUser.password;
      localStorage.setItem('oraimo_user',JSON.stringify(window.currentUser));
      showApp();return;
    }
    // Employee table
    const empRes=await dbGet('employees',`?username=eq.${encodeURIComponent(username)}&select=*`).catch(()=>[]);
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

// ── LOGOUT ──
function doLogout(){
  if(typeof videoStream!=='undefined'&&videoStream){try{videoStream.getTracks().forEach(t=>t.stop());}catch(_){}videoStream=null;}
  if(typeof chatSubscription!=='undefined'&&chatSubscription){try{if(typeof chatSubscription==='function')chatSubscription();else clearInterval(chatSubscription);}catch(_){}chatSubscription=null;}
  if(typeof currentChat!=='undefined') currentChat=null;
  localStorage.removeItem('oraimo_user');
  window.currentUser=null;
  if(typeof _isSubmitting!=='undefined') _isSubmitting=false;
  if(typeof allAdmins!=='undefined') allAdmins=[];
  if(typeof allBranches!=='undefined') allBranches=[];
  if(typeof allEmployees!=='undefined') allEmployees=[];
  if(typeof managerTeamData!=='undefined') managerTeamData={};
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{n.style.display='';n.classList.remove('active');});
  const visNav=document.getElementById('adm-visits-nav');if(visNav)visNav.style.display='none';
  ['dashboard','employees','branches','reports','settings','visits','chat'].forEach(t=>{
    const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
  });
  document.querySelectorAll('#report-tabs .tab').forEach(t=>t.style.display='');
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
