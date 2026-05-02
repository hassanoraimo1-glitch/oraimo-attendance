// ═══════════════════════════════════════════════════════════
// modules/attendance.js — Attendance, selfie, camera, daily log
// Provides globals: loadEmpData, updateAttendBtn, handleAttendClick,
// confirmAttendance, openCamera, closeCamera, capturePhoto,
// renderAttendHistory, loadEmpWarnings, loadEmpDailyLog, loadEmpMonthlyReport
// ═══════════════════════════════════════════════════════════

let attendCountdownTimer = null;
let isConfirmingAttendance = false;

// ─── Global state variables (source of truth — must be declared before use) ───
var attendMode = 'in';          // 'in' | 'out'
var capturedPhoto = null;       // base64 selfie string
var capturedLocation = null;    // { lat, lng } | null
var videoStream = null;         // MediaStream | null
var _todayAttRecord = null;     // today's DB attendance record — single source of truth for attend state

// ─── Safe local PATCH wrapper ────────────────────────────────────────────────
async function _attendancePatch(table, bodyObj, queryStr) {
  try {
    const supaUrl = window.__SUPABASE_URL__ || window._supabaseUrl || window.SUPABASE_URL;
    const supaKey  = window.__SUPABASE_KEY__ || window._supabaseKey || window.SUPABASE_KEY;

    if (supaUrl && supaKey) {
      const url = `${supaUrl}/rest/v1/${table}${queryStr || ''}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': supaKey,
          'Authorization': `Bearer ${supaKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(bodyObj)
      });

      if (!res.ok) {
        throw new Error(`PATCH ${res.status}: ${await res.text().catch(() => '')}`);
      }

      const txt = await res.text();
      return txt ? JSON.parse(txt) : [];
    }
  } catch (directErr) {
    console.warn('[_attendancePatch] direct fetch failed, trying dbPatch:', directErr.message);
  }

  if (typeof window.dbPatch === 'function') {
    try {
      return await window.dbPatch(table, bodyObj, queryStr);
    } catch (e1) {
      try {
        return await window.dbPatch(table, queryStr, bodyObj);
      } catch (e2) {
        throw new Error(`dbPatch failed both orders: ${e2.message}`);
      }
    }
  }

  throw new Error('dbPatch not available');
}

// ─── Auto-detect Supabase config from network requests ───────────────────────
(function _interceptDbConfig() {
  const _origFetch = window.fetch;
  let _captured = false;

  if (window.__ATTENDANCE_FETCH_INTERCEPTED__) return;
  window.__ATTENDANCE_FETCH_INTERCEPTED__ = true;

  window.fetch = function interceptedFetch(url, opts) {
    if (!_captured && typeof url === 'string' && url.includes('/rest/v1/')) {
      try {
        const apikey = (opts && opts.headers && (
          opts.headers['apikey'] ||
          opts.headers['Apikey'] ||
          (opts.headers.get && opts.headers.get('apikey'))
        ));

        if (apikey) {
          const match = url.match(/^(https?:\/\/[^/]+)/);
          if (match) {
            window.__SUPABASE_URL__ = match[1];
            window.__SUPABASE_KEY__ = apikey;
            _captured = true;
            window.fetch = _origFetch;
            console.log('[attendance] ✅ Supabase config captured for safe PATCH');
          }
        }
      } catch (_) {}
    }

    return _origFetch.apply(this, arguments);
  };
})();

// ─── Session / UI safety helpers ─────────────────────────────────────────────
function _ensureCurrentUser() {
  try {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) return currentUser;
  } catch (_) {}

  const possibleKeys = [
    'currentUser',
    'user',
    'auth_user',
    'employee_user',
    'loggedUser'
  ];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        window.currentUser = parsed;
        try { currentUser = parsed; } catch (_) {}
        return parsed;
      }
    } catch (_) {}
  }

  return null;
}

function _lockBodyScroll() {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

function _unlockBodyScroll() {
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

function _stopVideoStream() {
  try {
    if (videoStream && typeof videoStream.getTracks === 'function') {
      videoStream.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
    }
  } catch (_) {}

  videoStream = null;
}

function _clearCameraVisualState() {
  const possibleVideos = [
    document.getElementById('video'),
    document.getElementById('selfie-video')
  ].filter(Boolean);

  const possibleCanvas = [
    document.getElementById('canvas'),
    document.getElementById('selfie-canvas')
  ].filter(Boolean);

  const preview = document.getElementById('selfie-preview-img');
  const overlay = document.getElementById('camera-overlay');

  possibleVideos.forEach(video => {
    try { video.pause(); } catch (_) {}
    try { video.srcObject = null; } catch (_) {}
    try { video.removeAttribute('src'); } catch (_) {}
    video.style.opacity = '1';
    video.style.filter = 'none';
    video.style.background = '#000';
    video.style.visibility = 'visible';
  });

  possibleCanvas.forEach(canvas => {
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    } catch (_) {}
  });

  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }

  if (overlay) {
    overlay.style.background = 'transparent';
    overlay.style.backdropFilter = 'none';
    overlay.style.webkitBackdropFilter = 'none';
    overlay.style.opacity = '1';
  }
}

// Helper: get shift time strings
function _getShiftTimes(shift, dayOfWeek) {
  const isThurFri = (dayOfWeek === 4 || dayOfWeek === 5);

  if (shift === 'evening') {
    return isThurFri
      ? { start: '15:00', end: '23:00', labelAr: '🌙 مسائي: 3م – 11م', labelEn: '🌙 Evening: 3PM–11PM' }
      : { start: '14:00', end: '22:00', labelAr: '🌙 مسائي: 2م – 10م', labelEn: '🌙 Evening: 2PM–10PM' };
  }

  return {
    start: '10:00',
    end: '18:00',
    labelAr: '🌅 صباحي: 10ص – 6م',
    labelEn: '🌅 Morning: 10AM–6PM'
  };
}

function _normalizeTimeToHHMMSS(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
  if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}`;
  return null;
}

function _sumSalesRows(rows) {
  let total = 0;
  (rows || []).forEach(r => {
    total += Number(r?.total_amount || 0);
  });
  return total;
}

function _setCardLabelByValueId(valueId, labelAr, labelEn) {
  const valueEl = document.getElementById(valueId);
  if (!valueEl) return;

  const card =
    valueEl.closest('.stat-card') ||
    valueEl.closest('.mini-stat') ||
    valueEl.closest('.kpi-card') ||
    valueEl.parentElement;

  if (!card) return;

  const labelEl =
    card.querySelector('.stat-label') ||
    card.querySelector('.mini-label') ||
    card.querySelector('.kpi-label') ||
    card.querySelector('[data-ar][data-en]');

  if (!labelEl) return;

  labelEl.textContent = currentLang === 'ar' ? labelAr : labelEn;
}

function _calcAbsentDays(monthAtt, pm) {
  const user = _ensureCurrentUser();
  const dayOff = Number(user?.day_off);

  const startD = new Date(pm.start);
  const endD = new Date(Math.min(new Date(pm.end), new Date()));
  let absent = 0;

  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const currentLoopDate = new Date(d);
    if (!isNaN(dayOff) && currentLoopDate.getDay() === dayOff) continue;

    const ds = fmtDate(currentLoopDate);
    if (!(monthAtt || []).find(a => a.date === ds)) absent++;
  }

  return absent;
}

function _ensureShiftInfoEl() {
  let el = document.getElementById('emp-shift-info');
  if (el) return el;

  const attendBtn = document.getElementById('attend-btn');
  if (!attendBtn || !attendBtn.parentNode) return null;

  el = document.createElement('div');
  el.id = 'emp-shift-info';
  el.style.cssText =
    'font-size:12px;font-weight:700;color:var(--green);text-align:center;padding:8px 12px;margin:0 0 12px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.2);border-radius:12px;direction:rtl';

  attendBtn.parentNode.insertBefore(el, attendBtn);
  return el;
}

function _ensureAttendCountdownEl() {
  let el = document.getElementById('emp-attend-countdown');
  if (el) return el;

  const status = document.getElementById('attend-status');
  if (!status || !status.parentNode) return null;

  el = document.createElement('div');
  el.id = 'emp-attend-countdown';
  el.style.cssText =
    'font-size:18px;font-weight:800;color:var(--yellow);text-align:center;margin-top:6px;direction:ltr;display:none';

  status.insertAdjacentElement('afterend', el);
  return el;
}

function _resetAttendanceCaptureState() {
  if (typeof capturedPhoto !== 'undefined') capturedPhoto = null;
  if (typeof capturedLocation !== 'undefined') capturedLocation = null;

  _stopVideoStream();
  _clearCameraVisualState();

  const img = document.getElementById('selfie-preview-img');
  if (img) img.src = '';

  const locStatusEl = document.getElementById('location-status');
  if (locStatusEl) {
    locStatusEl.textContent = currentLang === 'ar' ? '📍 جاري تحديد الموقع...' : '📍 Getting location...';
  }

  const confirmBtn = document.getElementById('confirm-attend-btn');
  if (confirmBtn) confirmBtn.disabled = true;
}

async function _hasTodayDisplayPhotos(employeeId, dateStr) {
  if (!employeeId || !dateStr) return false;

  try {
    const displayRows = await dbGet(
      'display_photos',
      `?employee_id=eq.${employeeId}&photo_date=eq.${dateStr}&select=photo1,photo2,photo3&limit=1`
    ).catch(() => []);

    const display = displayRows && displayRows.length > 0 ? displayRows[0] : null;
    return !!(display && (display.photo1 || display.photo2 || display.photo3));
  } catch (e) {
    console.warn('[_hasTodayDisplayPhotos]', e);
    return false;
  }
}

function startAttendanceCountdown(checkInTime) {
  const el = _ensureAttendCountdownEl();
  if (!el || !checkInTime) return;

  if (attendCountdownTimer) {
    clearInterval(attendCountdownTimer);
    attendCountdownTimer = null;
  }

  const today = todayStr();
  const normalized = _normalizeTimeToHHMMSS(checkInTime);
  if (!normalized) {
    el.style.display = 'none';
    return;
  }

  const checkInDate = new Date(`${today}T${normalized}`);
  if (isNaN(checkInDate.getTime())) {
    el.style.display = 'none';
    return;
  }

  const endTime = new Date(checkInDate.getTime() + (8 * 60 * 60 * 1000));

  function render() {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    el.style.display = 'block';

    if (diff <= 0) {
      el.textContent = '00:00:00';
      if (attendCountdownTimer) {
        clearInterval(attendCountdownTimer);
        attendCountdownTimer = null;
      }
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    el.textContent = `${hh}:${mm}:${ss}`;
  }

  render();
  attendCountdownTimer = setInterval(render, 1000);
}

function stopAttendanceCountdown() {
  if (attendCountdownTimer) {
    clearInterval(attendCountdownTimer);
    attendCountdownTimer = null;
  }

  const el = document.getElementById('emp-attend-countdown');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

async function loadEmpData() {
  const user = _ensureCurrentUser();
  if (!user) return;

  try {
    const today = todayStr();
    const pm = getPayrollMonth();
    const mon = pm.start.substring(0, 7);

    const [todayAtt, monthAtt, monthSales, todaySales, targetRes, recent] = await Promise.all([
      dbGet('attendance', `?employee_id=eq.${user.id}&date=eq.${today}&select=*`).catch(() => []),
      dbGet('attendance', `?employee_id=eq.${user.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
      dbGet('sales', `?employee_id=eq.${user.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
      dbGet('sales', `?employee_id=eq.${user.id}&date=eq.${today}&select=*`).catch(() => []),
      dbGet('targets', `?employee_id=eq.${user.id}&month=eq.${mon}&select=*`).catch(() => []),
      dbGet('attendance', `?employee_id=eq.${user.id}&order=date.desc&limit=7&select=*`).catch(() => [])
    ]);

    updateAttendBtn(todayAtt && todayAtt.length > 0 ? todayAtt[0] : null);

    const attCountEl = document.getElementById('emp-attend-count');
    if (attCountEl) attCountEl.textContent = (monthAtt || []).length;

    const salesTotal = _sumSalesRows(monthSales);
    const todaySalesTotal = _sumSalesRows(todaySales);

    window._empMonthSales = monthSales || [];
    window._empTodaySales = todaySales || [];

    const salesEl = document.getElementById('emp-sales-total');
    if (salesEl) salesEl.textContent = 'EGP ' + fmtEGP(salesTotal);

    const todaySalesEl = document.getElementById('emp-late-total');
    if (todaySalesEl) todaySalesEl.textContent = 'EGP ' + fmtEGP(todaySalesTotal);

    _setCardLabelByValueId('emp-sales-total', 'إجمالي المبيعات', 'Total Sales');
    _setCardLabelByValueId('emp-late-total', 'مبيعات اليوم', 'Today Sales');

    const target = targetRes && targetRes.length > 0 ? (targetRes[0].amount || 0) : 0;
    const kmodel = targetRes && targetRes.length > 0 ? (targetRes[0].kmodel_amount || 0) : 0;

    const achEl = document.getElementById('target-achieved');
    if (achEl) achEl.textContent = 'EGP ' + fmtEGP(salesTotal);

    const goalEl = document.getElementById('target-goal');
    if (goalEl) goalEl.textContent = (currentLang === 'ar' ? 'التارجت: ' : 'Target: ') + 'EGP ' + fmtEGP(target);

    const pct = target > 0 ? Math.min(100, Math.round((salesTotal / target) * 100)) : 0;
    const fillEl = document.getElementById('target-fill');
    if (fillEl) fillEl.style.width = pct + '%';

    const pctEl = document.getElementById('target-pct');
    if (pctEl) pctEl.textContent = pct + '%';

    const kr = document.getElementById('kmodel-row');
    if (kmodel > 0 && kr) {
      kr.style.display = 'block';
      const kpct = Math.min(100, Math.round((salesTotal / kmodel) * 100));
      const kf = document.getElementById('kmodel-fill');
      if (kf) kf.style.width = kpct + '%';
      const kp = document.getElementById('kmodel-pct');
      if (kp) kp.textContent = kpct + '%';
    } else if (kr) {
      kr.style.display = 'none';
    }

    const absent = _calcAbsentDays(monthAtt, pm);
    const absEl = document.getElementById('emp-absent-count');
    if (absEl) absEl.textContent = absent;

    if (typeof renderDailySalesGrid === 'function') renderDailySalesGrid(monthSales, pm);
    if (typeof renderEmpPerfChart === 'function') renderEmpPerfChart(monthSales, pm);

    renderAttendHistory(recent);
    loadEmpWarnings();

    const _salesTabEl = document.getElementById('emp-sales');
    const _salesTabVisible = _salesTabEl && getComputedStyle(_salesTabEl).display !== 'none';
    if (_salesTabVisible && typeof loadTodaySales === 'function') {
      loadTodaySales();
    }

    const shiftInfoEl = _ensureShiftInfoEl();
    if (shiftInfoEl) {
      const ar = currentLang === 'ar';
      const dow = new Date().getDay();
      const shift = user.shift || 'morning';
      const { labelAr, labelEn } = _getShiftTimes(shift, dow);
      shiftInfoEl.textContent = ar ? labelAr : labelEn;
    }
  } catch (e) {
    console.error('[loadEmpData]', e);
  }
}

function updateAttendBtn(record) {
  _todayAttRecord = record || null;

  const btn = document.getElementById('attend-btn');
  const status = document.getElementById('attend-status');
  if (!btn) return;

  const ar = currentLang === 'ar';
  const iconEl = btn.querySelector('.attend-icon');
  const labelEl = btn.querySelector('.attend-label');
  const countdownEl = _ensureAttendCountdownEl();

  if (countdownEl) countdownEl.style.display = 'none';

  if (record && record.check_in && !record.check_out) {
    btn.classList.add('checked-in');
    btn.dataset.attState = 'checked-in';

    if (iconEl) iconEl.textContent = '🔴';
    if (labelEl) labelEl.textContent = ar ? 'تسجيل الخروج' : 'Check Out';

    if (status) {
      status.textContent =
        `${ar ? 'دخل الساعة' : 'In at'} ${record.check_in}` +
        (record.late_minutes > 0
          ? (ar ? ` (تأخر ${record.late_minutes} د)` : ` (${record.late_minutes}m late)`)
          : '');
    }

    if (countdownEl) {
      countdownEl.style.display = 'block';
      startAttendanceCountdown(record.check_in);
    }

    return;
  }

  if (record && record.check_out) {
    btn.classList.remove('checked-in');
    btn.dataset.attState = 'done';

    if (iconEl) iconEl.textContent = '✅';
    if (labelEl) labelEl.textContent = ar ? 'تم' : 'Done';

    if (status) {
      status.textContent = `${ar ? 'دخول' : 'In'}: ${record.check_in || '-'} – ${ar ? 'خروج' : 'Out'}: ${record.check_out || '-'}`;
    }

    stopAttendanceCountdown();
    return;
  }

  btn.classList.remove('checked-in');
  btn.dataset.attState = 'ready';

  if (iconEl) iconEl.textContent = '🟢';
  if (labelEl) labelEl.textContent = ar ? 'تسجيل الدخول' : 'Check In';
  if (status) status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';

  stopAttendanceCountdown();
}

async function handleAttendClick() {
  const btn = document.getElementById('attend-btn');
  const user = _ensureCurrentUser();
  if (!btn || !user) return;

  const ar = currentLang === 'ar';

  let freshRecord = _todayAttRecord;
  try {
    const rows = await dbGet(
      'attendance',
      `?employee_id=eq.${user.id}&date=eq.${todayStr()}&select=*`
    ).catch(() => []);

    freshRecord = (rows && rows.length > 0) ? rows[0] : null;
    updateAttendBtn(freshRecord);
  } catch (_) {
    freshRecord = _todayAttRecord;
  }

  if (freshRecord && freshRecord.check_in && freshRecord.check_out) {
    notify(ar ? 'تم إنهاء الحضور اليوم بالفعل ✅' : 'Attendance already completed today ✅', 'info');
    return;
  }

  attendMode = (freshRecord && freshRecord.check_in && !freshRecord.check_out) ? 'out' : 'in';

  const titleEl = document.getElementById('selfie-modal-title');
  const camLabelEl = document.getElementById('camera-label');

  if (titleEl) {
    titleEl.textContent = attendMode === 'in'
      ? (ar ? 'تأكيد تسجيل الدخول' : 'Confirm Check In')
      : (ar ? 'تأكيد تسجيل الخروج' : 'Confirm Check Out');
  }

  if (camLabelEl) {
    camLabelEl.textContent = attendMode === 'in'
      ? (ar ? '📸 التقط سيلفي للدخول' : '📸 Take selfie to check in')
      : (ar ? '📸 التقط سيلفي للخروج' : '📸 Take selfie to check out');
  }

  if (attendMode === 'out') {
    const today = todayStr();
    const hasDisplay = await _hasTodayDisplayPhotos(user.id, today);

    if (!hasDisplay) {
      notify(
        ar
          ? '❌ لازم ترفع صور الديسبلاي قبل تسجيل الخروج'
          : '❌ You must upload display photos before check-out',
        'error'
      );

      if (typeof empTab === 'function') empTab('display');
      return;
    }
  }

  _resetAttendanceCaptureState();

  if (!navigator.geolocation) {
    notify(ar ? '📍 الموقع غير مدعوم، المتابعة بدونه' : '📍 Location not supported, continuing without it', 'info');
    openCamera();
    return;
  }

  notify(ar ? '📍 جاري تحديد موقعك...' : '📍 Getting your location...', 'info');
  btn.style.pointerEvents = 'none';

  navigator.geolocation.getCurrentPosition(
    pos => {
      capturedLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      btn.style.pointerEvents = '';
      openCamera();
    },
    err => {
      capturedLocation = null;
      btn.style.pointerEvents = '';

      if (err.code === 1) {
        notify(
          ar ? '⚠️ الموقع مرفوض، المتابعة بدونه' : '⚠️ Location denied, continuing without it',
          'info'
        );
      } else {
        notify(
          ar ? '⚠️ تعذر الموقع، المتابعة بدونه' : '⚠️ Location failed, continuing without it',
          'info'
        );
      }

      openCamera();
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
  );
}

function renderAttendHistory(records) {
  const el = document.getElementById('emp-attend-history');
  if (!el) return;

  const ar = currentLang === 'ar';

  if (!records || records.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div>${ar ? 'لا توجد سجلات' : 'No records'}</div>`;
    return;
  }

  el.innerHTML = records.map(r => `
    <div class="history-item">
      <div class="hist-top">
        <div class="hist-name">${r.date}</div>
        <span class="badge ${r.late_minutes > 0 ? 'badge-yellow' : 'badge-green'}">
          ${r.late_minutes > 0 ? r.late_minutes + (ar ? ' د تأخير' : 'm late') : (ar ? 'في الوقت' : 'On time')}
        </span>
      </div>
      <div style="display:flex;justify-content:space-between">
        <div class="hist-meta">${ar ? 'دخول' : 'In'}: ${r.check_in || '-'}</div>
        <div class="hist-meta">${ar ? 'خروج' : 'Out'}: ${r.check_out || '-'}</div>
      </div>
    </div>
  `).join('');
}

async function loadEmpWarnings() {
  const user = _ensureCurrentUser();
  if (!user) return;

  try {
    const warns = await dbGet(
      'warnings',
      `?employee_id=eq.${user.id}&order=created_at.desc&limit=5&select=*`
    ).catch(() => []);

    const card = document.getElementById('emp-warnings-card');
    const list = document.getElementById('emp-warnings-list');

    if (!warns || warns.length === 0) {
      if (card) card.style.display = 'none';
      return;
    }

    if (card) card.style.display = 'block';

    if (list) {
      list.innerHTML = warns.map(w => `
        <div class="perm-card" style="border-color:var(--yellow)">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span class="badge badge-yellow">${currentLang === 'ar' ? 'تحذير' : 'Warning'}</span>
            <span style="font-size:10px;color:var(--muted)">${(w.created_at || '').substring(0, 10)}</span>
          </div>
          <div style="font-size:12px">${w.message || ''}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.warn('[loadEmpWarnings]', e);
  }
}

async function loadEmpDailyLog() {
  const user = _ensureCurrentUser();
  if (!user) return;

  const pm = getPayrollMonth();
  const ar = currentLang === 'ar';

  const att = await dbGet(
    'attendance',
    `?employee_id=eq.${user.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`
  ).catch(() => []) || [];

  const el = document.getElementById('emp-daily-log');
  if (!el) return;

  if (att.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div>${ar ? 'لا توجد سجلات' : 'No records'}</div>`;
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <tr>
          <th>${ar ? 'التاريخ' : 'Date'}</th>
          <th>${ar ? 'دخول' : 'In'}</th>
          <th>${ar ? 'خروج' : 'Out'}</th>
          <th>${ar ? 'تأخير' : 'Late'}</th>
        </tr>
        ${att.map(a => `
          <tr>
            <td>${a.date}</td>
            <td>${a.check_in || '-'}</td>
            <td>${a.check_out || '-'}</td>
            <td>
              ${a.late_minutes > 0
                ? `<span class="badge badge-yellow">${a.late_minutes}${ar ? 'د' : 'm'}</span>`
                : '<span class="badge badge-green">✓</span>'}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

async function loadEmpMonthlyReport() {
  const user = _ensureCurrentUser();
  if (!user) return;

  const pm = getPayrollMonth();
  const ar = currentLang === 'ar';
  const today = todayStr();

  const [att, sales, todaySales] = await Promise.all([
    dbGet('attendance', `?employee_id=eq.${user.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
    dbGet('sales', `?employee_id=eq.${user.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
    dbGet('sales', `?employee_id=eq.${user.id}&date=eq.${today}&select=*`).catch(() => [])
  ]);

  const salesTotal = _sumSalesRows(sales);
  const todaySalesTotal = _sumSalesRows(todaySales);
  const absentTotal = _calcAbsentDays(att || [], pm);

  const el = document.getElementById('monthly-report-emp');
  if (!el) return;

  const rows = currentLang === 'ar'
    ? [
        ['أيام الحضور', (att || []).length + ' أيام', 'var(--green)'],
        ['أيام الغياب', absentTotal + ' يوم', 'var(--red)'],
        ['إجمالي المبيعات', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'],
        ['مبيعات اليوم', 'EGP ' + todaySalesTotal.toLocaleString(), 'var(--blue)'],
        ['عدد المعاملات', (sales || []).length, 'var(--text)']
      ]
    : [
        ['Attendance', (att || []).length + ' days', 'var(--green)'],
        ['Absent Days', absentTotal + ' days', 'var(--red)'],
        ['Total Sales', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'],
        ['Today Sales', 'EGP ' + todaySalesTotal.toLocaleString(), 'var(--blue)'],
        ['Transactions', (sales || []).length, 'var(--text)']
      ];

  el.innerHTML =
    `<div style="font-size:11px;color:var(--muted);margin-bottom:10px">${pm.label}</div>` +
    rows.map(([l, v, c]) => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--muted)">${l}</span>
        <span style="font-size:13px;font-weight:700;color:${c}">${v}</span>
      </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════════
// CAMERA HELPERS
// ═══════════════════════════════════════════════════════════
function _freezePageScroll() {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  document.body.dataset.scrollY = String(scrollY);

  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';

  _lockBodyScroll();
}

function _restorePageScroll() {
  const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);

  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';

  delete document.body.dataset.scrollY;

  _unlockBodyScroll();
  window.scrollTo(0, scrollY);
}

function _showCameraModal() {
  const modal = document.getElementById('camera-modal');
  if (!modal) return;

  modal.style.display = 'block';
  modal.classList.add('open');
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';
}

function _hideCameraModal() {
  const modal = document.getElementById('camera-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.style.display = 'none';
}

function _closeSelfieModalSafe() {
  const modal = document.getElementById('selfie-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }

  if (typeof closeModal === 'function') {
    try { closeModal('selfie-modal'); } catch (_) {}
  }
}

// ═══════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════
async function openCamera() {
  const ar = currentLang === 'ar';

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notify(ar ? '❌ الكاميرا غير مدعومة على هذا الجهاز' : '❌ Camera not supported on this device', 'error');
      return;
    }

    const savedLocation = capturedLocation;
    capturedPhoto = null;

    _stopVideoStream();
    _clearCameraVisualState();

    capturedLocation = savedLocation;

    const constraints = {
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    videoStream = await navigator.mediaDevices.getUserMedia(constraints);

    const video = document.getElementById('video');
    if (!video) {
      notify(ar ? '❌ عنصر الكاميرا غير موجود' : '❌ Camera element not found', 'error');
      _stopVideoStream();
      return;
    }

    _showCameraModal();
    _freezePageScroll();

    video.srcObject = videoStream;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('muted', 'true');
    video.muted = true;

    video.style.display = 'block';
    video.style.opacity = '1';
    video.style.visibility = 'visible';
    video.style.background = '#000';
    video.style.filter = 'none';
    video.style.objectFit = 'cover';
    video.style.transform = 'scaleX(-1)';

    await new Promise((resolve) => {
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      if (video.readyState >= 2) return finish();

      video.onloadedmetadata = finish;
      setTimeout(finish, 1200);
    });

    await video.play().catch(() => {});
  } catch (e) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      const video = document.getElementById('video');
      if (!video) {
        notify(ar ? '❌ عنصر الكاميرا غير موجود' : '❌ Camera element not found', 'error');
        _stopVideoStream();
        return;
      }

      _showCameraModal();
      _freezePageScroll();

      video.srcObject = videoStream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');
      video.muted = true;

      video.style.display = 'block';
      video.style.opacity = '1';
      video.style.visibility = 'visible';
      video.style.background = '#000';
      video.style.filter = 'none';
      video.style.objectFit = 'cover';
      video.style.transform = 'scaleX(-1)';

      await new Promise((resolve) => {
        let done = false;

        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };

        if (video.readyState >= 2) return finish();

        video.onloadedmetadata = finish;
        setTimeout(finish, 1200);
      });

      await video.play().catch(() => {});
    } catch (e2) {
      _restorePageScroll();
      _openCameraFallback(ar);
    }
  }
}

function _openCameraFallback(ar) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'user';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.onchange = () => {
    const file = input.files && input.files[0];
    document.body.removeChild(input);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      capturedPhoto = ev.target.result;

      const preview = document.getElementById('selfie-preview-img');
      if (preview) {
        preview.src = capturedPhoto;
        preview.style.display = 'block';
      }

      const modal = document.getElementById('selfie-modal');
      if (modal) {
        modal.style.display = 'block';
        modal.classList.add('open');
      }

      const confirmBtn = document.getElementById('confirm-attend-btn');
      if (confirmBtn) confirmBtn.disabled = false;

      const locStatusEl = document.getElementById('location-status');
      if (locStatusEl) {
        if (capturedLocation) {
          locStatusEl.innerHTML =
            `✅ ${ar ? 'تم تحديد الموقع' : 'Location found'} — ` +
            `<a href="https://maps.google.com/?q=${capturedLocation.lat},${capturedLocation.lng}" target="_blank" style="color:var(--green)">${ar ? 'عرض' : 'View'}</a>`;
        } else {
          locStatusEl.textContent = ar ? '⚠️ لم يتم تحديد الموقع' : '⚠️ Location unavailable';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  input.click();
}

function closeCamera() {
  _stopVideoStream();

  const video = document.getElementById('video');
  if (video) {
    try { video.pause(); } catch (_) {}
    try { video.srcObject = null; } catch (_) {}
    try { video.removeAttribute('src'); } catch (_) {}
  }

  _hideCameraModal();
  _restorePageScroll();
}

function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ar = currentLang === 'ar';

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    notify(ar ? '❌ تعذر التقاط الصورة، حاول مرة أخرى' : '❌ Failed to capture photo, try again', 'error');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    notify(ar ? '❌ تعذر تجهيز الصورة' : '❌ Failed to prepare image', 'error');
    return;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);

  closeCamera();

  const preview = document.getElementById('selfie-preview-img');
  if (preview) {
    preview.src = capturedPhoto;
    preview.style.display = 'block';
  }

  const modal = document.getElementById('selfie-modal');
  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('open');
  }

  const confirmBtn = document.getElementById('confirm-attend-btn');
  if (confirmBtn) confirmBtn.disabled = false;

  const locStatusEl = document.getElementById('location-status');
  if (locStatusEl) {
    if (capturedLocation) {
      locStatusEl.innerHTML =
        `✅ ${ar ? 'تم تحديد الموقع' : 'Location found'} — ` +
        `<a href="https://maps.google.com/?q=${capturedLocation.lat},${capturedLocation.lng}" target="_blank" style="color:var(--green)">${ar ? 'عرض' : 'View'}</a>`;
    } else {
      locStatusEl.textContent = ar ? '⚠️ لم يتم تحديد الموقع' : '⚠️ Location unavailable';
    }
  }
}

async function confirmAttendance() {
  const user = _ensureCurrentUser();
  if (!user || isConfirmingAttendance) return;

  const ar = currentLang === 'ar';

  if (!capturedPhoto) {
    notify(ar ? '❌ لازم تلتقط صورة أولاً' : '❌ Please capture a photo first', 'error');
    return;
  }

  const confirmBtn = document.getElementById('confirm-attend-btn');

  try {
    isConfirmingAttendance = true;
    if (confirmBtn) confirmBtn.disabled = true;

    const today = todayStr();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    const todayAtt = await dbGet(
      'attendance',
      `?employee_id=eq.${user.id}&date=eq.${today}&select=*`
    ).catch(() => []);

    const freshRecord = (todayAtt && todayAtt.length > 0) ? todayAtt[0] : null;
    const effectiveMode = (freshRecord && freshRecord.check_in && !freshRecord.check_out) ? 'out' : 'in';

    if (effectiveMode === 'in') {
      if (freshRecord && freshRecord.check_in && !freshRecord.check_out) {
        notify(ar ? 'تم تسجيل الدخول بالفعل اليوم' : 'Already checked in today', 'info');
        _closeSelfieModalSafe();
        loadEmpData();
        return;
      }

      if (freshRecord && freshRecord.check_in && freshRecord.check_out) {
        notify(ar ? 'تم إنهاء حضور اليوم بالفعل' : 'Attendance already completed today', 'info');
        _closeSelfieModalSafe();
        loadEmpData();
        return;
      }

      const dow = now.getDay();
      const { start: shiftStart } = _getShiftTimes(user.shift || 'morning', dow);

      const [wh, wm] = shiftStart.split(':').map(Number);
      const [ah, am] = timeStr.split(':').map(Number);
      const lateMin = Math.max(0, (ah * 60 + am) - (wh * 60 + wm));

      await dbPost('attendance', {
        employee_id: user.id,
        date: today,
        check_in: timeStr,
        late_minutes: lateMin,
        selfie_in: capturedPhoto
      });

      await new Promise(res => setTimeout(res, 400));

      const fresh = await dbGet(
        'attendance',
        `?employee_id=eq.${user.id}&date=eq.${today}&select=*`
      ).catch(() => []);

      updateAttendBtn(fresh && fresh.length ? fresh[0] : null);
      notify(ar ? 'تم تسجيل الدخول ✅' : 'Checked in ✅', 'success');
    } else {
      if (!freshRecord) {
        notify(ar ? '❌ لا يوجد تسجيل دخول اليوم' : '❌ No check-in found for today', 'error');
        return;
      }

      if (freshRecord.check_out) {
        notify(ar ? 'تم تسجيل الخروج بالفعل' : 'Already checked out', 'info');
        _closeSelfieModalSafe();
        loadEmpData();
        return;
      }

      const hasDisplay = await _hasTodayDisplayPhotos(user.id, today);
      if (!hasDisplay) {
        notify(
          ar
            ? '❌ لازم ترفع صور الديسبلاي قبل تسجيل الخروج'
            : '❌ You must upload display photos before check-out',
          'error'
        );

        _closeSelfieModalSafe();

        if (typeof empTab === 'function') {
          empTab('display');
        }
        return;
      }

      await _attendancePatch(
        'attendance',
        {
          check_out: timeStr,
          selfie_out: capturedPhoto
        },
        `?employee_id=eq.${user.id}&date=eq.${today}`
      );

      await new Promise(res => setTimeout(res, 400));

      const fresh = await dbGet(
        'attendance',
        `?employee_id=eq.${user.id}&date=eq.${today}&select=*`
      ).catch(() => []);

      updateAttendBtn(fresh && fresh.length ? fresh[0] : null);
      notify(ar ? 'تم تسجيل الخروج ✅' : 'Checked out ✅', 'success');
    }

    _closeSelfieModalSafe();
    _resetAttendanceCaptureState();
    loadEmpData();
  } catch (e) {
    console.error('[confirmAttendance]', e);
    notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  } finally {
    isConfirmingAttendance = false;
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

// ─── Restore session helpers on page return ──────────────────────────────────
window.addEventListener('pageshow', () => {
  _ensureCurrentUser();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    _ensureCurrentUser();
  }
});

// expose globals explicitly for inline HTML handlers if needed
window.loadEmpData = loadEmpData;
window.updateAttendBtn = updateAttendBtn;
window.handleAttendClick = handleAttendClick;
window.confirmAttendance = confirmAttendance;
window.openCamera = openCamera;
window.closeCamera = closeCamera;
window.capturePhoto = capturePhoto;
window.renderAttendHistory = renderAttendHistory;
window.loadEmpWarnings = loadEmpWarnings;
window.loadEmpDailyLog = loadEmpDailyLog;
window.loadEmpMonthlyReport = loadEmpMonthlyReport;
