// ═══════════════════════════════════════════════════════════
// modules/attendance.js — FINAL FIX (no _t param, validated requests)
// ═══════════════════════════════════════════════════════════

const _SB_URL = 'https://lmszelfnosejdemxhodm.supabase.co';
const _SB_KEY = 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb';
const _ATT_LOCAL_KEY = 'oraimo_att_state_v1';

// ═══════════════════════════════════════════════════════════
// Persistent State
// ═══════════════════════════════════════════════════════════
function _saveAttState(empId, record) {
  try {
    const data = { empId: empId, date: todayStr(), record: record, savedAt: Date.now() };
    localStorage.setItem(_ATT_LOCAL_KEY, JSON.stringify(data));
  } catch (_) {}
}

function _loadAttState(empId) {
  try {
    const raw = localStorage.getItem(_ATT_LOCAL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.empId !== empId) return null;
    if (data.date !== todayStr()) return null;
    return data.record || null;
  } catch (_) { return null; }
}

function _clearAttState() {
  try { localStorage.removeItem(_ATT_LOCAL_KEY); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════
// ✅ FIX: Direct fetch — بدون _t parameter (Supabase ما بيقبلوش)
// نستخدم headers بس عشان نمنع الكاش
// ═══════════════════════════════════════════════════════════
async function _attFetchToday(empId) {
  if (!empId && empId !== 0) return [];
  const today = todayStr();
  // ✅ FIX: تنظيف empId — لازم يكون رقم
  const safeId = Number(empId);
  if (!Number.isFinite(safeId)) {
    console.error('[_attFetchToday] Invalid empId:', empId);
    return [];
  }

  // ✅ FIX: URL نظيف — بدون أي params extra
  const url = `${_SB_URL}/rest/v1/attendance?employee_id=eq.${safeId}&date=eq.${today}&select=*`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        apikey: _SB_KEY,
        Authorization: 'Bearer ' + _SB_KEY,
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[_attFetchToday] HTTP', res.status, text);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[_attFetchToday]', e);
    return [];
  }
}

async function _attPostCheckIn(record) {
  const res = await fetch(`${_SB_URL}/rest/v1/attendance`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: _SB_KEY,
      Authorization: 'Bearer ' + _SB_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const err = new Error('POST attendance failed: ' + res.status);
    err.status = res.status;
    try { err.detail = await res.text(); } catch (_) {}
    throw err;
  }
  return res.json();
}

async function _attPatchCheckOut(empId, today, body) {
  const safeId = Number(empId);
  const url = `${_SB_URL}/rest/v1/attendance?employee_id=eq.${safeId}&date=eq.${today}`;
  const res = await fetch(url, {
    method: 'PATCH',
    cache: 'no-store',
    headers: {
      apikey: _SB_KEY,
      Authorization: 'Bearer ' + _SB_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error('PATCH attendance failed: ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function _getShiftTimes(shift, dayOfWeek) {
  const isThurFri = (dayOfWeek === 4 || dayOfWeek === 5);
  if (shift === 'evening') {
    return isThurFri
      ? { start: '15:00', end: '23:00', labelAr: '🌙 مسائي: 3م – 11م', labelEn: '🌙 Evening: 3PM–11PM' }
      : { start: '14:00', end: '22:00', labelAr: '🌙 مسائي: 2م – 10م', labelEn: '🌙 Evening: 2PM–10PM' };
  }
  return { start: '10:00', end: '18:00', labelAr: '🌅 صباحي: 10ص – 6م', labelEn: '🌅 Morning: 10AM–6PM' };
}

function _to12HourLabel(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return '-';
  const parts = hhmm.split(':');
  if (parts.length < 2) return hhmm;
  const h = Number(parts[0]), m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

let _workCountdownTimer = null;
function _clearWorkCountdown() {
  if (_workCountdownTimer) {
    clearInterval(_workCountdownTimer);
    _workCountdownTimer = null;
  }
}

function _startWorkCountdown(checkInHHMM, lateMinutes = 0) {
  const status = document.getElementById('attend-status');
  if (!status) return;
  _clearWorkCountdown();
  const parts = String(checkInHHMM || '').split(':');
  if (parts.length < 2) return;
  const inH = Number(parts[0]), inM = Number(parts[1]);
  if (!Number.isFinite(inH) || !Number.isFinite(inM)) return;
  const baseInMin = inH * 60 + inM, shiftSeconds = 8 * 3600;
  const render = () => {
    const ar = currentLang === 'ar', now = new Date();
    const nowSec = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    let rem = shiftSeconds - (nowSec - baseInMin * 60);
    if (!Number.isFinite(rem) || rem < 0) rem = 0;
    const hh = Math.floor(rem / 3600), mm = Math.floor((rem % 3600) / 60), ss = rem % 60;
    const cd = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    status.textContent =
      `${ar ? 'دخل الساعة' : 'In at'} ${_to12HourLabel(checkInHHMM)}` +
      `${lateMinutes > 0 ? (ar ? ` (تأخر ${lateMinutes} د)` : ` (${lateMinutes}m late)`) : ''}` +
      `${ar ? ` • المتبقي: ${cd}` : ` • Remaining: ${cd}`}`;
    if (rem <= 0) _clearWorkCountdown();
  };
  render();
  _workCountdownTimer = setInterval(render, 1000);
}

function _ensureShiftInfoEl() {
  let el = document.getElementById('emp-shift-info');
  if (el) return el;
  const btn = document.getElementById('attend-btn');
  if (!btn) return null;
  el = document.createElement('div');
  el.id = 'emp-shift-info';
  el.style.cssText = 'font-size:12px;font-weight:700;color:var(--green);text-align:center;padding:8px 12px;margin:0 0 12px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.2);border-radius:12px;direction:rtl';
  btn.parentNode.insertBefore(el, btn);
  return el;
}

// ═══════════════════════════════════════════════════════════
// State Lock
// ═══════════════════════════════════════════════════════════
window._attCurrentRecord = window._attCurrentRecord || null;
window._attUpdatingFromCode = false;

function _setAttRecord(record) {
  window._attCurrentRecord = record || null;
  if (window.currentUser?.id) {
    _saveAttState(window.currentUser.id, record);
  }
}

// ═══════════════════════════════════════════════════════════
// updateAttendBtn
// ═══════════════════════════════════════════════════════════
function updateAttendBtn(record) {
  const btn = document.getElementById('attend-btn');
  const status = document.getElementById('attend-status');
  if (!btn) return;

  _setAttRecord(record);
  window._attUpdatingFromCode = true;

  const ar = currentLang === 'ar';
  const labelEl = btn.querySelector('.attend-label');

  try {
    if (record && record.check_in && !record.check_out) {
      btn.classList.add('checked-in');
      btn.classList.remove('attend-done');
      if (labelEl) {
        labelEl.setAttribute('data-ar', 'تسجيل خروج');
        labelEl.setAttribute('data-en', 'Check Out');
        labelEl.textContent = ar ? 'تسجيل خروج' : 'Check Out';
      }
      btn.onclick = handleAttendClick;
      btn.style.pointerEvents = '';
      _startWorkCountdown(record.check_in, record.late_minutes || 0);
      return;
    }

    if (record && record.check_in && record.check_out) {
      _clearWorkCountdown();
      btn.classList.remove('checked-in');
      btn.classList.add('attend-done');
      if (labelEl) {
        labelEl.setAttribute('data-ar', 'تم اليوم');
        labelEl.setAttribute('data-en', 'Done');
        labelEl.textContent = ar ? 'تم اليوم' : 'Done';
      }
      btn.onclick = () => notify(ar ? '✅ تم تسجيل الحضور والانصراف اليوم' : '✅ Attendance complete for today', 'info');
      btn.style.pointerEvents = '';
      if (status) {
        status.removeAttribute('data-ar');
        status.removeAttribute('data-en');
        status.textContent = `${ar ? 'دخول' : 'In'}: ${_to12HourLabel(record.check_in)} – ${ar ? 'خروج' : 'Out'}: ${_to12HourLabel(record.check_out)}`;
      }
      return;
    }

    _clearWorkCountdown();
    btn.classList.remove('checked-in', 'attend-done');
    if (labelEl) {
      labelEl.setAttribute('data-ar', 'تسجيل دخول');
      labelEl.setAttribute('data-en', 'Check In');
      labelEl.textContent = ar ? 'تسجيل دخول' : 'Check In';
    }
    btn.onclick = handleAttendClick;
    btn.style.pointerEvents = '';
    if (status) {
      status.setAttribute('data-ar', 'لم يتم تسجيل حضور اليوم');
      status.setAttribute('data-en', 'No attendance recorded today');
      status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';
    }
  } finally {
    setTimeout(() => { window._attUpdatingFromCode = false; }, 100);
  }
}

// ═══════════════════════════════════════════════════════════
// Refresh from server
// ═══════════════════════════════════════════════════════════
async function _refreshAttendanceState() {
  if (!window.currentUser || window.currentUser.role !== 'employee') return null;
  const empId = window.currentUser.id;

  // ✅ Fallback للـ localStorage فوراً
  const cached = _loadAttState(empId);
  if (cached) {
    updateAttendBtn(cached);
  }

  // اقرأ من السرفر
  const today = await _attFetchToday(empId);
  const record = today.length > 0 ? today[0] : null;

  // ✅ FIX: لو الـ fetch فشل (رجع []) لكن عندنا cached، استخدم الـ cached
  if (record === null && cached) {
    console.log('[ATT] Server fetch returned empty, keeping cached state');
    return cached;
  }

  updateAttendBtn(record);
  return record;
}

// ═══════════════════════════════════════════════════════════
// MutationObserver
// ═══════════════════════════════════════════════════════════
function _setupButtonObserver() {
  if (window._attObserverSetup) return;

  const btn = document.getElementById('attend-btn');
  if (!btn) {
    setTimeout(_setupButtonObserver, 500);
    return;
  }

  window._attObserverSetup = true;

  const observer = new MutationObserver(() => {
    if (window._attUpdatingFromCode) return;
    const record = window._attCurrentRecord;
    if (!record) return;

    const labelEl = btn.querySelector('.attend-label');
    if (!labelEl) return;

    const currentText = labelEl.textContent || '';
    const expectedAr = record.check_out ? 'تم اليوم' : (record.check_in ? 'تسجيل خروج' : 'تسجيل دخول');
    const expectedEn = record.check_out ? 'Done' : (record.check_in ? 'Check Out' : 'Check In');

    if (currentText !== expectedAr && currentText !== expectedEn) {
      console.warn('[ATT] Button changed externally, reverting:', currentText);
      updateAttendBtn(record);
    }
  });

  observer.observe(btn, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-ar', 'data-en', 'class'],
  });

  console.log('[ATT] Button observer ready');
}

// ═══════════════════════════════════════════════════════════
// loadEmpData
// ═══════════════════════════════════════════════════════════
async function loadEmpData() {
  if (!currentUser) return;
  try {
    await _refreshAttendanceState();
    _setupButtonObserver();

    const pm = getPayrollMonth();
    const [monthAtt, monthSales] = await Promise.all([
      dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
      dbGet('sales', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => [])
    ]);
    const attEl = document.getElementById('emp-attend-count'); if (attEl) attEl.textContent = (monthAtt || []).length;
    let salesTotal = 0; (monthSales || []).forEach(s => salesTotal += s.total_amount);
    const salesEl = document.getElementById('emp-sales-total'); if (salesEl) salesEl.textContent = fmtEGP(salesTotal);
    let lateTotal = 0; (monthAtt || []).forEach(a => lateTotal += (a.late_minutes || 0));
    const lateEl = document.getElementById('emp-late-total'); if (lateEl) lateEl.textContent = lateTotal;

    const targets = await dbGet('targets', `?employee_id=eq.${currentUser.id}&month=eq.${pm.start.substring(0, 7)}&select=*`).catch(() => []);
    const target = targets && targets.length > 0 ? targets[0].amount : 0;
    const pct = target > 0 ? Math.min(100, Math.round(salesTotal / target * 100)) : 0;
    const pctEl = document.getElementById('target-pct'); if (pctEl) pctEl.textContent = pct + '%';
    const achievedEl = document.getElementById('target-achieved'); if (achievedEl) achievedEl.textContent = 'EGP ' + fmtEGP(salesTotal);
    const goalEl = document.getElementById('target-goal'); if (goalEl) goalEl.textContent = (currentLang === 'ar' ? 'التارجت: ' : 'Target: ') + 'EGP ' + fmtEGP(target);
    const barEl = document.querySelector('.target-fill'); if (barEl) barEl.style.width = pct + '%';

    const sd = new Date(pm.start), ed = new Date(pm.end), now = new Date(); let absent = 0;
    for (let d = new Date(sd); d <= ed && d <= now; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0], dow = d.getDay();
      if (currentUser.day_off && (DAYS_EN[dow] === currentUser.day_off || DAYS_AR[dow] === currentUser.day_off)) continue;
      if (!(monthAtt || []).find(a => a.date === ds)) absent++;
    }
    const absEl = document.getElementById('emp-absent-count'); if (absEl) absEl.textContent = absent;

    if (typeof renderDailySalesGrid === 'function') renderDailySalesGrid(monthSales, pm);
    if (typeof renderEmpPerfChart === 'function') renderEmpPerfChart(monthSales, pm);

    const recent = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&order=date.desc&limit=7&select=*`).catch(() => []);
    renderAttendHistory(recent);
    loadEmpWarnings();
    if (typeof loadTodaySales === 'function') loadTodaySales();

    const shiftInfoEl = _ensureShiftInfoEl();
    if (shiftInfoEl) {
      const ar = currentLang === 'ar', dow = new Date().getDay(), shift = currentUser.shift || 'morning';
      const { labelAr, labelEn } = _getShiftTimes(shift, dow);
      shiftInfoEl.textContent = ar ? labelAr : labelEn;
    }

    // ✅ تأكيد نهائي
    if (window._attCurrentRecord) {
      updateAttendBtn(window._attCurrentRecord);
    }
  } catch (e) {
    console.error('[loadEmpData]', e);
  }
}

// ═══════════════════════════════════════════════════════════
// handleAttendClick
// ═══════════════════════════════════════════════════════════
function handleAttendClick() {
  const btn = document.getElementById('attend-btn');
  if (!btn) return;
  if (btn.classList.contains('attend-done')) return;
  attendMode = btn.classList.contains('checked-in') ? 'out' : 'in';
  const ar = currentLang === 'ar';
  const titleEl = document.getElementById('selfie-modal-title');
  const camLabelEl = document.getElementById('camera-label');
  if (titleEl) titleEl.textContent = attendMode === 'in' ? (ar ? 'تأكيد تسجيل الدخول' : 'Confirm Check In') : (ar ? 'تأكيد تسجيل الخروج' : 'Confirm Check Out');
  if (camLabelEl) camLabelEl.textContent = attendMode === 'in' ? (ar ? '📸 التقط سيلفي للدخول' : '📸 Take selfie to check in') : (ar ? '📸 التقط سيلفي للخروج' : '📸 Take selfie to check out');

  if (!navigator.geolocation) {
    notify(ar ? '⚠️ جهازك لا يدعم تحديد الموقع' : '⚠️ Geolocation not supported', 'error');
    return;
  }
  notify(ar ? '📍 جاري تحديد موقعك...' : '📍 Getting your location...', 'info');
  btn.style.pointerEvents = 'none';

  navigator.geolocation.getCurrentPosition(
    pos => {
      capturedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      btn.style.pointerEvents = '';
      openCamera();
    },
    err => {
      capturedLocation = null;
      btn.style.pointerEvents = '';
      if (err.code === 1) {
        notify(ar ? '❌ افتح الإعدادات ← Safari ← الموقع وافعّله' : '❌ Settings → Safari → Location → Allow', 'error');
      } else {
        notify(ar ? '⚠️ تعذر تحديد الموقع، سيتم التسجيل بدون موقع' : '⚠️ Location unavailable, proceeding without it', 'info');
        openCamera();
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

// ═══════════════════════════════════════════════════════════
// History & Reports
// ═══════════════════════════════════════════════════════════
function renderAttendHistory(records) {
  if (window.AttendanceUI?.renderAttendHistory) {
    window.AttendanceUI.renderAttendHistory(records, currentLang === 'ar', _to12HourLabel);
    return;
  }
  const el = document.getElementById('emp-attend-history');
  if (el) el.innerHTML = '';
}

async function loadEmpWarnings() {
  try {
    const warns = await dbGet('warnings', `?employee_id=eq.${currentUser.id}&order=created_at.desc&limit=5&select=*`);
    const card = document.getElementById('emp-warnings-card');
    const list = document.getElementById('emp-warnings-list');
    if (!warns || warns.length === 0) { if (card) card.style.display = 'none'; return; }
    if (card) card.style.display = 'block';
    if (list) list.innerHTML = warns.map(w => `<div class="perm-card" style="border-color:var(--yellow)"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="badge badge-yellow">${currentLang === 'ar' ? 'تحذير' : 'Warning'}</span><span style="font-size:10px;color:var(--muted)">${(w.created_at || '').substring(0, 10)}</span></div><div style="font-size:12px">${w.message}</div></div>`).join('');
  } catch (e) {
    console.warn('[loadEmpWarnings]', e);
  }
}

async function loadEmpDailyLog() {
  const pm = getPayrollMonth(), ar = currentLang === 'ar';
  const att = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`).catch(() => []) || [];
  if (window.AttendanceUI?.renderDailyLog) {
    window.AttendanceUI.renderDailyLog(att, ar, _to12HourLabel);
    return;
  }
  const el = document.getElementById('emp-daily-log');
  if (el) el.innerHTML = '';
}

async function loadEmpMonthlyReport() {
  const pm = getPayrollMonth(), ar = currentLang === 'ar';
  const [att, sales] = await Promise.all([
    dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
    dbGet('sales', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => [])
  ]);
  let salesTotal = 0; (sales || []).forEach(s => salesTotal += s.total_amount);
  let lateTotal = 0; (att || []).forEach(a => lateTotal += (a.late_minutes || 0));
  if (window.AttendanceUI?.renderMonthlyReport) {
    window.AttendanceUI.renderMonthlyReport({
      isArabic: ar, payrollLabel: pm.label,
      attendanceCount: (att || []).length, lateTotal, salesTotal,
      transactionsCount: (sales || []).length,
    });
    return;
  }
  const el = document.getElementById('monthly-report-emp');
  if (el) el.innerHTML = '';
}

// ═══════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════
async function openCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const v = document.getElementById('video');
    v.srcObject = videoStream;
    v.setAttribute('playsinline', '');
    v.setAttribute('autoplay', '');
    v.muted = true;
    await v.play().catch(() => {});
    document.getElementById('camera-modal').classList.add('open');
  } catch (e) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const v = document.getElementById('video');
      v.srcObject = videoStream;
      v.setAttribute('playsinline', '');
      v.muted = true;
      await v.play().catch(() => {});
      document.getElementById('camera-modal').classList.add('open');
    } catch (e2) {
      notify((currentLang === 'ar' ? '❌ خطأ في الكاميرا: ' : '❌ Camera error: ') + e2.message, 'error');
    }
  }
}

function closeCamera() {
  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  const m = document.getElementById('camera-modal');
  if (m) m.classList.remove('open');
}

function capturePhoto() {
  const v = document.getElementById('video'), c = document.getElementById('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(v, 0, 0);
  capturedPhoto = c.toDataURL('image/jpeg', 0.65);
  closeCamera();
  document.getElementById('selfie-preview-img').src = capturedPhoto;
  document.getElementById('selfie-modal').classList.add('open');
  document.getElementById('confirm-attend-btn').disabled = false;
  const ar = currentLang === 'ar';
  const ls = document.getElementById('location-status');
  if (ls) {
    if (capturedLocation) {
      ls.innerHTML = `✅ ${ar ? 'تم تحديد الموقع' : 'Location found'} — <a href="https://maps.google.com/?q=${capturedLocation.lat},${capturedLocation.lng}" target="_blank" style="color:var(--green)">${ar ? 'عرض' : 'View'}</a>`;
    } else {
      ls.textContent = ar ? '⚠️ لم يتم تحديد الموقع' : '⚠️ Location unavailable';
    }
  }
}

// ═══════════════════════════════════════════════════════════
// confirmAttendance
// ═══════════════════════════════════════════════════════════
let _attendSubmitting = false;

async function confirmAttendance() {
  if (_attendSubmitting) return;
  _attendSubmitting = true;
  const confirmBtn = document.getElementById('confirm-attend-btn');
  if (confirmBtn) confirmBtn.disabled = true;

  const today = todayStr();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const ar = currentLang === 'ar';

  try {
    const todayAtt = await _attFetchToday(currentUser.id);

    if (attendMode === 'in') {
      if (todayAtt.length > 0) {
        notify(ar ? '⚠️ تم تسجيل دخولك مسبقاً اليوم' : '⚠️ Already checked in today', 'error');
        updateAttendBtn(todayAtt[0]);
        closeModal('selfie-modal');
        return;
      }

      const dow = now.getDay();
      const { start: shiftStart } = _getShiftTimes(currentUser.shift || 'morning', dow);
      const [wh, wm] = shiftStart.split(':').map(Number);
      const [ah, am] = timeStr.split(':').map(Number);
      const lateMin = Math.max(0, (ah * 60 + am) - (wh * 60 + wm));

      const newRecord = {
        employee_id: currentUser.id,
        date: today,
        check_in: timeStr,
        late_minutes: lateMin,
        selfie_in: capturedPhoto,
        location_lat: capturedLocation?.lat,
        location_lng: capturedLocation?.lng,
      };

      try {
        const result = await _attPostCheckIn(newRecord);
        const savedRecord = Array.isArray(result) && result[0] ? result[0] : newRecord;
        notify(ar ? 'تم تسجيل الدخول ✅' : 'Checked in ✅', 'success');
        updateAttendBtn(savedRecord);
      } catch (postErr) {
        if (postErr.status === 409) {
          notify(ar ? '⚠️ تم تسجيل دخولك مسبقاً اليوم' : '⚠️ Already checked in today', 'error');
          // ✅ لو الـ GET ما رجعش حاجة، استخدم newRecord كـ fallback
          const fresh = await _attFetchToday(currentUser.id);
          if (fresh.length > 0) {
            updateAttendBtn(fresh[0]);
          } else {
            // ✅ الـ GET بيرجع 400 — استخدم newRecord
            console.log('[ATT] GET failed, using local record');
            updateAttendBtn({ ...newRecord, check_out: null });
          }
        } else {
          throw postErr;
        }
      }

      closeModal('selfie-modal');

    } else {
      if (todayAtt.length === 0) {
        notify(ar ? '⚠️ لم يتم تسجيل دخولك اليوم بعد!' : '⚠️ No check-in found for today!', 'error');
        closeModal('selfie-modal');
        return;
      }

      const result = await _attPatchCheckOut(currentUser.id, today, {
        check_out: timeStr,
        selfie_out: capturedPhoto,
      });

      const savedRecord = Array.isArray(result) && result[0]
        ? result[0]
        : { ...todayAtt[0], check_out: timeStr, selfie_out: capturedPhoto };

      notify(ar ? 'تم تسجيل الخروج ✅' : 'Checked out ✅', 'success');
      updateAttendBtn(savedRecord);
      closeModal('selfie-modal');
    }

    setTimeout(() => loadEmpData(), 1000);

  } catch (e) {
    console.error('[confirmAttendance]', e);
    notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  } finally {
    _attendSubmitting = false;
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
(function _initAttendanceModule() {
  if (window.__attModuleInit) return;
  window.__attModuleInit = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupButtonObserver);
  } else {
    _setupButtonObserver();
  }

  let _lastRefresh = 0;
  async function _maybeRefresh() {
    const now = Date.now();
    if (now - _lastRefresh < 1000) return;
    _lastRefresh = now;

    if (!window.currentUser || window.currentUser.role !== 'employee') return;
    if (document.visibilityState === 'hidden') return;

    const empApp = document.getElementById('emp-app');
    if (!empApp || getComputedStyle(empApp).display === 'none') return;

    try {
      await _refreshAttendanceState();
    } catch (e) {
      console.warn('[autoRefresh]', e);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _maybeRefresh();
  });
  window.addEventListener('focus', _maybeRefresh);
  window.addEventListener('pageshow', _maybeRefresh);

  setInterval(() => {
    if (window.currentUser?.role === 'employee' && document.visibilityState === 'visible') {
      _maybeRefresh();
    }
  }, 30000);

  const origLogout = window.doLogout;
  if (typeof origLogout === 'function') {
    window.doLogout = function () {
      _clearAttState();
      _setAttRecord(null);
      return origLogout.apply(this, arguments);
    };
  }

  function _showCachedStateOnLoad() {
    if (!window.currentUser || window.currentUser.role !== 'employee') return;
    const cached = _loadAttState(window.currentUser.id);
    if (cached) {
      console.log('[ATT] Restoring from local cache:', cached);
      updateAttendBtn(cached);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _showCachedStateOnLoad);
  } else {
    setTimeout(_showCachedStateOnLoad, 100);
  }

  window.addEventListener('load', () => {
    setTimeout(_maybeRefresh, 500);
  });

  console.log('[ATT] Master fix module v2 initialized');
})();
