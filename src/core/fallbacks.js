window.__LEGACY_LOADED__ = true;

// ── SAFE FALLBACKS (في حالة app.js ما اتحملش) ──
if(typeof window.currentLang === 'undefined'){
  window.currentLang = localStorage.getItem('oraimo_lang') || 'ar';
}
if(typeof window.dbGet !== 'function'){
  const SUPA_URL = 'https://lmszelfnosejdemxhodm.supabase.co';
  const SUPA_KEY = 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb';
  const _hdr = {apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json'};
  window.dbGet = async function(table, q=''){
    const res = await fetch(SUPA_URL+'/rest/v1/'+table+(q||''), {headers:_hdr});
    if(!res.ok) throw new Error('DB GET failed '+res.status);
    return res.json();
  };
  window.dbPost = async function(table, body){
    const res = await fetch(SUPA_URL+'/rest/v1/'+table, {method:'POST', headers:{..._hdr, Prefer:'return=representation'}, body:JSON.stringify(body)});
    if(!res.ok) throw new Error('DB POST failed '+res.status);
    return res.json();
  };
  window.dbPatch = async function(table, body, query){
    const res = await fetch(SUPA_URL+'/rest/v1/'+table+(query||''), {method:'PATCH', headers:_hdr, body:JSON.stringify(body)});
    if(!res.ok) throw new Error('DB PATCH failed '+res.status);
    return res.status===204 ? null : res.json();
  };
  window.dbDelete = async function(table, query){
    const res = await fetch(SUPA_URL+'/rest/v1/'+table+(query||''), {method:'DELETE', headers:_hdr});
    if(!res.ok) throw new Error('DB DELETE failed '+res.status);
    return null;
  };
  console.log('[legacy] using fallback DB client');
}
if(typeof window.notify !== 'function'){
  window.notify = function(msg, type){
    const el = document.createElement('div');
    const bg = type==='error' ? '#ff3b3b' : type==='success' ? '#00C853' : '#2979FF';
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:'+bg+';color:#fff;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.4);font-family:Cairo,sans-serif';
    el.textContent = String(msg||'');
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 3000);
  };
}
if(typeof window.todayStr !== 'function'){
  window.todayStr = function(){ return new Date().toISOString().split('T')[0]; };
}
if(typeof window.fmtDate !== 'function'){
  window.fmtDate = function(d){ return new Date(d).toISOString().split('T')[0]; };
}
if(typeof window.fmtEGP !== 'function'){
  window.fmtEGP = function(n){n=Number(n)||0;if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return String(Math.round(n));};
}
if(typeof window.fmtTime !== 'function'){
  window.fmtTime = function(iso){ try{ return new Date(iso).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } };
}
if(typeof window.getPayrollMonth !== 'function'){
  window.getPayrollMonth = function(){
    const now = new Date(); const d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let s, e;
    if(d >= 21){ s = new Date(y, m, 21); e = new Date(y, m+1, 20); }
    else { s = new Date(y, m-1, 21); e = new Date(y, m, 20); }
    return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0], label: s.toLocaleString('ar-EG',{month:'long'})+' 21' };
  };
}
if(typeof window.applyLang !== 'function'){
  window.applyLang = function(){
    const isAr = window.currentLang === 'ar';
    document.documentElement.lang = window.currentLang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-ar],[data-en]').forEach(el=>{
      const ar = el.dataset.ar, en = el.dataset.en;
      if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){ el.placeholder = isAr?(el.dataset.arPh||el.placeholder):(el.dataset.enPh||el.placeholder); }
      else if(ar && en){ el.textContent = isAr ? ar : en; }
    });
  };
}
if(typeof window.toggleLang !== 'function'){
  window.toggleLang = function(){
    window.currentLang = window.currentLang==='ar'?'en':'ar';
    localStorage.setItem('oraimo_lang', window.currentLang);
    window.applyLang();
  };
}
if(typeof window.DAYS_AR === 'undefined'){
  window.DAYS_AR = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  window.DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
}

// ────────────────────────────────────────────────────────────
// LEGACY UI SCRIPT (classic, non-module)
// ────────────────────────────────────────────────────────────
// Must load AFTER /src/app.js (loaded as a module) has populated
// window globals. Contains page-level UI logic pending migration
// to dedicated /pages modules. Function declarations in this file
// become globals automatically (classic script semantics) so
// inline onclick handlers in index.html can call them.
// ────────────────────────────────────────────────────────────

// DAYS_AR is window.DAYS_AR
// DAYS_EN is window.DAYS_EN

// ── GLOBAL STATE (declare all vars used before assignment) ──
let allAdmins = [];
let allBranches = [];
let workSettings = { start: '09:00', end: '18:00' };
let videoStream = null;
let capturedPhoto = null;
let capturedLocation = null;
let attendMode = 'in';
let selectedProduct = null;
let selectedQty = 1;
let _isSubmitting = false; // prevent double-submit
const DAYS_AR = window.DAYS_AR;
const DAYS_EN = window.DAYS_EN;

