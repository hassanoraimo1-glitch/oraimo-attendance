window.__LEGACY_LOADED__ = true;
// ────────────────────────────────────────────────────────────
// LEGACY UI SCRIPT (classic, non-module)
// ────────────────────────────────────────────────────────────

const DAYS_AR = window.DAYS_AR;
const DAYS_EN = window.DAYS_EN;

// ── GLOBAL STATE ──
let allAdmins = [];
let allBranches = [];
let workSettings = { start: '14:00', end: '22:00' };
let videoStream = null;
let capturedPhoto = null;
let capturedLocation = null;
let attendMode = 'in';
let selectedProduct = null;
let selectedQty = 1;
let _isSubmitting = false;
let _leaveSending = false;
let _saleSending = false;
let currentChat = null;
let chatSubscription = null;
let uploadHistory = [];
let selectedDayOff = -1;
let editingManagerId = null;
let managerTeamData = {};

// ── BRANCH DATA ──
const BRANCH_DATA = [{"name":"B.ONLINE","revenue":107911,"prev_revenue":293938,"qty":115,"prev_qty":281,"stock":0,"tier":"S"},{"name":"NEW IMBABA","revenue":79338,"prev_revenue":142122,"qty":69,"prev_qty":133,"stock":194,"tier":"S"},{"name":"ElSoudan Street","revenue":54277,"prev_revenue":83046,"qty":48,"prev_qty":80,"stock":154,"tier":"S"},{"name":"V_Hassan El Maamon","revenue":52883,"prev_revenue":60537,"qty":60,"prev_qty":77,"stock":274,"tier":"S"},{"name":"El Zaher","revenue":44118,"prev_revenue":86811,"qty":37,"prev_qty":75,"stock":144,"tier":"S"},{"name":"Qena","revenue":41988,"prev_revenue":121171,"qty":35,"prev_qty":104,"stock":196,"tier":"S"},{"name":"Qalyub","revenue":39661,"prev_revenue":65373,"qty":34,"prev_qty":59,"stock":112,"tier":"S"},{"name":"Dar El Salam","revenue":38388,"prev_revenue":80582,"qty":41,"prev_qty":73,"stock":216,"tier":"S"},{"name":"El Helmya","revenue":37760,"prev_revenue":76910,"qty":34,"prev_qty":72,"stock":66,"tier":"S"},{"name":"Maadi2","revenue":36598,"prev_revenue":61324,"qty":34,"prev_qty":58,"stock":162,"tier":"S"}];

const PRODUCTS = [
  {name:"Oraimo A to C Cable OCDC3200 3A 1M", price:85},
  {name:"Oraimo BT Headphone OHP-610S", price:1517},
  {name:"Oraimo C to C Cable OCD-154CC 3A 1.5M", price:105},
  {name:"Oraimo CH OCW5183E +L53 PD 18W with Cable", price:235},
  {name:"Oraimo Cable C to C 3M 100W OCD-173CC", price:366},
  {name:"Oraimo TWS OTW-323", price:698},
  {name:"Oraimo Smart Watch OSW-30", price:1517},
  {name:"Oraimo Power Bank 10K OPB-7100Q", price:698}
];

// ── INIT ──
(function initApp() {
  try {
    var chatM = document.getElementById('chat-modal');
    if (chatM) chatM.style.display = 'none';
    
    if (typeof applyLang === 'function') applyLang();
    if (typeof startClock === 'function') startClock();
    
    if (typeof showPage === 'function') {
      if (typeof currentUser !== 'undefined' && currentUser) {
        showPage('emp-app');
      } else {
        showPage('login-page');
      }
    }
  } catch(e) {
    var login = document.getElementById('login-page');
    if (login) login.style.display = 'block';
  }
})();

function hideSplash() {
  var splash = document.getElementById('splash');
  if(splash) splash.classList.add('hide');
}

// ── PAGE TRANSITIONS ──
var _prevPage = 'login-page';
var PAGE_ORDER = ['login-page', 'emp-app', 'admin-app'];

function showPage(id) {
  var chat = document.getElementById('chat-modal');
  if(chat) chat.style.display = 'none';
  
  var prevIdx = PAGE_ORDER.indexOf(_prevPage);
  var nextIdx = PAGE_ORDER.indexOf(id);
  
  var pages = document.querySelectorAll('.page');
  for(var i = 0; i < pages.length; i++) {
    pages[i].classList.remove('active', 'slide-in-right', 'slide-in-left');
    pages[i].style.display = 'none';
  }
  
  var el = document.getElementById(id);
  if(el) {
    el.style.display = 'block';
    el.classList.add('active');
    if(nextIdx < prevIdx) el.classList.add('slide-in-left');
    else if(nextIdx > prevIdx) el.classList.add('slide-in-right');
  }
  _prevPage = id;
}

function showApp() {
  if(!currentUser) {
    showPage('login-page');
    return;
  }
  
  if(typeof applyLang === 'function') applyLang();
  
  var isAdmin = (currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'viewer' || currentUser.role === 'team_leader');
  
  if(isAdmin) {
    var nameTop = document.getElementById('admin-name-top');
    if(nameTop) nameTop.textContent = currentUser.name || 'Admin';
    showPage('admin-app');
    if(typeof loadAdminDashboard === 'function') loadAdminDashboard();
    if(typeof loadAllEmployees === 'function') loadAllEmployees();
    if(typeof loadBranches === 'function') loadBranches();
  } else {
    showPage('emp-app');
    var empName = document.getElementById('emp-name-top');
    if(empName) empName.textContent = currentUser.name;
    if(typeof loadEmpData === 'function') loadEmpData();
    if(typeof renderProducts === 'function') renderProducts();
  }
  
  if(typeof registerOneSignalUser === 'function') registerOneSignalUser();
  if(typeof fixNavDirection === 'function') setTimeout(fixNavDirection, 100);
}

// ── AUTH ──
async function doLogin() {
  if(_isSubmitting) return;
  
  var username = document.getElementById('login-user').value.trim();
  var pass = document.getElementById('login-pass').value.trim();
  var errEl = document.getElementById('login-err');
  var btn = document.querySelector('#login-page .btn-green');
  
  if(!username || !pass) {
    errEl.textContent = (currentLang === 'ar') ? 'أدخل بيانات الدخول' : 'Enter your credentials';
    return;
  }
  
  _isSubmitting = true;
  if(btn) {
    btn.disabled = true;
    btn.textContent = (currentLang === 'ar') ? 'جاري الدخول...' : 'Signing in...';
  }
  errEl.textContent = '';
  
  try {
    if(username === 'admin' && pass === 'Oraimo@Admin2026') {
      currentUser = { role: 'superadmin', name: 'Super Admin' };
      localStorage.setItem('oraimo_user', JSON.stringify(currentUser));
      showApp();
      return;
    }
    
    var admRes = await dbGet('admins', '?select=*').catch(function() { return []; });
    var foundAdmin = null;
    if(admRes) {
      for(var i = 0; i < admRes.length; i++) {
        if(admRes[i].username === username && admRes[i].password === pass) {
          foundAdmin = admRes[i];
          break;
        }
      }
    }
    
    if(foundAdmin) {
      currentUser = foundAdmin;
      currentUser.role = currentUser.role || 'admin';
      delete currentUser.password;
      localStorage.setItem('oraimo_user', JSON.stringify(currentUser));
      showApp();
      return;
    }
    
    var empRes = await dbGet('employees', '?select=*').catch(function() { return []; });
    var foundEmp = null;
    if(empRes) {
      for(var j = 0; j < empRes.length; j++) {
        if(empRes[j].username === username && empRes[j].password === pass) {
          foundEmp = empRes[j];
          break;
        }
      }
    }
    
    if(!foundEmp) {
      errEl.textContent = (currentLang === 'ar') ? 'بيانات دخول غير صحيحة' : 'Invalid credentials';
      return;
    }
    
    currentUser = foundEmp;
    currentUser.role = currentUser.role || 'employee';
    delete currentUser.password;
    localStorage.setItem('oraimo_user', JSON.stringify(currentUser));
    showApp();
    
  } catch(e) {
    errEl.textContent = (currentLang === 'ar') ? 'خطأ في الاتصال، حاول مرة أخرى' : 'Connection error, try again';
  } finally {
    _isSubmitting = false;
    if(btn) {
      btn.disabled = false;
      btn.textContent = (currentLang === 'ar') ? 'تسجيل الدخول' : 'Sign In';
    }
  }
}

function doLogout() {
  if(videoStream) {
    try {
      videoStream.getTracks().forEach(function(t) { t.stop(); });
    } catch(e) {}
    videoStream = null;
  }
  
  localStorage.removeItem('oraimo_user');
  currentUser = null;
  showPage('login-page');
  
  var loginUser = document.getElementById('login-user');
  var loginPass = document.getElementById('login-pass');
  var loginErr = document.getElementById('login-err');
  if(loginUser) loginUser.value = '';
  if(loginPass) loginPass.value = '';
  if(loginErr) loginErr.textContent = '';
}

// ── CLOCK ──
function startClock() {
  function tick() {
    var now = new Date();
    var locale = (currentLang === 'ar') ? 'ar-EG' : 'en-US';
    var el = document.getElementById('live-clock');
    var del = document.getElementById('live-date');
    if(el) el.textContent = now.toLocaleTimeString(locale, { hour12: false });
    if(del) del.textContent = now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}

// ── HELPER FUNCTIONS ──
function todayStr() {
  var d = new Date();
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function fmtEGP(n) {
  var num = Number(n);
  if(isNaN(num)) return '0';
  if(num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if(num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(Math.round(num));
}

function getPayrollMonth() {
  var d = new Date();
  var m = d.getMonth();
  var y = d.getFullYear();
  var day = d.getDate();
  var start, end;
  
  if(day >= 21) {
    start = new Date(y, m, 21);
    end = new Date(y, m + 1, 20);
  } else {
    start = new Date(y, m - 1, 21);
    end = new Date(y, m, 20);
  }
  
  var startStr = start.toISOString().split('T')[0];
  var endStr = end.toISOString().split('T')[0];
  var label = (currentLang === 'ar') ? 'الفترة من 21 إلى 20' : 'Period 21st to 20th';
  
  return { start: startStr, end: endStr, label: label };
}

function notify(msg, type) {
  var el = document.createElement('div');
  el.className = 'notif ' + (type || 'success');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}

function openModal(id) {
  var modal = document.getElementById(id);
  if(modal) modal.classList.add('open');
}

function closeModal(id) {
  var modal = document.getElementById(id);
  if(modal) modal.classList.remove('open');
}

// ── SEND LEAVE REQUEST (FIXED - NO OPTIONAL CHAINING) ──
async function sendLeaveRequest(leaveType) {
  if(_leaveSending) return;
  if(!leaveType) leaveType = 'permission';
  var ar = (currentLang === 'ar');
  
  var reasonEl = (leaveType === 'vacation') ? document.getElementById('vacation-reason') : document.getElementById('leave-reason');
  var reason = (reasonEl && reasonEl.value) ? reasonEl.value.trim() : '';
  
  var durationEl = document.getElementById('leave-duration');
  var duration = 0;
  if(leaveType !== 'vacation' && durationEl) {
    duration = parseInt(durationEl.value) || 0;
  }
  
  var vacationDateEl = document.getElementById('vacation-date');
  var leaveDate = todayStr();
  if(leaveType === 'vacation' && vacationDateEl && vacationDateEl.value) {
    leaveDate = vacationDateEl.value;
  }
  
  if(!reason) {
    notify(ar ? 'أدخل السبب' : 'Enter reason', 'error');
    return;
  }
  
  if(leaveType === 'vacation' && (!vacationDateEl || !vacationDateEl.value)) {
    notify(ar ? 'اختر تاريخ الإجازة' : 'Select vacation date', 'error');
    return;
  }
  
  _leaveSending = true;
  
  try {
    await dbPost('leave_requests', {
      employee_id: currentUser.id,
      employee_name: currentUser.name,
      reason: reason,
      duration_minutes: duration,
      leave_type: leaveType,
      leave_date: leaveDate,
      status: 'pending',
      date: todayStr()
    });
    
    notify(ar ? 'تم إرسال الطلب ✅' : 'Request sent ✅', 'success');
    
    if(leaveType === 'vacation') {
      if(vacationDateEl) vacationDateEl.value = '';
      var vacReasonEl = document.getElementById('vacation-reason');
      if(vacReasonEl) vacReasonEl.value = '';
    } else {
      var leaveReasonEl = document.getElementById('leave-reason');
      if(leaveReasonEl) leaveReasonEl.value = '';
    }
  } catch(e) {
    notify('Error: ' + (e.message || ''), 'error');
  } finally {
    _leaveSending = false;
  }
}

// ── LOAD EMP DATA ──
async function loadEmpData() {
  try {
    var today = todayStr();
    var pm = getPayrollMonth();
    
    var todayAtt = await dbGet('attendance', '?employee_id=eq.' + currentUser.id + '&date=eq.' + today + '&select=*');
    updateAttendBtn(todayAtt && todayAtt.length > 0 ? todayAtt[0] : null);
    
    var monthAtt = await dbGet('attendance', '?employee_id=eq.' + currentUser.id + '&date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=*');
    var attendCount = document.getElementById('emp-attend-count');
    if(attendCount) attendCount.textContent = monthAtt ? monthAtt.length : 0;
    
    var lateTotal = 0;
    if(monthAtt) {
      for(var i = 0; i < monthAtt.length; i++) {
        lateTotal += (monthAtt[i].late_minutes || 0);
      }
    }
    var lateEl = document.getElementById('emp-late-total');
    if(lateEl) lateEl.textContent = lateTotal + ((currentLang === 'ar') ? ' د' : 'm');
    
    var monthSales = await dbGet('sales', '?employee_id=eq.' + currentUser.id + '&date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=*');
    var salesTotal = 0;
    if(monthSales) {
      for(var j = 0; j < monthSales.length; j++) {
        salesTotal += monthSales[j].total_amount;
      }
    }
    var salesEl = document.getElementById('emp-sales-total');
    if(salesEl) salesEl.textContent = 'EGP ' + fmtEGP(salesTotal);
    
    var mon = pm.start.substring(0, 7);
    var targetRes = await dbGet('targets', '?employee_id=eq.' + currentUser.id + '&month=eq.' + mon + '&select=*');
    var target = (targetRes && targetRes.length > 0) ? targetRes[0].amount : 0;
    
    var achievedEl = document.getElementById('target-achieved');
    if(achievedEl) achievedEl.textContent = 'EGP ' + fmtEGP(salesTotal);
    
    var goalEl = document.getElementById('target-goal');
    if(goalEl) goalEl.textContent = ((currentLang === 'ar') ? 'التارجت: ' : 'Target: ') + 'EGP ' + fmtEGP(target);
    
    var pct = (target > 0) ? Math.min(100, Math.round(salesTotal / target * 100)) : 0;
    var fillEl = document.getElementById('target-fill');
    if(fillEl) fillEl.style.width = pct + '%';
    
    var pctEl = document.getElementById('target-pct');
    if(pctEl) pctEl.textContent = pct + '%';
    
  } catch(e) {
    console.error('loadEmpData error:', e);
  }
}

function updateAttendBtn(record) {
  var btn = document.getElementById('attend-btn');
  var status = document.getElementById('attend-status');
  if(!btn) return;
  
  var ar = (currentLang === 'ar');
  
  if(record && record.check_in && !record.check_out) {
    btn.classList.add('checked-in');
    var icon = btn.querySelector('.attend-icon');
    if(icon) icon.textContent = '🔴';
    var label = btn.querySelector('.attend-label');
    if(label) label.textContent = ar ? 'تسجيل خروج' : 'Check Out';
    if(status) {
      var lateText = (record.late_minutes > 0) ? (ar ? ' (تأخر ' + record.late_minutes + ' د)' : ' (' + record.late_minutes + 'm late)') : '';
      status.textContent = (ar ? 'دخل الساعة ' : 'In at ') + record.check_in + lateText;
    }
  } else if(record && record.check_out) {
    btn.classList.remove('checked-in');
    var icon2 = btn.querySelector('.attend-icon');
    if(icon2) icon2.textContent = '✅';
    var label2 = btn.querySelector('.attend-label');
    if(label2) label2.textContent = ar ? 'تم' : 'Done';
    btn.onclick = null;
    if(status) {
      status.textContent = (ar ? 'دخول: ' : 'In: ') + record.check_in + ' – ' + (ar ? 'خروج: ' : 'Out: ') + record.check_out;
    }
  } else {
    btn.classList.remove('checked-in');
    var icon3 = btn.querySelector('.attend-icon');
    if(icon3) icon3.textContent = '🟢';
    var label3 = btn.querySelector('.attend-label');
    if(label3) label3.textContent = ar ? 'تسجيل دخول' : 'Check In';
    if(status) status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';
  }
}

function handleAttendClick() {
  var btn = document.getElementById('attend-btn');
  if(!btn) return;
  
  var icon = btn.querySelector('.attend-icon');
  if(icon && icon.textContent === '✅') return;
  
  attendMode = btn.classList.contains('checked-in') ? 'out' : 'in';
  var ar = (currentLang === 'ar');
  
  var titleEl = document.getElementById('selfie-modal-title');
  if(titleEl) {
    titleEl.textContent = (attendMode === 'in') ? (ar ? 'تأكيد تسجيل الدخول' : 'Confirm Check In') : (ar ? 'تأكيد تسجيل الخروج' : 'Confirm Check Out');
  }
  
  var labelEl = document.getElementById('camera-label');
  if(labelEl) {
    labelEl.textContent = (attendMode === 'in') ? (ar ? '📸 التقط سيلفي للدخول' : '📸 Take selfie to check in') : (ar ? '📸 التقط سيلفي للخروج' : '📸 Take selfie to check out');
  }
  
  openCamera();
}

// ── CAMERA ──
async function openCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    var video = document.getElementById('video');
    if(video) video.srcObject = videoStream;
    var modal = document.getElementById('camera-modal');
    if(modal) modal.classList.add('open');
  } catch(e) {
    notify((currentLang === 'ar' ? 'خطأ كاميرا: ' : 'Camera error: ') + e.message, 'error');
  }
}

function closeCamera() {
  if(videoStream) {
    videoStream.getTracks().forEach(function(t) { t.stop(); });
    videoStream = null;
  }
  var modal = document.getElementById('camera-modal');
  if(modal) modal.classList.remove('open');
}

function capturePhoto() {
  var video = document.getElementById('video');
  var canvas = document.getElementById('canvas');
  if(!video || !canvas) return;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  var ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  capturedPhoto = canvas.toDataURL('image/jpeg', 0.65);
  closeCamera();
  
  var preview = document.getElementById('selfie-preview-img');
  if(preview) preview.src = capturedPhoto;
  
  var modal = document.getElementById('selfie-modal');
  if(modal) modal.classList.add('open');
  
  var confirmBtn = document.getElementById('confirm-attend-btn');
  if(confirmBtn) confirmBtn.disabled = false;
  
  var locStatus = document.getElementById('location-status');
  var ar = (currentLang === 'ar');
  if(locStatus) locStatus.textContent = ar ? '📍 جاري تحديد الموقع...' : '📍 Getting location...';
  
  capturedLocation = null;
  
  if(!navigator.geolocation) {
    if(locStatus) locStatus.textContent = ar ? '⚠️ تحديد الموقع غير متاح' : '⚠️ Geolocation not supported';
    return;
  }
  
  var locTimer = setTimeout(function() {
    if(!capturedLocation && locStatus) locStatus.textContent = ar ? '⚠️ انتهت مهلة الموقع' : '⚠️ Location timeout';
  }, 12000);
  
  navigator.geolocation.getCurrentPosition(function(pos) {
    clearTimeout(locTimer);
    capturedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if(locStatus) {
      locStatus.innerHTML = '✅ ' + (ar ? 'تم تحديد الموقع' : 'Location found') + ' (±' + Math.round(pos.coords.accuracy) + 'm) — <a href="https://maps.google.com/?q=' + pos.coords.latitude + ',' + pos.coords.longitude + '" target="_blank" style="color:var(--green)">' + (ar ? 'عرض' : 'View') + '</a>';
    }
  }, function() {
    clearTimeout(locTimer);
    capturedLocation = null;
    if(locStatus) locStatus.textContent = ar ? '⚠️ تعذر تحديد الموقع' : '⚠️ Location unavailable';
  }, { enableHighAccuracy: true, timeout: 10000 });
}

async function confirmAttendance() {
  var today = todayStr();
  var now = new Date();
  var timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  var ar = (currentLang === 'ar');
  
  try {
    var todayAtt = await dbGet('attendance', '?employee_id=eq.' + currentUser.id + '&date=eq.' + today + '&select=*');
    
    if(attendMode === 'in') {
      var wh = parseInt(workSettings.start.split(':')[0]);
      var wm = parseInt(workSettings.start.split(':')[1]);
      var ah = parseInt(timeStr.split(':')[0]);
      var am = parseInt(timeStr.split(':')[1]);
      var lateMin = Math.max(0, (ah * 60 + am) - (wh * 60 + wm));
      
      await dbPost('attendance', {
        employee_id: currentUser.id,
        date: today,
        check_in: timeStr,
        late_minutes: lateMin,
        selfie_in: capturedPhoto,
        location_lat: capturedLocation ? capturedLocation.lat : null,
        location_lng: capturedLocation ? capturedLocation.lng : null
      });
      notify(ar ? 'تم تسجيل الدخول ✅' : 'Checked in ✅', 'success');
    } else {
      if(todayAtt && todayAtt.length > 0) {
        await dbPatch('attendance', { check_out: timeStr, selfie_out: capturedPhoto }, '?employee_id=eq.' + currentUser.id + '&date=eq.' + today);
        notify(ar ? 'تم تسجيل الخروج ✅' : 'Checked out ✅', 'success');
      }
    }
    closeModal('selfie-modal');
    if(typeof loadEmpData === 'function') loadEmpData();
  } catch(e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + e.message, 'error');
  }
}

// ── SALES ──
function renderProducts() {
  var el = document.getElementById('product-list');
  if(!el) return;
  
  var ar = (currentLang === 'ar');
  var html = '';
  for(var i = 0; i < PRODUCTS.length && i < 20; i++) {
    var p = PRODUCTS[i];
    html += '<div class="product-item" onclick="selectProduct(\'' + p.name.replace(/'/g, "\\'") + '\',' + p.price + ')">' +
            '<div class="product-name">' + p.name + '</div>' +
            '<div class="product-price">' + p.price.toLocaleString() + ' EGP</div>' +
            '</div>';
  }
  el.innerHTML = html || '<div style="padding:16px;text-align:center;color:var(--muted)">' + (ar ? 'لا توجد منتجات' : 'No products') + '</div>';
}

function filterProducts() {
  var q = document.getElementById('product-search');
  if(!q) return;
  var query = q.value.toLowerCase();
  var el = document.getElementById('product-list');
  if(!el) return;
  
  var ar = (currentLang === 'ar');
  var filtered = [];
  for(var i = 0; i < PRODUCTS.length; i++) {
    if(PRODUCTS[i].name.toLowerCase().includes(query)) {
      filtered.push(PRODUCTS[i]);
    }
  }
  
  if(filtered.length === 0) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted)">' + (ar ? 'لا توجد نتائج' : 'No results') + '</div>';
    return;
  }
  
  var html = '';
  for(var j = 0; j < filtered.length && j < 30; j++) {
    var p = filtered[j];
    html += '<div class="product-item" onclick="selectProduct(\'' + p.name.replace(/'/g, "\\'") + '\',' + p.price + ')">' +
            '<div class="product-name">' + p.name + '</div>' +
            '<div class="product-price">' + p.price.toLocaleString() + ' EGP</div>' +
            '</div>';
  }
  el.innerHTML = html;
}

function selectProduct(name, price) {
  selectedProduct = { name: name, price: price };
  selectedQty = 1;
  
  var nameEl = document.getElementById('selected-product-name');
  if(nameEl) nameEl.textContent = name;
  
  var priceEl = document.getElementById('selected-product-price');
  if(priceEl) priceEl.textContent = price.toLocaleString();
  
  var qtyEl = document.getElementById('qty-val');
  if(qtyEl) qtyEl.textContent = '1';
  
  var totalEl = document.getElementById('sale-total');
  if(totalEl) totalEl.textContent = price.toLocaleString() + ' EGP';
  
  var wrap = document.getElementById('sale-form-wrap');
  if(wrap) {
    wrap.style.display = 'flex';
    wrap.style.position = 'fixed';
    wrap.style.bottom = '0';
    wrap.style.left = '0';
    wrap.style.right = '0';
    wrap.style.top = '0';
    wrap.style.zIndex = '5000';
    wrap.style.background = 'rgba(0,0,0,.75)';
    wrap.style.alignItems = 'flex-end';
    wrap.style.backdropFilter = 'blur(4px)';
  }
}

function changeQty(d) {
  selectedQty = Math.max(1, selectedQty + d);
  var qtyEl = document.getElementById('qty-val');
  if(qtyEl) qtyEl.textContent = selectedQty;
  var totalEl = document.getElementById('sale-total');
  if(totalEl && selectedProduct) totalEl.textContent = (selectedProduct.price * selectedQty).toLocaleString() + ' EGP';
}

function cancelSale() {
  selectedProduct = null;
  var wrap = document.getElementById('sale-form-wrap');
  if(wrap) {
    wrap.style.display = 'none';
    wrap.style.position = '';
    wrap.style.bottom = '';
    wrap.style.left = '';
    wrap.style.right = '';
    wrap.style.zIndex = '';
    wrap.style.background = '';
    wrap.style.alignItems = '';
  }
  renderProducts();
}

async function submitSale() {
  if(_saleSending || !selectedProduct) return;
  var total = selectedProduct.price * selectedQty;
  var ar = (currentLang === 'ar');
  
  _saleSending = true;
  try {
    await dbPost('sales', {
      employee_id: currentUser.id,
      date: todayStr(),
      product_name: selectedProduct.name,
      unit_price: selectedProduct.price,
      quantity: selectedQty,
      total_amount: total
    });
    notify(ar ? 'تم تسجيل البيع ✅' : 'Sale recorded ✅', 'success');
    cancelSale();
    if(typeof loadTodaySales === 'function') loadTodaySales();
    if(typeof loadEmpData === 'function') loadEmpData();
  } catch(e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + e.message, 'error');
  } finally {
    _saleSending = false;
  }
}

async function loadTodaySales() {
  var sales = await dbGet('sales', '?employee_id=eq.' + currentUser.id + '&date=eq.' + todayStr() + '&order=created_at.desc&select=*');
  var el = document.getElementById('emp-sales-list');
  var total = 0;
  var ar = (currentLang === 'ar');
  
  if(!sales || sales.length === 0) {
    if(el) el.innerHTML = '<div class="empty"><div class="empty-icon">🛒</div>' + (ar ? 'لا توجد مبيعات اليوم' : 'No sales today') + '</div>';
  } else {
    for(var i = 0; i < sales.length; i++) {
      total += sales[i].total_amount;
    }
    if(el) {
      var html = '';
      for(var j = 0; j < sales.length; j++) {
        var s = sales[j];
        html += '<div class="history-item">' +
                '<div class="hist-top">' +
                '<div class="hist-name">' + s.product_name + '</div>' +
                '<div class="hist-amount">' + s.total_amount.toLocaleString() + ' EGP</div>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between">' +
                '<div class="hist-meta">' + (ar ? 'الكمية' : 'Qty') + ': ' + s.quantity + '</div>' +
                '<div class="hist-meta">' + s.unit_price.toLocaleString() + ' EGP</div>' +
                '</div>' +
                '</div>';
      }
      el.innerHTML = html;
    }
  }
  
  var tel = document.getElementById('emp-today-total');
  if(tel) tel.textContent = (ar ? 'اليوم: ' : 'Today: ') + 'EGP ' + total.toLocaleString();
}

// ── ADMIN DASHBOARD (FIXED) ──
async function loadAdminDashboard() {
  var loader = document.getElementById('dash-loader');
  var dashC = document.getElementById('dash-content');
  
  if(loader) loader.style.display = 'none';
  if(dashC) dashC.style.display = 'block';
  
  try {
    var today = todayStr();
    var pm = getPayrollMonth();
    var ar = (currentLang === 'ar');
    
    var allEmp = await dbGet('employees', '?select=*');
    allEmployees = allEmp || [];
    
    if(currentUser && (currentUser.role === 'manager' || currentUser.role === 'team_leader')) {
      var teamIds = await getManagerTeamIds();
      if(teamIds && teamIds.length > 0) {
        var filtered = [];
        for(var i = 0; i < allEmployees.length; i++) {
          if(teamIds.includes(allEmployees[i].id)) {
            filtered.push(allEmployees[i]);
          }
        }
        allEmployees = filtered;
      } else {
        allEmployees = [];
      }
    }
    
    var todayAtt = await dbGet('attendance', '?date=eq.' + today + '&select=*');
    var present = todayAtt ? todayAtt.length : 0;
    var presentEl = document.getElementById('adm-present');
    if(presentEl) presentEl.textContent = present;
    
    window._todayPresentIds = [];
    if(todayAtt) {
      for(var k = 0; k < todayAtt.length; k++) {
        window._todayPresentIds.push(todayAtt[k].employee_id);
      }
    }
    
    var absentEl = document.getElementById('adm-absent');
    if(absentEl) absentEl.textContent = Math.max(0, allEmployees.length - present);
    
    var todaySales = await dbGet('sales', '?date=eq.' + today + '&select=total_amount,employee_id');
    var monthSales = await dbGet('sales', '?date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=total_amount,employee_id,product_name');
    
    var todayTotal = 0;
    var monthTotal = 0;
    
    if(todaySales) {
      for(var t = 0; t < todaySales.length; t++) {
        todayTotal += todaySales[t].total_amount;
      }
    }
    if(monthSales) {
      for(var m = 0; m < monthSales.length; m++) {
        monthTotal += monthSales[m].total_amount;
      }
    }
    
    var salesTodayEl = document.getElementById('adm-sales-today');
    if(salesTodayEl) salesTodayEl.textContent = 'EGP ' + fmtEGP(todayTotal);
    
    var salesMonthEl = document.getElementById('adm-sales-month');
    if(salesMonthEl) salesMonthEl.textContent = 'EGP ' + fmtEGP(monthTotal);
    
    if(typeof renderPerformanceRanking === 'function') renderPerformanceRanking(monthSales || []);
    if(typeof applyLang === 'function') applyLang();
    
    var empTodayEl = document.getElementById('adm-emp-today');
    if(empTodayEl) {
      if(allEmployees.length === 0) {
        empTodayEl.innerHTML = '<div class="empty"><div class="empty-icon">👥</div>' + (ar ? 'لا يوجد موظفون' : 'No employees') + '</div>';
      } else {
        var isViewer = (currentUser.role === 'viewer');
        var empHtml = '';
        for(var e = 0; e < allEmployees.length; e++) {
          var emp = allEmployees[e];
          var att = null;
          if(todayAtt) {
            for(var a = 0; a < todayAtt.length; a++) {
              if(todayAtt[a].employee_id === emp.id) {
                att = todayAtt[a];
                break;
              }
            }
          }
          var mapLink = (att && att.location_lat) ? 'https://maps.google.com/?q=' + att.location_lat + ',' + att.location_lng : null;
          var statusClass = 'badge-red';
          var statusText = ar ? 'غائب' : 'Absent';
          if(att) {
            if(att.check_out) {
              statusClass = 'badge-blue';
              statusText = ar ? 'غادر' : 'Left';
            } else {
              statusClass = 'badge-green';
              statusText = ar ? 'حاضر' : 'Present';
            }
          }
          
          empHtml += '<div class="emp-card">' +
            '<div class="emp-avatar" style="overflow:hidden">' + (emp.profile_photo ? '<img src="' + emp.profile_photo + '" style="width:100%;height:100%;object-fit:cover">' : emp.name[0].toUpperCase()) + '</div>' +
            '<div class="emp-info">' +
            '<div class="emp-name">' + emp.name + '</div>' +
            '<div class="emp-branch">' + (emp.branch || '-') + '</div>';
          if(att) {
            empHtml += '<div style="font-size:10px;color:var(--green);margin-top:2px">' + (ar ? 'دخول' : 'In') + ': ' + att.check_in;
            if(att.late_minutes > 0) empHtml += (ar ? ' (تأخر ' + att.late_minutes + ' د)' : ' (' + att.late_minutes + 'm late)');
            if(att.check_out) empHtml += (ar ? ' · خروج: ' : ' · Out: ') + att.check_out;
            empHtml += '</div>';
          }
          if(mapLink) {
            empHtml += '<a href="' + mapLink + '" target="_blank" style="font-size:10px;color:var(--blue);text-decoration:none">📍 ' + (ar ? 'عرض الموقع' : 'View Location') + '</a>';
          } else if(att) {
            empHtml += '<div style="font-size:10px;color:var(--muted)">📍 ' + (ar ? 'لا يوجد موقع' : 'No location') + '</div>';
          }
          empHtml += '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">' +
            '<span class="badge ' + statusClass + '">' + statusText + '</span>';
          if(att && att.selfie_in) {
            empHtml += '<img src="' + att.selfie_in + '" class="selfie-preview" onclick="viewSelfie(\'' + emp.name + '\',\'' + att.selfie_in + '\',\'' + (att.selfie_out || '') + '\',\'' + (mapLink || '') + '\')">';
          }
          if(!isViewer) {
            empHtml += '<button class="action-btn warn" onclick="openWarnModal(' + emp.id + ',\'' + emp.name + '\')">⚠️</button>';
          }
          empHtml += '</div></div>';
        }
        empTodayEl.innerHTML = empHtml;
      }
    }
    
    var leaves = await dbGet('leave_requests', '?status=eq.pending&select=*');
    var lel = document.getElementById('adm-leave-requests');
    if(lel) {
      if(!leaves || leaves.length === 0) {
        lel.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px">' + (ar ? 'لا توجد طلبات معلقة' : 'No pending requests') + '</div>';
      } else {
        var isViewer = (currentUser.role === 'viewer');
        var leavesHtml = '';
        for(var l = 0; l < leaves.length; l++) {
          var lv = leaves[l];
          leavesHtml += '<div class="perm-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<div style="font-size:13px;font-weight:700">' + lv.employee_name + '</div>' +
            '<span class="badge ' + (lv.leave_type === 'vacation' ? 'badge-blue' : 'badge-yellow') + '">' + (lv.leave_type === 'vacation' ? (ar ? 'إجازة' : 'Vacation') : (ar ? 'إذن' : 'Permission')) + '</span>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--muted);margin-bottom:4px">' + lv.reason + '</div>' +
            '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">' + (lv.leave_type === 'vacation' ? (ar ? 'تاريخ: ' : 'Date: ') + (lv.leave_date || '') : (ar ? 'المدة: ' : 'Duration: ') + lv.duration_minutes + (ar ? ' د' : ' min')) + '</div>';
          if(!isViewer) {
            leavesHtml += '<div style="display:flex;gap:8px"><button class="perm-btn approve" onclick="respondLeave(' + lv.id + ',\'approved\')">✅ ' + (ar ? 'موافقة' : 'Approve') + '</button><button class="perm-btn reject" onclick="respondLeave(' + lv.id + ',\'rejected\')">❌ ' + (ar ? 'رفض' : 'Reject') + '</button></div>';
          }
          leavesHtml += '</div>';
        }
        lel.innerHTML = leavesHtml;
      }
    }
  } catch(e) {
    console.error('loadAdminDashboard error:', e);
  }
}

async function respondLeave(id, status) {
  try {
    await dbPatch('leave_requests', { status: status }, '?id=eq.' + id);
    notify(status === 'approved' ? (currentLang === 'ar' ? 'تمت الموافقة ✅' : 'Approved ✅') : (currentLang === 'ar' ? 'تم الرفض' : 'Rejected'), 'success');
    loadAdminDashboard();
  } catch(e) {}
}

function viewSelfie(name, selfieIn, selfieOut, mapLink) {
  var ar = (currentLang === 'ar');
  var titleEl = document.getElementById('selfie-view-title');
  if(titleEl) titleEl.textContent = name;
  
  var contentEl = document.getElementById('selfie-view-content');
  if(contentEl) {
    var html = '<div style="text-align:center">' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:8px">' + (ar ? 'صورة تسجيل الدخول' : 'Check-in photo') + '</div>' +
      '<img src="' + selfieIn + '" style="width:180px;height:180px;border-radius:14px;object-fit:cover;border:2px solid var(--green);cursor:pointer" onclick="fullSelfie(\'' + selfieIn + '\')">';
    if(selfieOut) {
      html += '<div style="font-size:12px;color:var(--muted);margin:10px 0 8px">' + (ar ? 'صورة تسجيل الخروج' : 'Check-out photo') + '</div>' +
        '<img src="' + selfieOut + '" style="width:180px;height:180px;border-radius:14px;object-fit:cover;border:2px solid var(--blue);cursor:pointer" onclick="fullSelfie(\'' + selfieOut + '\')">';
    }
    if(mapLink) {
      html += '<div style="margin-top:14px"><a href="' + mapLink + '" target="_blank" style="color:var(--green);font-size:13px;text-decoration:none;font-weight:700">📍 ' + (ar ? 'فتح في خرائط جوجل' : 'Open in Google Maps') + '</a></div>';
    } else {
      html += '<div style="color:var(--muted);font-size:12px;margin-top:12px">📍 ' + (ar ? 'لم يتم تسجيل الموقع' : 'No location recorded') + '</div>';
    }
    html += '</div>';
    contentEl.innerHTML = html;
  }
  openModal('selfie-view-modal');
}

function fullSelfie(src) {
  var fsImg = document.getElementById('selfie-fs-img');
  if(fsImg) fsImg.src = src;
  var fs = document.getElementById('selfie-fullscreen');
  if(fs) fs.classList.add('open');
}

// ── PERFORMANCE RANKING ──
async function renderPerformanceRanking(monthSales) {
  var el = document.getElementById('adm-performance-list');
  var ar = (currentLang === 'ar');
  
  if(!el || allEmployees.length === 0) {
    if(el) el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div>' + (ar ? 'لا توجد بيانات' : 'No data') + '</div>';
    return;
  }
  
  var salesByEmp = {};
  if(monthSales) {
    for(var i = 0; i < monthSales.length; i++) {
      var empId = monthSales[i].employee_id;
      salesByEmp[empId] = (salesByEmp[empId] || 0) + monthSales[i].total_amount;
    }
  }
  
  var empsOnly = [];
  for(var j = 0; j < allEmployees.length; j++) {
    if(allEmployees[j].role !== 'team_leader') {
      empsOnly.push(allEmployees[j]);
    }
  }
  
  var ranked = [];
  for(var k = 0; k < empsOnly.length; k++) {
    ranked.push({
      id: empsOnly[k].id,
      name: empsOnly[k].name,
      sales: salesByEmp[empsOnly[k].id] || 0
    });
  }
  ranked.sort(function(a, b) { return b.sales - a.sales; });
  
  var maxSales = (ranked[0] && ranked[0].sales > 0) ? ranked[0].sales : 1;
  var medals = ['🥇', '🥈', '🥉'];
  var html = '';
  
  for(var r = 0; r < ranked.length; r++) {
    var e = ranked[r];
    var pct = (e.sales > 0) ? Math.max(4, Math.round(e.sales / maxSales * 100)) : 0;
    var medal = (r < 3) ? medals[r] : '#' + (r + 1);
    var bgColor = 'var(--green)';
    if(r === 0) bgColor = 'var(--gold)';
    else if(r === 1) bgColor = 'var(--silver)';
    else if(r === 2) bgColor = 'var(--bronze)';
    
    html += '<div class="perf-bar-wrap">' +
      '<div class="perf-rank">' + medal + '</div>' +
      '<div class="perf-name">' + e.name + '</div>' +
      '<div class="perf-bar-bg"><div class="perf-bar-fill" style="width:' + pct + '%;background:' + bgColor + '"></div></div>' +
      '<div class="perf-val">EGP ' + fmtEGP(e.sales) + '</div>' +
      '</div>';
  }
  el.innerHTML = html;
}

// ── LOAD ALL EMPLOYEES ──
async function loadAllEmployees() {
  try {
    allEmployees = await dbGet('employees', '?select=*&order=name') || [];
    renderEmployeesList();
  } catch(e) {}
}

function renderEmployeesList() {
  var el = document.getElementById('adm-emp-list');
  if(!el) return;
  var ar = (currentLang === 'ar');
  
  if(allEmployees.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div>' + (ar ? 'لا يوجد موظفون بعد' : 'No employees yet') + '</div>';
    return;
  }
  
  var isViewer = (currentUser && currentUser.role === 'viewer');
  var html = '';
  
  for(var i = 0; i < allEmployees.length; i++) {
    var emp = allEmployees[i];
    var avatarStyle = (emp.role === 'team_leader') ? 'background:linear-gradient(135deg,#9c27b0,#6a0080)' : '';
    var avatarContent = emp.profile_photo ? '<img src="' + emp.profile_photo + '" style="width:100%;height:100%;object-fit:cover">' : emp.name[0].toUpperCase();
    
    html += '<div class="emp-card">' +
      '<div class="emp-avatar" style="' + avatarStyle + ';overflow:hidden">' + avatarContent + '</div>' +
      '<div class="emp-info">' +
      '<div class="emp-name">' + emp.name + (emp.role === 'team_leader' ? '<span class="badge badge-purple" style="font-size:9px">Team Leader</span>' : '') + '</div>' +
      '<div class="emp-branch">' + (emp.branch || '-') + ' · ' + (ar ? 'إجازة:' : 'Off:') + ' ' + (ar ? DAYS_AR[emp.day_off] : DAYS_EN[emp.day_off]) + '</div>' +
      '</div>';
    
    if(!isViewer) {
      html += '<div class="emp-actions">';
      if(emp.role === 'team_leader') {
        html += '<button class="action-btn view" onclick="openManagerTeam(' + emp.id + ',\'' + emp.name + '\')">👥 فريق</button>';
      }
      html += '<button class="action-btn edit" onclick="openEditEmp(' + emp.id + ')">✏️</button>' +
        '<button class="action-btn del" onclick="deleteEmp(' + emp.id + ')">🗑️</button>' +
        '<button class="action-btn warn" onclick="openWarnModal(' + emp.id + ',\'' + emp.name + '\')">⚠️</button>' +
        '</div>';
    }
    html += '</div>';
  }
  el.innerHTML = html;
}

// ── BRANCHES ──
async function loadBranches() {
  try {
    allBranches = await dbGet('branches', '?select=*&order=name') || [];
    renderBranches();
  } catch(e) {}
}

function renderBranches() {
  var el = document.getElementById('branches-list');
  if(!el) return;
  
  if(allBranches.length === 0) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px">' + (currentLang === 'ar' ? 'لا توجد فروع' : 'No branches') + '</div>';
    return;
  }
  
  var html = '';
  for(var i = 0; i < allBranches.length; i++) {
    var b = allBranches[i];
    html += '<div class="emp-card">' +
      '<div class="emp-info"><div class="emp-name">🏪 ' + b.name + '</div></div>' +
      '<div class="emp-actions">' +
      '<button class="action-btn edit" onclick="openEditBranch(' + b.id + ',\'' + b.name + '\')">✏️</button>' +
      '<button class="action-btn del" onclick="deleteBranch(' + b.id + ')">🗑️</button>' +
      '</div></div>';
  }
  el.innerHTML = html;
}

function openAddBranch() {
  var titleEl = document.getElementById('branch-modal-title');
  if(titleEl) titleEl.textContent = (currentLang === 'ar') ? 'إضافة فرع' : 'Add Branch';
  
  var nameEl = document.getElementById('branch-form-name');
  if(nameEl) nameEl.value = '';
  
  var idEl = document.getElementById('edit-branch-id');
  if(idEl) idEl.value = '';
  
  openModal('add-branch-modal');
}

function openEditBranch(id, name) {
  var titleEl = document.getElementById('branch-modal-title');
  if(titleEl) titleEl.textContent = (currentLang === 'ar') ? 'تعديل الفرع' : 'Edit Branch';
  
  var nameEl = document.getElementById('branch-form-name');
  if(nameEl) nameEl.value = name;
  
  var idEl = document.getElementById('edit-branch-id');
  if(idEl) idEl.value = id;
  
  openModal('add-branch-modal');
}

async function saveBranch() {
  var name = document.getElementById('branch-form-name').value.trim();
  var id = document.getElementById('edit-branch-id').value;
  var ar = (currentLang === 'ar');
  
  if(!name) {
    notify(ar ? 'أدخل اسم الفرع' : 'Enter branch name', 'error');
    return;
  }
  
  try {
    if(id) {
      await dbPatch('branches', { name: name }, '?id=eq.' + id);
    } else {
      await dbPost('branches', { name: name });
    }
    notify(ar ? 'تم الحفظ ✅' : 'Saved ✅', 'success');
    closeModal('add-branch-modal');
    loadBranches();
  } catch(e) {
    notify('Error', 'error');
  }
}

async function deleteBranch(id) {
  var ar = (currentLang === 'ar');
  if(!confirm(ar ? 'حذف الفرع؟' : 'Delete branch?')) return;
  await dbDelete('branches', '?id=eq.' + id);
  loadBranches();
}

// ── OPEN EDIT EMP ──
function openEditEmp(id) {
  var emp = null;
  for(var i = 0; i < allEmployees.length; i++) {
    if(allEmployees[i].id === id) {
      emp = allEmployees[i];
      break;
    }
  }
  if(!emp) return;
  
  var titleEl = document.getElementById('emp-modal-title');
  if(titleEl) titleEl.textContent = (currentLang === 'ar') ? 'تعديل الموظف' : 'Edit Employee';
  
  var idEl = document.getElementById('edit-emp-id');
  if(idEl) idEl.value = id;
  
  var nameEl = document.getElementById('emp-form-name');
  if(nameEl) nameEl.value = emp.name;
  
  var usernameEl = document.getElementById('emp-form-username');
  if(usernameEl) usernameEl.value = emp.username;
  
  var passGroup = document.getElementById('emp-pass-group');
  if(passGroup) passGroup.style.display = 'none';
  
  var roleEl = document.getElementById('emp-form-role');
  if(roleEl) roleEl.value = emp.role || 'employee';
  
  toggleEmpBranchField();
  selectedDayOff = emp.day_off;
  
  var branchEl = document.getElementById('emp-form-branch');
  if(branchEl && emp.branch) branchEl.value = emp.branch;
  
  var chips = document.querySelectorAll('.day-chip');
  for(var j = 0; j < chips.length; j++) {
    var chip = chips[j];
    var dayVal = parseInt(chip.dataset.day);
    if(dayVal === emp.day_off) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  }
  
  openModal('add-emp-modal');
}

function toggleEmpBranchField() {
  var roleEl = document.getElementById('emp-form-role');
  var role = roleEl ? roleEl.value : 'employee';
  var branchGrp = document.getElementById('emp-branch-group');
  if(branchGrp) {
    branchGrp.style.display = (role === 'team_leader') ? 'none' : 'block';
  }
}

function selectDay(day) {
  selectedDayOff = day;
  var chips = document.querySelectorAll('.day-chip');
  for(var i = 0; i < chips.length; i++) {
    var chip = chips[i];
    var chipDay = parseInt(chip.dataset.day);
    if(chipDay === day) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  }
}

async function saveEmployee() {
  var id = document.getElementById('edit-emp-id').value;
  var name = document.getElementById('emp-form-name').value.trim();
  var username = document.getElementById('emp-form-username').value.trim();
  var pass = document.getElementById('emp-form-pass').value.trim();
  var branch = document.getElementById('emp-form-branch') ? document.getElementById('emp-form-branch').value : '';
  var roleEl = document.getElementById('emp-form-role');
  var role = roleEl ? roleEl.value : 'employee';
  var ar = (currentLang === 'ar');
  
  if(!name || !username) {
    notify(ar ? 'أدخل الاسم واسم المستخدم' : 'Enter name and username', 'error');
    return;
  }
  
  if(!id && !pass) {
    notify(ar ? 'أدخل كلمة المرور' : 'Enter password', 'error');
    return;
  }
  
  if(selectedDayOff < 0) {
    notify(ar ? 'اختر يوم الإجازة' : 'Select day off', 'error');
    return;
  }
  
  try {
    var data = { name: name, username: username, day_off: selectedDayOff, role: role };
    if(role === 'employee') data.branch = branch;
    
    if(id) {
      await dbPatch('employees', data, '?id=eq.' + id);
    } else {
      data.password = pass;
      await dbPost('employees', data);
    }
    notify(ar ? 'تم الحفظ ✅' : 'Saved ✅', 'success');
    closeModal('add-emp-modal');
    loadAllEmployees();
  } catch(e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + e.message, 'error');
  }
}

async function deleteEmp(id) {
  var ar = (currentLang === 'ar');
  if(!confirm(ar ? 'حذف الموظف؟ سيتم حذف جميع البيانات!' : 'Delete employee? All data will be removed!')) return;
  await dbDelete('employees', '?id=eq.' + id);
  loadAllEmployees();
}

// ── OPEN WARN MODAL ──
function openWarnModal(empId, empName) {
  var sel = document.getElementById('warn-emp-select');
  if(sel) {
    var html = '';
    for(var i = 0; i < allEmployees.length; i++) {
      var e = allEmployees[i];
      var selected = (e.id === empId) ? 'selected' : '';
      html += '<option value="' + e.id + '" ' + selected + '>' + e.name + '</option>';
    }
    sel.innerHTML = html;
  }
  
  var warnText = document.getElementById('warn-text');
  if(warnText) warnText.value = '';
  
  openModal('warning-modal');
}

function setWarnTemplate(n) {
  var templates = {
    1: (currentLang === 'ar') ? '⚠️ تحذير: تأخرت اليوم. يرجى الالتزام بمواعيد العمل الرسمية.' : '⚠️ Warning: You were late today. Please commit to work hours.',
    2: (currentLang === 'ar') ? '🔴 تحذير رسمي: تكرار التأخير. يرجى مراجعة الإدارة فوراً.' : '🔴 Official Warning: Repeated lateness. Contact management.',
    3: (currentLang === 'ar') ? '📋 تذكير: الالتزام بالمواعيد أو سيتم احتساب غياب.' : '📋 Reminder: Commit to work hours or absence will be recorded.'
  };
  var warnText = document.getElementById('warn-text');
  if(warnText) warnText.value = templates[n] || '';
}

async function sendWarning() {
  var empId = document.getElementById('warn-emp-select').value;
  var msg = document.getElementById('warn-text').value.trim();
  var ar = (currentLang === 'ar');
  
  if(!msg) {
    notify(ar ? 'أدخل نص التحذير' : 'Enter warning message', 'error');
    return;
  }
  
  try {
    await dbPost('warnings', {
      employee_id: parseInt(empId),
      message: msg,
      sent_by: currentUser.name || 'Management'
    });
    notify(ar ? 'تم إرسال التحذير ✅' : 'Warning sent ✅', 'success');
    closeModal('warning-modal');
  } catch(e) {}
}

// ── MANAGER TEAM ──
async function openManagerTeam(managerId, managerName) {
  editingManagerId = managerId;
  
  var titleEl = document.getElementById('manager-team-title');
  if(titleEl) titleEl.textContent = '👥 فريق: ' + managerName;
  
  var subtitleEl = document.getElementById('manager-team-subtitle');
  if(subtitleEl) subtitleEl.textContent = 'اختر الموظفين التابعين لهذا التيم ليدر';
  
  var existing = await dbGet('manager_teams', '?manager_id=eq.' + managerId + '&select=employee_id').catch(function() { return []; }) || [];
  var assignedIds = [];
  for(var i = 0; i < existing.length; i++) {
    assignedIds.push(existing[i].employee_id);
  }
  
  var listEl = document.getElementById('manager-team-list');
  if(listEl) {
    if(allEmployees.length === 0) {
      listEl.innerHTML = '<div class="empty">لا يوجد موظفون</div>';
    } else {
      var html = '';
      for(var j = 0; j < allEmployees.length; j++) {
        var emp = allEmployees[j];
        var isChecked = false;
        for(var k = 0; k < assignedIds.length; k++) {
          if(assignedIds[k] === emp.id) {
            isChecked = true;
            break;
          }
        }
        var checkedAttr = isChecked ? 'checked' : '';
        html += '<div class="team-emp-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="emp-avatar" style="width:32px;height:32px;font-size:12px">' + emp.name[0].toUpperCase() + '</div>' +
          '<div><div style="font-size:13px;font-weight:700">' + emp.name + '</div><div style="font-size:11px;color:var(--muted)">' + (emp.branch || '-') + '</div></div>' +
          '</div>' +
          '<input type="checkbox" class="team-check" data-emp-id="' + emp.id + '" ' + checkedAttr + '>' +
          '</div>';
      }
      listEl.innerHTML = html;
    }
  }
  openModal('manager-team-modal');
}

async function saveManagerTeam() {
  if(!editingManagerId) return;
  var ar = (currentLang === 'ar');
  
  var checks = document.querySelectorAll('#manager-team-list .team-check');
  var selectedIds = [];
  for(var i = 0; i < checks.length; i++) {
    if(checks[i].checked) {
      selectedIds.push(parseInt(checks[i].dataset.empId));
    }
  }
  
  try {
    await dbDelete('manager_teams', '?manager_id=eq.' + editingManagerId);
    for(var j = 0; j < selectedIds.length; j++) {
      await dbPost('manager_teams', { manager_id: editingManagerId, employee_id: selectedIds[j] });
    }
    managerTeamData[editingManagerId] = selectedIds;
    notify(ar ? 'تم حفظ الفريق ✅' : 'Team saved ✅', 'success');
    closeModal('manager-team-modal');
  } catch(e) {
    notify('Error: ' + e.message, 'error');
  }
}

async function getManagerTeamIds() {
  if(!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'team_leader')) return null;
  if(managerTeamData[currentUser.id]) return managerTeamData[currentUser.id];
  
  var res = await dbGet('manager_teams', '?manager_id=eq.' + currentUser.id + '&select=employee_id').catch(function() { return []; }) || [];
  var ids = [];
  for(var i = 0; i < res.length; i++) {
    ids.push(res[i].employee_id);
  }
  managerTeamData[currentUser.id] = ids;
  return ids;
}

// ── NAVIGATION ──
function empTab(tab, el) {
  var tabs = ['home', 'sales', 'visits', 'display', 'profile', 'chat'];
  for(var i = 0; i < tabs.length; i++) {
    var d = document.getElementById('emp-' + tabs[i]);
    if(d) d.style.display = (tabs[i] === tab) ? 'block' : 'none';
  }
  
  var navItems = document.querySelectorAll('#emp-app .nav-item');
  for(var j = 0; j < navItems.length; j++) {
    navItems[j].classList.remove('active');
  }
  if(el) el.classList.add('active');
  
  if(tab === 'sales') {
    renderProducts();
    loadTodaySales();
  }
  if(tab === 'profile') {
    var nameEl = document.getElementById('profile-name');
    if(nameEl) nameEl.textContent = currentUser ? currentUser.name : '-';
    var branchEl = document.getElementById('profile-branch');
    if(branchEl) branchEl.textContent = currentUser ? (currentUser.branch || '-') : '-';
    loadEmpMonthlyReport();
    loadEmpDailyLog();
    loadProfilePhoto();
  }
  if(tab === 'home') {
    if(typeof loadModelTargetAlert === 'function') loadModelTargetAlert();
  }
  if(tab === 'visits') {
    if(typeof loadVisitsTab === 'function') loadVisitsTab();
  }
  if(tab === 'display') {
    if(typeof loadDisplayTab === 'function') loadDisplayTab();
  }
}

function adminTab(tab, el) {
  var tabs = ['dashboard', 'employees', 'branches', 'reports', 'settings', 'visits', 'chat'];
  for(var i = 0; i < tabs.length; i++) {
    var d = document.getElementById('admin-' + tabs[i]);
    if(d) d.style.display = (tabs[i] === tab) ? 'block' : 'none';
  }
  
  var navItems = document.querySelectorAll('#admin-app .nav-item');
  for(var j = 0; j < navItems.length; j++) {
    navItems[j].classList.remove('active');
  }
  if(el) el.classList.add('active');
  
  if(tab === 'dashboard') loadAdminDashboard();
  if(tab === 'employees') loadAllEmployees();
  if(tab === 'branches') {
    if(typeof initBranchDashboard === 'function') initBranchDashboard();
  }
  if(tab === 'visits') {
    if(typeof loadTLVisitsTab === 'function') loadTLVisitsTab();
  }
  if(tab === 'chat') {
    if(typeof loadAdminChatList === 'function') loadAdminChatList();
  }
  if(typeof applyLang === 'function') applyLang();
}

// ── EMP MONTHLY REPORT ──
async function loadEmpMonthlyReport() {
  var pm = getPayrollMonth();
  var ar = (currentLang === 'ar');
  
  var att = await dbGet('attendance', '?employee_id=eq.' + currentUser.id + '&date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=*');
  var sales = await dbGet('sales', '?employee_id=eq.' + currentUser.id + '&date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=*');
  
  var salesTotal = 0;
  if(sales) {
    for(var i = 0; i < sales.length; i++) {
      salesTotal += sales[i].total_amount;
    }
  }
  
  var lateTotal = 0;
  if(att) {
    for(var j = 0; j < att.length; j++) {
      lateTotal += (att[j].late_minutes || 0);
    }
  }
  
  var el = document.getElementById('monthly-report-emp');
  if(!el) return;
  
  var rows = [];
  if(ar) {
    rows = [
      ['أيام الحضور', (att ? att.length : 0) + ' أيام', 'var(--green)'],
      ['دقائق التأخير', lateTotal + ' د', 'var(--yellow)'],
      ['إجمالي المبيعات', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'],
      ['عدد المعاملات', (sales ? sales.length : 0), 'var(--text)']
    ];
  } else {
    rows = [
      ['Attendance', (att ? att.length : 0) + ' days', 'var(--green)'],
      ['Late', lateTotal + 'm', 'var(--yellow)'],
      ['Total Sales', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'],
      ['Transactions', (sales ? sales.length : 0), 'var(--text)']
    ];
  }
  
  var html = '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">' + pm.label + '</div>';
  for(var k = 0; k < rows.length; k++) {
    html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:12px;color:var(--muted)">' + rows[k][0] + '</span>' +
      '<span style="font-size:13px;font-weight:700;color:' + rows[k][2] + '">' + rows[k][1] + '</span>' +
      '</div>';
  }
  el.innerHTML = html;
}

async function loadEmpDailyLog() {
  var pm = getPayrollMonth();
  var ar = (currentLang === 'ar');
  var att = await dbGet('attendance', '?employee_id=eq.' + currentUser.id + '&date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=*&order=date.desc') || [];
  
  var el = document.getElementById('emp-daily-log');
  if(!el) return;
  
  if(att.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div>' + (ar ? 'لا توجد سجلات' : 'No records') + '</div>';
    return;
  }
  
  var html = '<div class="table-wrap"><table style="width:100%"><thead><tr>' +
    '<th>' + (ar ? 'التاريخ' : 'Date') + '</th>' +
    '<th>' + (ar ? 'دخول' : 'In') + '</th>' +
    '<th>' + (ar ? 'خروج' : 'Out') + '</th>' +
    '<th>' + (ar ? 'تأخير' : 'Late') + '</th>' +
    '</tr></thead><tbody>';
  
  for(var i = 0; i < att.length; i++) {
    var a = att[i];
    var lateBadge = (a.late_minutes > 0) ?
      '<span class="badge badge-yellow">' + a.late_minutes + (ar ? 'د' : 'm') + '</span>' :
      '<span class="badge badge-green">✓</span>';
    
    html += '<tr>' +
      '<td>' + a.date + '</td>' +
      '<td>' + (a.check_in || '-') + '</td>' +
      '<td>' + (a.check_out || '-') + '</td>' +
      '<td>' + lateBadge + '</td>' +
      '</tr>';
  }
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function loadProfilePhoto() {
  var saved = localStorage.getItem('profile_photo_' + (currentUser ? currentUser.id : ''));
  if(saved) {
    var img = document.getElementById('profile-avatar-img');
    var icon = document.getElementById('profile-avatar-icon');
    if(img) {
      img.src = saved;
      img.style.display = 'block';
    }
    if(icon) icon.style.display = 'none';
  }
}

async function uploadProfilePhoto(event) {
  var file = event.target.files[0];
  if(!file) return;
  var ar = (currentLang === 'ar');
  
  var canvas = document.createElement('canvas');
  var img = new Image();
  var reader = new FileReader();
  
  reader.onload = async function(e) {
    img.onload = async function() {
      var maxSize = 200;
      var w = img.width;
      var h = img.height;
      if(w > h) {
        h = h * maxSize / w;
        w = maxSize;
      } else {
        w = w * maxSize / h;
        h = maxSize;
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var base64 = canvas.toDataURL('image/jpeg', 0.7);
      
      try {
        localStorage.setItem('profile_photo_' + currentUser.id, base64);
        var imgEl = document.getElementById('profile-avatar-img');
        var iconEl = document.getElementById('profile-avatar-icon');
        if(imgEl) {
          imgEl.src = base64;
          imgEl.style.display = 'block';
        }
        if(iconEl) iconEl.style.display = 'none';
        
        await dbPatch('employees', { profile_photo: base64 }, '?id=eq.' + currentUser.id).catch(function() {});
        currentUser.profile_photo = base64;
        localStorage.setItem('oraimo_user', JSON.stringify(currentUser));
        notify(ar ? 'تم تحديث الصورة ✅' : 'Photo updated ✅', 'success');
      } catch(e) {
        notify('Error: ' + e.message, 'error');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── FIX NAV DIRECTION ──
function fixNavDirection() {
  var dir = (currentLang === 'ar') ? 'rtl' : 'ltr';
  var navs = document.querySelectorAll('.bottom-nav');
  for(var i = 0; i < navs.length; i++) {
    navs[i].style.direction = dir;
    navs[i].style.flexDirection = 'row';
  }
}

function toggleLang() {
  if(typeof window.setLang === 'function') {
    window.setLang(currentLang === 'ar' ? 'en' : 'ar');
  }
  if(typeof window.applyLang === 'function') {
    window.applyLang();
  }
}

// ── INIT BRANCH DASHBOARD ──
function initBranchDashboard() {
  var sTier = [];
  var aTier = [];
  var bTier = [];
  var noSales = [];
  
  for(var i = 0; i < BRANCH_DATA.length; i++) {
    var b = BRANCH_DATA[i];
    if(b.tier === 'S') sTier.push(b);
    else if(b.tier === 'A') aTier.push(b);
    else if(b.tier === 'B') bTier.push(b);
    else noSales.push(b);
  }
  
  var ar = (currentLang === 'ar');
  
  var sCount = document.getElementById('kpi-s-count');
  if(sCount) sCount.textContent = sTier.length;
  var aCount = document.getElementById('kpi-a-count');
  if(aCount) aCount.textContent = aTier.length;
  var bCount = document.getElementById('kpi-b-count');
  if(bCount) bCount.textContent = bTier.length;
  
  var totalCurr = 0;
  var totalPrev = 0;
  for(var j = 0; j < BRANCH_DATA.length; j++) {
    totalCurr += BRANCH_DATA[j].revenue;
    totalPrev += BRANCH_DATA[j].prev_revenue;
  }
  
  var totalChange = (totalPrev > 0) ? ((totalCurr - totalPrev) / totalPrev * 100) : 0;
  
  var currRevEl = document.getElementById('kpi-curr-rev');
  if(currRevEl) currRevEl.textContent = 'EGP ' + fmtEGP(totalCurr);
  
  var prevRevEl = document.getElementById('kpi-prev-rev');
  if(prevRevEl) prevRevEl.textContent = 'EGP ' + fmtEGP(totalPrev);
  
  var changeEl = document.getElementById('kpi-change');
  if(changeEl) {
    changeEl.textContent = (totalChange >= 0 ? '+' : '') + totalChange.toFixed(1) + '%';
    changeEl.style.color = (totalChange >= 0) ? 'var(--green)' : 'var(--red)';
  }
  
  var top10 = [];
  for(var k = 0; k < BRANCH_DATA.length && top10.length < 10; k++) {
    if(BRANCH_DATA[k].revenue > 0) top10.push(BRANCH_DATA[k]);
  }
  top10.sort(function(a, b) { return b.revenue - a.revenue; });
  
  var maxR = (top10[0] && top10[0].revenue > 0) ? top10[0].revenue : 1;
  var medals = ['🥇', '🥈', '🥉'];
  
  var topListEl = document.getElementById('branch-top-list');
  if(topListEl) {
    var topHtml = '';
    for(var t = 0; t < top10.length; t++) {
      var br = top10[t];
      var chg = (br.prev_revenue > 0) ? ((br.revenue - br.prev_revenue) / br.prev_revenue * 100) : null;
      var tierBadge = '';
      if(br.tier === 'S') tierBadge = '<span class="tier-s">S 🥇</span>';
      else if(br.tier === 'A') tierBadge = '<span class="tier-a">A 🥈</span>';
      else tierBadge = '<span class="tier-b">B 🥉</span>';
      
      var pct = Math.max(4, Math.round(br.revenue / maxR * 100));
      var medalIcon = (t < 3) ? medals[t] : '#' + (t + 1);
      
      topHtml += '<div class="branch-card branch-card.tier-' + br.tier.toLowerCase() + '-card">' +
        '<div style="display:flex;align-items:center;margin-bottom:8px">' +
        '<span style="font-size:16px;margin-left:6px">' + medalIcon + '</span>' +
        '<div class="branch-name">' + br.name + '</div>' +
        tierBadge +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:5px">' +
        '<span style="color:var(--green);font-weight:800">EGP ' + fmtEGP(br.revenue) + '</span>';
      if(chg !== null) {
        topHtml += '<span class="' + (chg >= 0 ? 'change-up' : 'change-down') + '">' + (chg >= 0 ? '+' : '') + chg.toFixed(0) + '%</span>';
      }
      topHtml += '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px">' +
        '<span>' + (ar ? 'سابقاً:' : 'Prev:') + ' EGP ' + fmtEGP(br.prev_revenue) + '</span>' +
        '<span>' + (ar ? 'كمية:' : 'Qty:') + ' ' + br.qty + '</span>' +
        '</div>' +
        '<div class="target-bar"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--green),#00e676);border-radius:4px;transition:width .6s"></div></div>' +
        '</div>';
    }
    topListEl.innerHTML = topHtml;
  }
}

// ── MODEL TARGET ALERT ──
async function loadModelTargetAlert() {
  var el = document.getElementById('model-target-alert');
  if(!el) return;
  
  var ar = (currentLang === 'ar');
  var pm = getPayrollMonth();
  var mon = pm.start.substring(0, 7);
  
  var targetRes = await dbGet('targets', '?employee_id=eq.' + currentUser.id + '&month=eq.' + mon + '&select=*');
  var sales = await dbGet('sales', '?employee_id=eq.' + currentUser.id + '&date=gte.' + pm.start + '&date=lte.' + pm.end + '&select=product_name,quantity');
  
  if(!targetRes || targetRes.length === 0) {
    el.innerHTML = '';
    return;
  }
  
  var models = targetRes[0].model_targets || [];
  if(models.length === 0) {
    el.innerHTML = '';
    return;
  }
  
  var soldQty = {};
  if(sales) {
    for(var i = 0; i < sales.length; i++) {
      var name = sales[i].product_name;
      soldQty[name] = (soldQty[name] || 0) + sales[i].quantity;
    }
  }
  
  var today = new Date();
  var endDate = new Date(pm.end);
  var daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
  var totalDays = new Date(pm.end).getDate();
  var daysPassed = totalDays - daysLeft;
  
  var behindModels = [];
  for(var m = 0; m < models.length; m++) {
    var model = models[m];
    var done = soldQty[model.name] || 0;
    var expectedByNow = (daysPassed > 0) ? Math.round(model.qty / totalDays * daysPassed) : 0;
    if(done < expectedByNow) {
      behindModels.push(model);
    }
  }
  
  var allOnTrack = (behindModels.length === 0);
  
  var html = '<div class="model-alert-card ' + (allOnTrack ? 'on-track' : '') + '">' +
    '<div class="model-alert-title">' + (allOnTrack ? '✅' : '⚠️') + ' ' + (ar ? (allOnTrack ? 'تارجت الموديلات — على المسار' : 'تارجت الموديلات — يحتاج اهتمام') : (allOnTrack ? 'Model Targets — On Track' : 'Model Targets — Needs Attention')) +
    '<span style="font-size:10px;color:var(--muted);font-weight:500;margin-right:auto">' + daysLeft + ' ' + (ar ? 'يوم متبقي' : 'days left') + '</span>' +
    '</div>';
  
  for(var n = 0; n < models.length; n++) {
    var mdl = models[n];
    var doneQty = soldQty[mdl.name] || 0;
    var pct = Math.min(100, Math.round(doneQty / mdl.qty * 100));
    var color = (pct >= 80) ? 'var(--green)' : ((pct >= 50) ? 'var(--yellow)' : 'var(--red)');
    var shortName = mdl.name.split(' ').slice(-2).join(' ');
    
    html += '<div class="model-row">' +
      '<div class="model-name-sm">' + shortName + '</div>' +
      '<div class="model-progress">' +
      '<div style="width:70px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:3px;transition:.4s"></div></div>' +
      '<div class="model-pct" style="color:' + color + '">' + doneQty + '/' + mdl.qty + '</div>' +
      '</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ── VISITS TAB ──
var visitPhotos = [];

function populateVisitBranchSelect() {
  var sel = document.getElementById('visit-branch-select');
  if(!sel) return;
  
  var html = '<option value="">-- اختر الفرع --</option>';
  for(var i = 0; i < allBranches.length; i++) {
    html += '<option value="' + allBranches[i].name + '">' + allBranches[i].name + '</option>';
  }
  sel.innerHTML = html;
}

function addVisitPhoto(e) {
  if(visitPhotos.length >= 3) {
    notify('الحد الأقصى 3 صور', 'error');
    return;
  }
  
  var file = e.target.files[0];
  if(!file) return;
  
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800;
      var scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      var compressed = canvas.toDataURL('image/jpeg', 0.35);
      visitPhotos.push(compressed);
      renderVisitPhotoPreviews();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderVisitPhotoPreviews() {
  var el = document.getElementById('visit-photo-previews');
  if(!el) return;
  
  var html = '';
  for(var i = 0; i < visitPhotos.length; i++) {
    html += '<div class="photo-preview-wrap">' +
      '<img src="' + visitPhotos[i] + '" alt="">' +
      '<button class="photo-preview-del" onclick="removeVisitPhoto(' + i + ')">✕</button>' +
      '</div>';
  }
  el.innerHTML = html;
  
  var zone = document.getElementById('visit-upload-zone');
  if(zone) {
    zone.style.display = (visitPhotos.length >= 3) ? 'none' : 'block';
  }
}

function removeVisitPhoto(i) {
  visitPhotos.splice(i, 1);
  renderVisitPhotoPreviews();
}

async function submitVisit() {
  var branch = document.getElementById('visit-branch-select').value;
  var note = document.getElementById('visit-note-input').value.trim();
  var ar = (currentLang === 'ar');
  
  if(!branch) {
    notify(ar ? 'اختر الفرع' : 'Select branch', 'error');
    return;
  }
  
  try {
    await dbPost('branch_visits', {
      employee_id: currentUser.id,
      employee_name: currentUser.name,
      branch_name: branch,
      note: note || null,
      photo1: visitPhotos[0] || null,
      photo2: visitPhotos[1] || null,
      photo3: visitPhotos[2] || null,
      visit_date: todayStr()
    });
    notify(ar ? 'تم حفظ الزيارة ✅' : 'Visit saved ✅', 'success');
    visitPhotos = [];
    renderVisitPhotoPreviews();
    
    var branchSel = document.getElementById('visit-branch-select');
    if(branchSel) branchSel.value = '';
    var noteInput = document.getElementById('visit-note-input');
    if(noteInput) noteInput.value = '';
    
    loadVisitsTab();
  } catch(e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  }
}

async function loadVisitsTab() {
  populateVisitBranchSelect();
  var pm = getPayrollMonth();
  var visits = await dbGet('branch_visits', '?employee_id=eq.' + currentUser.id + '&visit_date=gte.' + pm.start + '&visit_date=lte.' + pm.end + '&order=visit_date.desc&select=*').catch(function() { return []; }) || [];
  
  var photoCount = 0;
  for(var i = 0; i < visits.length; i++) {
    var v = visits[i];
    if(v.photo1) photoCount++;
    if(v.photo2) photoCount++;
    if(v.photo3) photoCount++;
  }
  
  var done = visits.length;
  var remain = Math.max(0, 150 - done);
  
  var visDone = document.getElementById('vis-done');
  if(visDone) visDone.textContent = done;
  
  var visRem = document.getElementById('vis-remain');
  if(visRem) visRem.textContent = remain;
  
  var visPhotosEl = document.getElementById('vis-photos');
  if(visPhotosEl) visPhotosEl.textContent = photoCount;
  
  var empVisitsCount = document.getElementById('emp-visits-count');
  if(empVisitsCount) empVisitsCount.textContent = done + ' / 150';
  
  var el = document.getElementById('visit-history-list');
  if(!el) return;
  
  if(visits.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
    return;
  }
  
  var html = '';
  for(var j = 0; j < visits.length; j++) {
    var visit = visits[j];
    var photos = [];
    if(visit.photo1) photos.push(visit.photo1);
    if(visit.photo2) photos.push(visit.photo2);
    if(visit.photo3) photos.push(visit.photo3);
    
    html += '<div class="visit-card">' +
      '<div class="visit-header">' +
      '<div><div class="visit-branch-name">🏪 ' + visit.branch_name + '</div><div class="visit-meta">' + visit.visit_date + '</div></div>' +
      '<span class="badge badge-green">' + photos.length + ' 📷</span>' +
      '</div>';
    if(visit.note) {
      html += '<div class="visit-note">📝 ' + visit.note + '</div>';
    }
    if(photos.length > 0) {
      html += '<div class="visit-photos-row">';
      for(var p = 0; p < photos.length; p++) {
        html += '<img class="visit-photo" src="' + photos[p] + '" onclick="fullSelfie(\'' + photos[p] + '\')">';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  el.innerHTML = html;
}

// ── DISPLAY TAB ──
var displayPhotos = [];

function addDisplayPhoto(e) {
  if(displayPhotos.length >= 3) {
    notify('الحد الأقصى 3 صور', 'error');
    return;
  }
  
  var file = e.target.files[0];
  if(!file) return;
  
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var scale = Math.min(1, 800 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      var compressed = canvas.toDataURL('image/jpeg', 0.35);
      displayPhotos.push(compressed);
      renderDisplayPreviews();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderDisplayPreviews() {
  var el = document.getElementById('display-photo-previews');
  if(!el) return;
  
  var html = '';
  for(var i = 0; i < displayPhotos.length; i++) {
    html += '<div class="photo-preview-wrap">' +
      '<img src="' + displayPhotos[i] + '">' +
      '<button class="photo-preview-del" onclick="removeDisplayPhoto(' + i + ')">✕</button>' +
      '</div>';
  }
  el.innerHTML = html;
  
  var zone = document.getElementById('display-upload-zone');
  if(zone) {
    zone.style.display = (displayPhotos.length >= 3) ? 'none' : 'block';
  }
}

function removeDisplayPhoto(i) {
  displayPhotos.splice(i, 1);
  renderDisplayPreviews();
}

async function submitDisplayPhotos() {
  var note = document.getElementById('display-note').value.trim();
  var ar = (currentLang === 'ar');
  
  if(displayPhotos.length === 0) {
    notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');
    return;
  }
  
  try {
    await dbPost('display_photos', {
      employee_id: currentUser.id,
      employee_name: currentUser.name,
      branch: currentUser.branch || '',
      photo1: displayPhotos[0] || null,
      photo2: displayPhotos[1] || null,
      photo3: displayPhotos[2] || null,
      note: note || null,
      photo_date: todayStr()
    });
    notify(ar ? 'تم رفع صور الديسبلاي ✅' : 'Display photos uploaded ✅', 'success');
    displayPhotos = [];
    renderDisplayPreviews();
    
    var noteInput = document.getElementById('display-note');
    if(noteInput) noteInput.value = '';
    
    loadDisplayTab();
  } catch(e) {
    notify('Error: ' + e.message, 'error');
  }
}

async function loadDisplayTab() {
  var dateLabel = document.getElementById('display-date-label');
  if(dateLabel) dateLabel.textContent = todayStr();
  
  var hist = document.getElementById('display-history-list');
  if(!hist) return;
  
  var pm = getPayrollMonth();
  var records = await dbGet('display_photos', '?employee_id=eq.' + currentUser.id + '&photo_date=gte.' + pm.start + '&photo_date=lte.' + pm.end + '&order=photo_date.desc&select=*').catch(function() { return []; }) || [];
  
  if(records.length === 0) {
    hist.innerHTML = '<div class="empty"><div class="empty-icon">🖼️</div>لا توجد صور هذا الشهر</div>';
    return;
  }
  
  var html = '';
  for(var i = 0; i < records.length; i++) {
    var r = records[i];
    var photos = [];
    if(r.photo1) photos.push(r.photo1);
    if(r.photo2) photos.push(r.photo2);
    if(r.photo3) photos.push(r.photo3);
    
    html += '<div class="visit-card">' +
      '<div class="visit-header">' +
      '<div><div class="visit-branch-name">🗓️ ' + r.photo_date + '</div><div class="visit-meta">' + (r.branch || '') + '</div></div>' +
      '<span class="badge badge-blue">' + photos.length + ' 📷</span>' +
      '</div>';
    if(r.note) {
      html += '<div class="visit-note">📝 ' + r.note + '</div>';
    }
    if(photos.length > 0) {
      html += '<div class="visit-photos-row">';
      for(var p = 0; p < photos.length; p++) {
        html += '<img class="visit-photo" src="' + photos[p] + '" onclick="fullSelfie(\'' + photos[p] + '\')">';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  hist.innerHTML = html;
}

// ── TEAM LEADER VISITS ──
var tlVisitPhotos = [];

function addTLVisitPhoto(e) {
  if(tlVisitPhotos.length >= 3) {
    notify('الحد الأقصى 3 صور', 'error');
    return;
  }
  
  var file = e.target.files[0];
  if(!file) return;
  
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var scale = Math.min(1, 800 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      var compressed = canvas.toDataURL('image/jpeg', 0.35);
      tlVisitPhotos.push(compressed);
      renderTLPreviews();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function renderTLPreviews() {
  var el = document.getElementById('tl-visit-previews');
  if(!el) return;
  
  var html = '';
  for(var i = 0; i < tlVisitPhotos.length; i++) {
    html += '<div class="photo-preview-wrap">' +
      '<img src="' + tlVisitPhotos[i] + '">' +
      '<button class="photo-preview-del" onclick="removeTLPhoto(' + i + ')">✕</button>' +
      '</div>';
  }
  el.innerHTML = html;
  
  var zone = document.getElementById('tl-visit-zone');
  if(zone) {
    zone.style.display = (tlVisitPhotos.length >= 3) ? 'none' : 'block';
  }
}

function removeTLPhoto(i) {
  tlVisitPhotos.splice(i, 1);
  renderTLPreviews();
}

async function submitTLVisit() {
  var branch = document.getElementById('tl-visit-branch').value;
  var note = document.getElementById('tl-visit-note').value.trim();
  var ar = (currentLang === 'ar');
  
  if(!branch) {
    notify(ar ? 'اختر الفرع' : 'Select branch', 'error');
    return;
  }
  
  if(tlVisitPhotos.length === 0) {
    notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');
    return;
  }
  
  try {
    await dbPost('branch_visits', {
      manager_id: currentUser.id,
      manager_name: currentUser.name,
      branch_name: branch,
      note: note || null,
      photo1: tlVisitPhotos[0] || null,
      photo2: tlVisitPhotos[1] || null,
      photo3: tlVisitPhotos[2] || null,
      visit_date: todayStr()
    });
    notify(ar ? 'تم حفظ الزيارة ✅' : 'Visit saved ✅', 'success');
    tlVisitPhotos = [];
    renderTLPreviews();
    
    var branchSel = document.getElementById('tl-visit-branch');
    if(branchSel) branchSel.value = '';
    var noteInput = document.getElementById('tl-visit-note');
    if(noteInput) noteInput.value = '';
    
    loadTLVisitsTab();
  } catch(e) {
    notify('Error: ' + e.message, 'error');
  }
}

async function loadTLVisitsTab() {
  var sel = document.getElementById('tl-visit-branch');
  if(sel) {
    var html = '<option value="">-- اختر الفرع --</option>';
    for(var i = 0; i < allBranches.length; i++) {
      html += '<option value="' + allBranches[i].name + '">' + allBranches[i].name + '</option>';
    }
    sel.innerHTML = html;
  }
  
  var pm = getPayrollMonth();
  var visits = await dbGet('branch_visits', '?manager_id=eq.' + currentUser.id + '&visit_date=gte.' + pm.start + '&visit_date=lte.' + pm.end + '&order=visit_date.desc&select=*').catch(function() { return []; }) || [];
  
  var done = visits.length;
  var remain = Math.max(0, 150 - done);
  
  var doneEl = document.getElementById('tl-vis-done');
  if(doneEl) doneEl.textContent = done;
  
  var remEl = document.getElementById('tl-vis-remain');
  if(remEl) remEl.textContent = remain;
  
  var cntEl = document.getElementById('tl-visit-count');
  if(cntEl) cntEl.textContent = done + ' / 150';
  
  var el = document.getElementById('tl-visit-history');
  if(!el) return;
  
  if(visits.length === 0) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📸</div>لا توجد زيارات هذا الشهر</div>';
    return;
  }
  
  var historyHtml = '';
  for(var j = 0; j < visits.length; j++) {
    var v = visits[j];
    var photos = [];
    if(v.photo1) photos.push(v.photo1);
    if(v.photo2) photos.push(v.photo2);
    if(v.photo3) photos.push(v.photo3);
    
    historyHtml += '<div class="visit-card">' +
      '<div class="visit-header">' +
      '<div><div class="visit-branch-name">🏪 ' + v.branch_name + '</div><div class="visit-meta">' + v.visit_date + '</div></div>' +
      '<span class="badge badge-green">' + photos.length + ' 📷</span>' +
      '</div>';
    if(v.note) {
      historyHtml += '<div class="visit-note">📝 ' + v.note + '</div>';
    }
    if(photos.length > 0) {
      historyHtml += '<div class="visit-photos-row">';
      for(var p = 0; p < photos.length; p++) {
        historyHtml += '<img class="visit-photo" src="' + photos[p] + '" onclick="fullSelfie(\'' + photos[p] + '\')">';
      }
      historyHtml += '</div>';
    }
    historyHtml += '</div>';
  }
  el.innerHTML = historyHtml;
}

// ── LOAD ADMIN CHAT LIST ──
async function loadAdminChatList() {
  var el = document.getElementById('admin-chat-list');
  if(!el) return;
  
  var ar = (currentLang === 'ar');
  var html = '';
  
  for(var i = 0; i < allEmployees.length; i++) {
    var emp = allEmployees[i];
    html += '<div class="card" onclick="openChat(\'' + emp.id + '\',\'' + emp.name + '\')" style="cursor:pointer;display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-direction:' + (ar ? 'row-reverse' : 'row') + '">' +
      '<div class="emp-avatar" style="width:44px;height:44px;font-size:15px;flex-shrink:0;overflow:hidden">' + (emp.profile_photo ? '<img src="' + emp.profile_photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : emp.name[0].toUpperCase()) + '</div>' +
      '<div style="text-align:' + (ar ? 'right' : 'left') + '"><div style="font-size:13px;font-weight:700">' + emp.name + '</div><div style="font-size:11px;color:var(--muted)">' + (emp.branch || '') + '</div></div>' +
      '</div>';
  }
  el.innerHTML = html || '<div class="empty">' + (ar ? 'لا يوجد موظفون' : 'No employees') + '</div>';
}

// ── CHAT SYSTEM ──
async function openChat(chatType, title) {
  currentChat = chatType;
  var titleEl = document.getElementById('chat-title');
  if(titleEl) titleEl.textContent = title;
  
  var modal = document.getElementById('chat-modal');
  if(modal) {
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
  }
  
  await loadMessages();
  subscribeToMessages();
}

function closeChat() {
  var modal = document.getElementById('chat-modal');
  if(modal) modal.style.display = 'none';
  currentChat = null;
  
  if(chatSubscription) {
    if(typeof chatSubscription === 'function') {
      try { chatSubscription(); } catch(e) {}
    } else {
      try { clearInterval(chatSubscription); } catch(e) {}
    }
    chatSubscription = null;
  }
}

async function loadMessages() {
  var el = document.getElementById('chat-messages');
  if(!el) return;
  
  el.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  
  var myId = currentUser.id;
  var query = '?order=created_at.asc&limit=100';
  
  if(currentChat === 'group') {
    query += '&chat_type=eq.group';
  } else if(currentChat === 'admin') {
    query += '&chat_type=eq.private&or=(sender_id.eq.' + myId + ',receiver_id.eq.' + myId + ')';
  } else {
    query += '&chat_type=eq.private&or=(sender_id.eq.' + currentChat + ',receiver_id.eq.' + currentChat + ')';
  }
  
  var msgs = await dbGet('messages', query).catch(function() { return []; }) || [];
  renderMessages(msgs);
}

function renderMessages(msgs) {
  var el = document.getElementById('chat-messages');
  if(!el) return;
  
  if(msgs.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">لا توجد رسائل بعد</div>';
    return;
  }
  
  var myId = currentUser.id;
  var myName = currentUser.name;
  var html = '';
  
  for(var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    var isMe = (m.sender_id === myId || m.sender_name === myName);
    var time = new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    var bubbleBg = isMe ? 'linear-gradient(135deg,rgba(0,200,83,.25),rgba(0,160,64,.15))' : 'var(--card2)';
    var bubbleBorder = isMe ? '1px solid rgba(0,200,83,.35)' : '1px solid var(--border)';
    var bubbleRadius = isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px';
    var align = isMe ? 'flex-end' : 'flex-start';
    
    html += '<div style="display:flex;flex-direction:column;align-items:' + align + ';margin-bottom:2px">' +
      '<div style="max-width:78%;min-width:60px;background:' + bubbleBg + ';border-radius:' + bubbleRadius + ';padding:8px 13px;border:' + bubbleBorder + '">';
    if(!isMe) {
      html += '<div style="font-size:10px;color:var(--green);font-weight:800;margin-bottom:3px">' + escapeHtmlLocal(m.sender_name) + '</div>';
    }
    html += '<div style="font-size:14px;line-height:1.4;word-break:break-word">' + escapeHtmlLocal(m.message) + '</div>' +
      '<div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:' + (isMe ? 'left' : 'right') + '">' + time + '</div>' +
      '</div></div>';
  }
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

function escapeHtmlLocal(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var _sendingMsg = false;

async function sendMessage() {
  if(_sendingMsg) return;
  
  var input = document.getElementById('chat-input');
  var msg = (input ? input.value : '').trim();
  if(!msg || msg.length > 2000) return;
  
  _sendingMsg = true;
  if(input) input.value = '';
  
  var tmpMsg = {
    sender_id: currentUser.id,
    sender_name: currentUser.name,
    message: msg,
    chat_type: (currentChat === 'group') ? 'group' : 'private',
    created_at: new Date().toISOString(),
    _tmp: true
  };
  appendMessage(tmpMsg);
  
  try {
    var data = {
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      message: msg,
      chat_type: (currentChat === 'group') ? 'group' : 'private',
      receiver_id: (currentChat === 'group') ? null : ((currentChat === 'admin') ? null : parseInt(currentChat))
    };
    await dbPost('messages', data);
  } catch(e) {
    await loadMessages();
  } finally {
    _sendingMsg = false;
  }
}

function appendMessage(m) {
  var el = document.getElementById('chat-messages');
  if(!el) return;
  
  var myId = currentUser.id;
  var myName = currentUser.name;
  var isMe = (m.sender_id === myId || m.sender_name === myName);
  var time = new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  var bubbleBg = isMe ? 'linear-gradient(135deg,rgba(0,200,83,.25),rgba(0,160,64,.15))' : 'var(--card2)';
  var bubbleBorder = isMe ? '1px solid rgba(0,200,83,.35)' : '1px solid var(--border)';
  var bubbleRadius = isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px';
  var align = isMe ? 'flex-end' : 'flex-start';
  
  var div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-direction:column;align-items:' + align + ';margin-bottom:2px';
  div.innerHTML = '<div style="max-width:78%;min-width:60px;background:' + bubbleBg + ';border-radius:' + bubbleRadius + ';padding:8px 13px;border:' + bubbleBorder + '">' +
    (!isMe ? '<div style="font-size:10px;color:var(--green);font-weight:800;margin-bottom:3px">' + escapeHtmlLocal(m.sender_name) + '</div>' : '') +
    '<div style="font-size:14px;line-height:1.4;word-break:break-word">' + escapeHtmlLocal(m.message) + '</div>' +
    '<div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:' + (isMe ? 'left' : 'right') + '">' + time + '</div>' +
    '</div>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function subscribeToMessages() {
  if(chatSubscription) {
    if(typeof chatSubscription === 'function') {
      try { chatSubscription(); } catch(e) {}
    } else {
      try { clearInterval(chatSubscription); } catch(e) {}
    }
    chatSubscription = null;
  }
  
  chatSubscription = setInterval(function() {
    if(currentChat) loadMessages();
  }, 5000);
}

// ── SHOW ABSENT EMPLOYEES ──
function showAbsentEmployees() {
  var ar = (currentLang === 'ar');
  var presentIds = window._todayPresentIds || [];
  var absentList = [];
  
  for(var i = 0; i < allEmployees.length; i++) {
    var found = false;
    for(var j = 0; j < presentIds.length; j++) {
      if(presentIds[j] === allEmployees[i].id) {
        found = true;
        break;
      }
    }
    if(!found) absentList.push(allEmployees[i]);
  }
  
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  
  var html = '<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--red)">' +
    '<div style="font-size:16px;font-weight:800;color:var(--red);margin-bottom:14px">😴 ' + (ar ? 'الغائبون اليوم' : 'Absent Today') + ' (' + absentList.length + ')</div>';
  
  if(absentList.length === 0) {
    html += '<div style="text-align:center;color:var(--muted);padding:20px">' + (ar ? 'لا يوجد غياب' : 'No absences') + '</div>';
  } else {
    for(var k = 0; k < absentList.length; k++) {
      var emp = absentList[k];
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<div class="emp-avatar" style="width:36px;height:36px;font-size:13px">' + emp.name[0].toUpperCase() + '</div>' +
        '<div><div style="font-size:13px;font-weight:700">' + emp.name + '</div><div style="font-size:11px;color:var(--muted)">' + (emp.branch || '-') + '</div></div>' +
        '</div>';
    }
  }
  
  html += '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">' + (ar ? 'إغلاق' : 'Close') + '</button></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

// ── CLEAR OLD VISIT PHOTOS ──
async function clearOldVisitPhotos() {
  var cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  var cutoffStr = cutoff.toISOString().split('T')[0];
  var old = await dbGet('branch_visits', '?visit_date=lt.' + cutoffStr + '&select=id').catch(function() { return []; }) || [];
  
  for(var i = 0; i < old.length; i++) {
    await dbPatch('branch_visits', { photo1: null, photo2: null, photo3: null }, '?id=eq.' + old[i].id);
  }
}

// ── SPLASH HIDE ON LOAD ──
window.addEventListener('load', function() {
  setTimeout(function() {
    var splash = document.getElementById('splash');
    if(splash) splash.classList.add('hide');
  }, 1000);
});

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    try {
      var splash = document.getElementById('splash');
      if(splash && !splash.classList.contains('hide')) {
        splash.classList.add('hide');
      }
      
      if(typeof showPage === 'function') {
        if(typeof currentUser !== 'undefined' && currentUser) {
          if(['superadmin','admin','manager','viewer','team_leader'].indexOf(currentUser.role) !== -1) {
            showPage('admin-app');
          } else {
            showPage('emp-app');
          }
        } else {
          showPage('login-page');
        }
      }
    } catch(e) {
      var login = document.getElementById('login-page');
      if(login) login.style.display = 'block';
    }
  }, 100);
});
