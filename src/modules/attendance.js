// ═══════════════════════════════════════════════════════════
// modules/attendance.js — Attendance, selfie, camera, daily log
// Provides globals: loadEmpData, updateAttendBtn, handleAttendClick,
// confirmAttendance, openCamera, closeCamera, capturePhoto,
// renderAttendHistory, loadEmpWarnings, loadEmpDailyLog, loadEmpMonthlyReport
// ═══════════════════════════════════════════════════════════

let attendCountdownTimer = null;
let isConfirmingAttendance = false;

// Helper: get shift time strings (used both for display and for late calc)
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

// Helper: ensure shift-info element exists on the home screen
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

  const img = document.getElementById('selfie-preview-img');
  if (img) img.src = '';

  const locStatusEl = document.getElementById('location-status');
  if (locStatusEl) {
    locStatusEl.textContent = currentLang === 'ar' ? '📍 جاري تحديد الموقع...' : '📍 Getting location...';
  }
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
  if (!currentUser) return;

  try {
    const today = todayStr();
    const pm = getPayrollMonth();

    // ── Today's attendance ──
    const todayAtt = await dbGet(
      'attendance',
      `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`
    ).catch(() => []);

    updateAttendBtn(todayAtt && todayAtt.length > 0 ? todayAtt[0] : null);

    // ── Month's attendance & stats ──
    const monthAtt = await dbGet(
      'attendance',
      `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`
    ).catch(() => []);

    const attCountEl = document.getElementById('emp-attend-count');
    if (attCountEl) attCountEl.textContent = (monthAtt || []).length;

    // ── Month's sales ──
    const monthSales = await dbGet(
      'sales',
      `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`
    ).catch(() => []);

    let salesTotal = 0;
    (monthSales || []).forEach(s => {
      salesTotal += (s.total_amount || 0);
    });

    const salesEl = document.getElementById('emp-sales-total');
    if (salesEl) salesEl.textContent = 'EGP ' + fmtEGP(salesTotal);

    // ── Today's sales ──
    const todaySales = await dbGet(
      'sales',
      `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`
    ).catch(() => []);

    let todaySalesTotal = 0;
    (todaySales || []).forEach(s => {
      todaySalesTotal += (s.total_amount || 0);
    });

    const todaySalesEl = document.getElementById('emp-today-sales');
    if (todaySalesEl) todaySalesEl.textContent = 'EGP ' + fmtEGP(todaySalesTotal);

    // Store sales data for details view
    window._monthSalesData = monthSales || [];
    window._todaySalesData = todaySales || [];

    // ── Target & K Model ──
    const mon = pm.start.substring(0, 7);
    const targetRes = await dbGet(
      'targets',
      `?employee_id=eq.${currentUser.id}&month=eq.${mon}&select=*`
    ).catch(() => []);

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

    // ── Absent days ──
    const startD = new Date(pm.start);
    const endD = new Date(Math.min(new Date(pm.end), new Date()));
    let absent = 0;

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const currentLoopDate = new Date(d);
      if (currentLoopDate.getDay() === currentUser.day_off) continue;

      const ds = fmtDate(currentLoopDate);
      if (!(monthAtt || []).find(a => a.date === ds)) absent++;
    }

    const absEl = document.getElementById('emp-absent-count');
    if (absEl) absEl.textContent = absent;

    // ── Charts ──
    if (typeof renderDailySalesGrid === 'function') renderDailySalesGrid(monthSales, pm);
    if (typeof renderEmpPerfChart === 'function') renderEmpPerfChart(monthSales, pm);

    // ── Recent attendance + warnings + today sales ──
    const recent = await dbGet(
      'attendance',
      `?employee_id=eq.${currentUser.id}&order=date.desc&limit=7&select=*`
    ).catch(() => []);

    renderAttendHistory(recent);
    loadEmpWarnings();

    if (typeof loadTodaySales === 'function') loadTodaySales();

    // ── SHIFT LABEL ON HOME ──
    const shiftInfoEl = _ensureShiftInfoEl();
    if (shiftInfoEl) {
      const ar = currentLang === 'ar';
      const dow = new Date().getDay();
      const shift = currentUser.shift || 'morning';
      const { labelAr, labelEn } = _getShiftTimes(shift, dow);
      shiftInfoEl.textContent = ar ? labelAr : labelEn;
    }
  } catch (e) {
    console.error('[loadEmpData]', e);
  }
}

function updateAttendBtn(record) {
  const btn = document.getElementById('attend-btn');
  const status = document.getElementById('attend-status');
  if (!btn) return;

  const ar = currentLang === 'ar';
  const iconEl = btn.querySelector('.attend-icon');
  const labelEl = btn.querySelector('.attend-label');
  const countdownEl = _ensureAttendCountdownEl();

  if (countdownEl) countdownEl.style.display = 'none';

  // always keep click available through HTML onclick
  btn.dataset.attState = 'none';

  if (record && record.check_in && !record.check_out) {
    btn.classList.add('checked-in');
    btn.dataset.attState = 'checked-in';

    if (iconEl) iconEl.textContent = '🔴';
    if (labelEl) labelEl.textContent = ar ? 'تسجيل خروج' : 'Check Out';

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
  if (labelEl) labelEl.textContent = ar ? 'تسجيل دخول' : 'Check In';
  if (status) status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';

  stopAttendanceCountdown();
}

async function handleAttendClick() {
  const btn = document.getElementById('attend-btn');
  if (!btn || !currentUser) return;

  const state = btn.dataset.attState || 'ready';
  if (state === 'done') return;

  attendMode = btn.classList.contains('checked-in') ? 'out' : 'in';

  const ar = currentLang === 'ar';
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

  // ✅ IMPORTANT FIX:
  // If user is checking out, validate display photos BEFORE opening camera
  if (attendMode === 'out') {
    const today = todayStr();
    const hasDisplay = await _hasTodayDisplayPhotos(currentUser.id, today);

    if (!hasDisplay) {
      notify(
        ar
          ? '❌ لازم ترفع صور الديسبلاي قبل تسجيل الخروج'
          : '❌ You must upload display photos before check-out',
        'error'
      );

      if (typeof empTab === 'function') {
        empTab('display');
      }

      return;
    }
  }

  if (!navigator.geolocation) {
    notify(ar ? '⚠️ جهازك لا يدعم تحديد الموقع' : '⚠️ Geolocation not supported', 'error');
    return;
  }

  _resetAttendanceCaptureState();

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
          ar ? '❌ افتح الإعدادات ← Safari ← الموقع وافعّله' : '❌ Settings → Safari → Location → Allow',
          'error'
        );
      } else {
        notify(ar ? '❌ تعذر تحديد الموقع، حاول مرة أخرى' : '❌ Location failed, try again', 'error');
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
  try {
    const warns = await dbGet(
      'warnings',
      `?employee_id=eq.${currentUser.id}&order=created_at.desc&limit=5&select=*`
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
  if (!currentUser) return;

  const pm = getPayrollMonth();
  const ar = currentLang === 'ar';

  const att = await dbGet(
    'attendance',
    `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`
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
  if (!currentUser) return;

  const pm = getPayrollMonth();
  const ar = currentLang === 'ar';

  const [att, sales] = await Promise.all([
    dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
    dbGet('sales', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => [])
  ]);

  let salesTotal = 0;
  (sales || []).forEach(s => salesTotal += (s.total_amount || 0));

  let lateTotal = 0;
  (att || []).forEach(a => lateTotal += (a.late_minutes || 0));

  const el = document.getElementById('monthly-report-emp');
  if (!el) return;

  const rows = ar
    ? [
        ['أيام الحضور', (att || []).length + ' أيام', 'var(--green)'],
        ['دقائق التأخير', lateTotal + ' د', 'var(--yellow)'],
        ['إجمالي المبيعات', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'],
        ['عدد المعاملات', (sales || []).length, 'var(--text)']
      ]
    : [
        ['Attendance', (att || []).length + ' days', 'var(--green)'],
        ['Late', lateTotal + 'm', 'var(--yellow)'],
        ['Total Sales', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'],
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
// CAMERA
// ═══════════════════════════════════════════════════════════
async function openCamera() {
  const ar = currentLang === 'ar';

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notify(ar ? '❌ الكاميرا غير مدعومة على هذا الجهاز' : '❌ Camera not supported on this device', 'error');
      return;
    }

    _resetAttendanceCaptureState();

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
      return;
    }

    video.srcObject = videoStream;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.muted = true;

    await video.play().catch(() => {});

    const modal = document.getElementById('camera-modal');
    if (modal) modal.classList.add('open');
  } catch (e) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      const video = document.getElementById('video');
      if (!video) {
        notify(ar ? '❌ عنصر الكاميرا غير موجود' : '❌ Camera element not found', 'error');
        return;
      }

      video.srcObject = videoStream;
      video.setAttribute('playsinline', '');
      video.muted = true;

      await video.play().catch(() => {});

      const modal = document.getElementById('camera-modal');
      if (modal) modal.classList.add('open');
    } catch (e2) {
      notify((ar ? '❌ خطأ في الكاميرا: ' : '❌ Camera error: ') + (e2.message || ''), 'error');
    }
  }
}

function closeCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }

  const video = document.getElementById('video');
  if (video) video.srcObject = null;

  const m = document.getElementById('camera-modal');
  if (m) m.classList.remove('open');
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
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedPhoto = canvas.toDataURL('image/jpeg', 0.65);

  closeCamera();

  const preview = document.getElementById('selfie-preview-img');
  if (preview) preview.src = capturedPhoto;

  const modal = document.getElementById('selfie-modal');
  if (modal) modal.classList.add('open');

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
  if (!currentUser || isConfirmingAttendance) return;

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
      `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`
    ).catch(() => []);

    if (attendMode === 'in') {
      if (todayAtt && todayAtt.length > 0) {
        const existing = todayAtt[0];

        if (existing.check_in && !existing.check_out) {
          notify(ar ? 'تم تسجيل الدخول بالفعل اليوم' : 'Already checked in today', 'info');
          closeModal('selfie-modal');
          loadEmpData();
          return;
        }

        if (existing.check_in && existing.check_out) {
          notify(ar ? 'تم إنهاء حضور اليوم بالفعل' : 'Attendance already completed today', 'info');
          closeModal('selfie-modal');
          loadEmpData();
          return;
        }
      }

      const dow = now.getDay();
      const { start: shiftStart } = _getShiftTimes(currentUser.shift || 'morning', dow);

      const [wh, wm] = shiftStart.split(':').map(Number);
      const [ah, am] = timeStr.split(':').map(Number);
      const lateMin = Math.max(0, (ah * 60 + am) - (wh * 60 + wm));

      await dbPost('attendance', {
        employee_id: currentUser.id,
        date: today,
        check_in: timeStr,
        late_minutes: lateMin,
        selfie_in: capturedPhoto,
        location_lat: capturedLocation?.lat || null,
        location_lng: capturedLocation?.lng || null
      });

      notify(ar ? 'تم تسجيل الدخول ✅' : 'Checked in ✅', 'success');
    } else {
      if (!todayAtt || todayAtt.length === 0) {
        notify(ar ? '❌ لا يوجد تسجيل دخول اليوم' : '❌ No check-in found for today', 'error');
        return;
      }

      const record = todayAtt[0];

      if (record.check_out) {
        notify(ar ? 'تم تسجيل الخروج بالفعل' : 'Already checked out', 'info');
        closeModal('selfie-modal');
        loadEmpData();
        return;
      }

      const hasDisplay = await _hasTodayDisplayPhotos(currentUser.id, today);
      if (!hasDisplay) {
        notify(
          ar
            ? '❌ لازم ترفع صور الديسبلاي قبل تسجيل الخروج'
            : '❌ You must upload display photos before check-out',
          'error'
        );

        closeModal('selfie-modal');

        if (typeof empTab === 'function') {
          empTab('display');
        }
        return;
      }

      await dbPatch(
        'attendance',
        {
          check_out: timeStr,
          selfie_out: capturedPhoto
        },
        `?employee_id=eq.${currentUser.id}&date=eq.${today}`
      );

      notify(ar ? 'تم تسجيل الخروج ✅' : 'Checked out ✅', 'success');
    }

    closeModal('selfie-modal');
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

// ── RELOAD DATA WHEN APP RETURNS TO FOREGROUND ──
function _onAppResume() {
  if (!window.currentUser) return;
  const role = (window.currentUser.role || '').toLowerCase().replace(/\s+/g, '_');
  if (role === 'employee') {
    // Invalidate cache so we fetch fresh data from server
    if (typeof window.invalidateCache === 'function') {
      window.invalidateCache('attendance');
      window.invalidateCache('sales');
    }
    console.log('[attendance] App resumed — refreshing employee data');
    loadEmpData();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') _onAppResume();
});

window.addEventListener('pageshow', (e) => {
  if (e.persisted) _onAppResume();
});

// Also handle focus event (user switches tabs or returns to PWA)
window.addEventListener('focus', () => {
  // Only if we've been away for more than 5 seconds
  if (!window._lastBlurTime) return;
  const away = Date.now() - window._lastBlurTime;
  if (away > 5000) _onAppResume();
});

window.addEventListener('blur', () => {
  window._lastBlurTime = Date.now();
});
