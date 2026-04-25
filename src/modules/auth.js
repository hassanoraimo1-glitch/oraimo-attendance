// ═══════════════════════════════════════════════════════════
// modules/auth.js — Login, logout, app routing, clock
// Provides globals: showApp, doLogin, doLogout, startClock
// Depends on: fallbacks.js (dbGet/dbPost, notify, applyLang)
// ═══════════════════════════════════════════════════════════

function _runAdminShell(){
  document.getElementById('admin-name-top').textContent=currentUser.name||'Admin';
  const chip=document.getElementById('admin-role-chip');
  chip.textContent=currentUser.role==='superadmin'?'Super Admin':currentUser.role==='manager'?'Team Leader':currentUser.role==='team_leader'?'Team Leader':currentUser.role.charAt(0).toUpperCase()+currentUser.role.slice(1);
  chip.className='role-chip badge role-'+currentUser.role;
  if(currentUser.role==='viewer')document.getElementById('settings-nav-item').style.display='none';
  if(currentUser.role==='superadmin')document.getElementById('admins-section').style.display='block';
  if(currentUser.role==='viewer'){const b=document.getElementById('add-emp-btn');if(b)b.style.display='none'}
  showPage('admin-app');
  const dashNav=document.querySelector('#admin-app .bottom-nav .nav-item');
  if(typeof adminTab==='function' && dashNav){
    adminTab('dashboard', dashNav);
  } else {
    const d=document.getElementById('admin-dashboard');
    if(d) d.style.display='block';
  }
  void (async function _bootAdminData(){
    try{
      if(typeof loadAllEmployees==='function') await loadAllEmployees();
      if(typeof loadBranches==='function') await loadBranches();
      if(typeof loadAdminDashboard==='function') await loadAdminDashboard();
    }catch(e){
      console.error('[admin data boot]', e);
      if(typeof notify==='function') notify(currentLang==='ar'?'تعذر تحميل البيانات — حاول تحديث الصفحة':'Failed to load data — please refresh','error');
    }
  })();
  clearOldVisitPhotos();
  if(currentUser.role==='superadmin'||currentUser.role==='admin')loadAdminsList();
  if(currentUser.role==='superadmin'||currentUser.role==='admin'||currentUser.role==='viewer'){
    document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>n.style.display='');
    document.getElementById('adm-visits-nav').style.display='none';
  }
  setTimeout(fixNavDirection, 100);
  if(currentUser.role==='team_leader'){
    setTimeout(()=>{
      const admVisNav=document.getElementById('adm-visits-nav');
      if(admVisNav) admVisNav.style.display='flex';
      const settingsNavEl=document.getElementById('settings-nav-item');
      if(settingsNavEl) settingsNavEl.style.display='flex';
      const branchesNavEl=document.getElementById('adm-branches-nav');
      if(branchesNavEl) branchesNavEl.style.display='none';
      document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{
        const oc=n.getAttribute('onclick')||'';
        if(oc.includes('reports')) n.style.display='none';
      });
      ['add-emp-btn','add-emp-btn2'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.style.display='none';
      });
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
  if(typeof registerOneSignalUser==='function') registerOneSignalUser();
  setTimeout(fixNavDirection, 100);
}

function showApp(){
  if(!currentUser)return showPage('login-page');
  applyLang();
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{n.style.display='';n.classList.remove('active');});
  const visNavReset=document.getElementById('adm-visits-nav');
  if(visNavReset) visNavReset.style.display='none';
  document.querySelectorAll('#report-tabs .tab').forEach(t=>t.style.display='');
  ['add-emp-btn','add-emp-btn2'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='';});
  const admSec=document.getElementById('admins-section');
  if(admSec) admSec.style.display='none';
  const firstNav=document.querySelector('#admin-app .bottom-nav .nav-item');
  if(firstNav) firstNav.classList.add('active');

  const isAdmin=['superadmin','admin','manager','viewer','team_leader'].includes(currentUser.role);
  if(isAdmin){
    const go=function(){
      _runAdminShell();
    };
    if(typeof lazyLoadAdminModules==='function'){
      lazyLoadAdminModules().then(go).catch(function(err){
        console.error('[lazyLoadAdminModules]', err);
        if(typeof notify==='function')notify(currentLang==='ar'?'تعذر تحميل لوحة الإدارة':'Could not load admin panel','error');
        if(typeof doLogout==='function')doLogout();
      });
    }else{
      go();
    }
  }else{
    showPage('emp-app');
    if(typeof empTab==='function'){
      const homeNav=document.querySelector('#emp-app .nav-item');
      empTab('home', homeNav);
    } else {
      const h=document.getElementById('emp-home');
      if(h) h.style.display='block';
    }
    document.getElementById('emp-name-top').textContent=currentUser.name;
    document.getElementById('profile-name').textContent=currentUser.name;
    document.getElementById('profile-branch').textContent=currentUser.branch||'';
    const dayLabel=currentLang==='ar'?DAYS_AR[currentUser.day_off]:DAYS_EN[currentUser.day_off];
    document.getElementById('profile-dayoff').innerHTML=`<span class="badge badge-blue">${currentLang==='ar'?'الإجازة:':'Day Off:'} ${dayLabel||'-'}</span>`;
    loadEmpData();renderProducts();loadModelTargetAlert();
    const visNav=document.querySelector('#emp-app .nav-item[onclick*="visits"]');
    if(visNav) visNav.style.display='none';
    if(typeof registerOneSignalUser==='function') registerOneSignalUser();
    setTimeout(fixNavDirection, 100);
  }
}

// ── BACK BUTTON — handled in bootstrap.js ──

// ── AUTH ──
function _saveUser(u){try{localStorage.setItem('oraimo_user',JSON.stringify(u));}catch(_){try{sessionStorage.setItem('oraimo_user',JSON.stringify(u));}catch(_){}}}

let _isSubmitting=false;

async function doLogin(){
  if(_isSubmitting) return;
  const username=(document.getElementById('login-user').value||'').trim().replace(/[\u200B-\u200D\uFEFF]/g,'');
  const pass=(document.getElementById('login-pass').value||'').trim();
  const errEl=document.getElementById('login-err');
  const btn=document.querySelector('#login-page .btn-green');
  const ar=currentLang==='ar';
  if(!username||!pass){errEl.textContent=ar?'أدخل بيانات الدخول':'Enter your credentials';return;}
  _isSubmitting=true;
  if(btn){btn.disabled=true;btn.textContent=ar?'جاري الدخول...':'Signing in...';}
  errEl.textContent='';
  try{
    if(username==='admin'&&pass==='Oraimo@Admin2026'){
      window.currentUser={role:'superadmin',name:'Super Admin',id:-1};
      _saveUser(window.currentUser);showApp();return;
    }
    const uname=encodeURIComponent(username);
    let admRes;try{admRes=await dbGet('admins',`?username=eq.${uname}&select=*`);}catch(_){admRes=[];}
    const admMatch=(admRes||[]).find(r=>r.password===pass);
    if(admMatch){
      window.currentUser={...admMatch,role:admMatch.role||'admin'};delete window.currentUser.password;
      _saveUser(window.currentUser);showApp();return;
    }
    let empRes;try{empRes=await dbGet('employees',`?username=eq.${uname}&select=*`);}catch(_){empRes=[];}
    const empMatch=(empRes||[]).find(r=>r.password===pass);
    if(!empMatch){errEl.textContent=ar?'بيانات دخول غير صحيحة':'Invalid credentials';return;}
    window.currentUser={...empMatch,role:empMatch.role||'employee'};delete window.currentUser.password;
    _saveUser(window.currentUser);showApp();
  }catch(e){
    console.error('[login]',e);
    errEl.textContent=ar?'خطأ في الاتصال، حاول مرة أخرى':'Connection error, try again';
  }finally{
    _isSubmitting=false;
    if(btn){btn.disabled=false;btn.textContent=ar?'تسجيل الدخول':'Sign In';}
  }
}

function doLogout(){
  try { if (typeof resetPushRegistrationState === 'function') resetPushRegistrationState(); } catch (_) {}
  if(videoStream){try{videoStream.getTracks().forEach(t=>t.stop());}catch(_){}videoStream=null;}
  if(chatSubscription){
    try{if(typeof chatSubscription==='function')chatSubscription();else clearInterval(chatSubscription);}catch(_){}
    chatSubscription=null;
  }
  currentChat=null;
  try{localStorage.removeItem('oraimo_user');}catch(_){}
  try{sessionStorage.removeItem('oraimo_user');}catch(_){}
  window.currentUser=null;
  _isSubmitting=false;
  allAdmins=[];allBranches=[];allEmployees=[];
  try{window.branches=[];}catch(_){}
  managerTeamData={};
  document.querySelectorAll('#admin-app .bottom-nav .nav-item').forEach(n=>{n.style.display='';n.classList.remove('active');});
  const visNav=document.getElementById('adm-visits-nav');if(visNav)visNav.style.display='none';
  ['dashboard','employees','branches','reports','settings','visits'].forEach(t=>{
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
    if(el)el.textContent=now.toLocaleTimeString(locale,{hour:'numeric',minute:'2-digit',hour12:true});
    if(del)del.textContent=now.toLocaleDateString(locale,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  }
  tick();setInterval(tick,1000);
}
