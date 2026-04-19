// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// Depends on: fallbacks.js (dbGet/dbPost, notify, applyLang)
// ═══════════════════════════════════════════════════════════

function showApp(){
  if(!currentUser)return showPage('login-page');
  applyLang();

  // ── RESET كامل لكل الـ nav قبل أي role logic ──
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
    n.style.display='none'; // ابدأ بكل حاجة مخفية
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

    // ── إظهار الـ nav items حسب الـ role بالظبط ──
    const role = currentUser.role;

    if(role==='superadmin'||role==='admin'){
      // Dashboard, Employees(hidden), Branches, Reports, Chat, Settings — NO Visits
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        if(oc.includes("'employees'")) n.style.display='none'; // employees في settings
        else n.style.display='';
      });
      document.getElementById('adm-visits-nav').style.display='none';
    }
    else if(role==='viewer'){
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        if(oc.includes("'employees'")) n.style.display='none';
        else n.style.display='';
      });
      document.getElementById('adm-visits-nav').style.display='none';
      document.getElementById('settings-nav-item').style.display='none';
    }
    else if(role==='manager'){
      // Manager: نفس الـ admin — بدون visits
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        if(oc.includes("'employees'")) n.style.display='none';
        else n.style.display='';
      });
      document.getElementById('adm-visits-nav').style.display='none';
    }
    else if(role==='team_leader'){
      // Team Leader: Visits + Settings فقط — لا branches ولا reports
      document.getElementById('adm-visits-nav').style.display='flex';
      document.getElementById('settings-nav-item').style.display='flex';
      // dashboard يظهر كمان
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        if(oc.includes("'dashboard'")) n.style.display='flex';
        if(oc.includes('reports')) n.style.display='none';
        if(oc.includes("'branches'")) n.style.display='none';
        if(oc.includes("'employees'")) n.style.display='none';
      });
    }

    // role-specific extras
    if(role==='superadmin') document.getElementById('admins-section').style.display='block';
    else document.getElementById('admins-section').style.display='none';
    if(role==='viewer'){const b=document.getElementById('add-emp-btn');if(b)b.style.display='none';}

    showPage('admin-app');

    // تهيئة الـ tab الأول الظاهر
    if(role==='team_leader'){
      const vd=document.getElementById('admin-visits');
      if(vd) vd.style.display='block';
      ['dashboard','employees','branches','reports','settings','chat'].forEach(t=>{
        const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
      });
      document.getElementById('adm-visits-nav').classList.add('active');
      loadTLVisitsTab();
    } else {
      const dashNav=document.querySelector('#admin-app .bottom-nav .nav-item:not([style*="none"])');
      if(typeof adminTab==='function' && dashNav) adminTab('dashboard', dashNav);
      else { const d=document.getElementById('admin-dashboard');if(d)d.style.display='block'; }
      loadAdminDashboard();
    }

    loadAllEmployees();loadBranches();clearOldVisitPhotos();
    if(role==='superadmin'||role==='admin') loadAdminsList();
    setTimeout(fixNavDirection, 100);

  }else{
    showPage('emp-app');
    if(typeof empTab==='function'){
      const homeNav=document.querySelector('#emp-app .nav-item');
      empTab('home', homeNav);
    } else {
      const h=document.getElementById('emp-home');if(h)h.style.display='block';
    }
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
  setTimeout(fixNavDirection, 100);
}

// ── BACK BUTTON HANDLING ──
(function(){
  window.addEventListener('popstate', function(e) {
    const chatModal=document.getElementById('chat-modal');
    if(chatModal&&chatModal.classList.contains('open')){closeChat();history.pushState(null,'',location.href);return;}
    const openModal=document.querySelector('.modal-overlay.open');
    if(openModal){openModal.classList.remove('open');history.pushState(null,'',location.href);return;}
    history.pushState(null,'',location.href);
  });
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
  if(videoStream){try{videoStream.getTracks().forEach(t=>t.stop());}catch(_){}videoStream=null;}
  if(chatSubscription){
    try{if(typeof chatSubscription==='function')chatSubscription();else clearInterval(chatSubscription);}catch(_){}
    chatSubscription=null;
  }
  currentChat=null;
  localStorage.removeItem('oraimo_user');
  window.currentUser=null;
  _isSubmitting=false;
  allAdmins=[];allBranches=[];allEmployees=[];
  managerTeamData={};
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{n.style.display='';n.classList.remove('active');});
  const visNav=document.getElementById('adm-visits-nav');if(visNav)visNav.style.display='none';
  ['dashboard','employees','branches','reports','settings','visits','chat'].forEach(t=>{
    const d=document.getElementById('admin-'+t);if(d)d.style.display='none';
  });
  document.querySelectorAll('#report-tabs .tab').forEach(t=>t.style.display='');
  ['add-emp-btn','add-emp-btn2'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
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
