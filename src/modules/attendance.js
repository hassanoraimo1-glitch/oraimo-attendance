// ═══════════════════════════════════════════════════════════
// modules/attendance.js — Attendance, selfie, camera, daily log
// Provides globals:
//   loadEmpData, updateAttendBtn, handleAttendClick, confirmAttendance,
//   openCamera, closeCamera, capturePhoto, renderAttendHistory,
//   loadEmpWarnings, loadEmpDailyLog, loadEmpMonthlyReport
// ═══════════════════════════════════════════════════════════

let attendCountdownTimer = null;
let attendanceSubmitLock = false;

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function _attId(id) {
  return document.getElementById(id);
}

function _attSafeNotify(msg, type = 'info') {
  if (typeof notify === 'function') notify(msg, type);
  else console[type === 'error' ? 'error' : 'log'](msg);
}

function _attSafeCloseModal(id) {
  try {
    if (typeof closeModal === 'function') {
      closeModal(id);
      return;
    }
  } catch (_) {}

  const el = _attId(id);
  if (el) el.classList.remove('open');
}

function _attShowDisplayTab() {
  try {
    if (typeof empTab === 'function') {
      empTab('display');
      return true;
    }
  } catch (_) {}
  return false;
}

function _attResetCameraPreview() {
  const img = _attId('selfie-preview-img');
  if (img) img.src = '';

  const locStatusEl = _attId('location-status');
  if (locStatusEl) locStatusEl.textContent = '';

  const confirmBtn = _attId('confirm-attend-btn');
  if (confirmBtn) confirmBtn.disabled = true;
}

function _attResetCaptureState() {
  capturedPhoto = null;
  capturedLocation = null;
  _attResetCameraPreview();
}

function _attSetAttendBtnBusy(busy) {
  const btn = _attId('attend-btn');
  if (!btn) return;

  btn.disabled = !!busy;
  btn.style.pointerEvents = busy ? 'none' : '';

  const labelEl = btn.querySelector('.attend-label');
  const ar = currentLang === 'ar';

  if (busy && labelEl) {
    btn.dataset.oldLabel = labelEl.textContent || '';
    labelEl.textContent = ar ? 'جارٍ التنفيذ...' : 'Processing...';
  } else if (!busy && labelEl && btn.dataset.oldLabel) {
    labelEl.textContent = btn.dataset.oldLabel;
    delete btn.dataset.oldLabel;
  }
}

function _attBindAttendBtn() {
  const btn = _attId('attend-btn');
  if (!btn) return;
  btn.onclick = handleAttendClick;
}

function _formatHHMMSS(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

async function _getApprovedDelayMinutesForToday(employeeId, dateStr) {
  // Hook آمن:
  // لو عندك جدول permissions / late_permissions / excuses
  // وتحب نحسب منه لاحقًا، يمكنك تعديل هذه الدالة فقط.
  // حاليًا سترجع 0 حتى لا نكسر أي شيء.
  try {
    if (!employeeId || !dateStr) return 0;

    // لو عندك دالة جاهزة في مكان آخر بالمشروع
    if (typeof window.getApprovedDelayMinutesForToday === 'function') {
      const v = await window.getApprovedDelayMinutesForToday(employeeId, dateStr);
      return Number(v || 0);
    }

    return 0;
  } catch (e) {
    console.warn('[attendance][_getApprovedDelayMinutesForToday]', e);
    return 0;
  }
}

async function _hasTodayDisplayPhotos(employeeId, today) {
  try {
    const displayRows = await dbGet(
      'display_photos',
      `?employee_id=eq.${employeeId}&photo_date=eq.${today}&select=photo1,photo2,photo3&limit=1`
    ).catch(() => []);

    const display = displayRows && displayRows.length > 0 ? displayRows[0] : null;
    return !!(display && (display.photo1 || display.photo2 || display.photo3));
  } catch (e) {
    console.warn('[attendance][_hasTodayDisplayPhotos]', e);
    return false;
  }
}

function _getTodayDateFromTimeString(timeStr) {
  const today = todayStr();
  const dt = new Date(`${today}T${timeStr}:00`);
  return isNaN(dt.getTime()) ? null : dt;
}

// Helper: get shift time strings (used both for display and for late calc)
function _getShiftTimes(shift, dayOfWeek) {
  const isThurFri = (dayOfWeek === 4 || dayOfWeek === 5);

  if (shift === 'evening') {
    return isThurFri
      ? { start: '15:00', end: '23:00', labelAr: '🌙 مسائي: 3م – 11م', labelEn: '🌙 Evening: 3PM–11PM' }
      : { start: '14:00', end: '22:00', labelAr: '🌙 مسائي: 2م – 10م', labelEn: '🌙 Evening: 2PM–10PM' };
  }

  return { start: '10:00', end: '18:00', labelAr: '🌅 صباحي: 10ص – 6م', labelEn: '🌅 Morning: 10AM–6PM' };
}

// Helper: ensure shift-info element exists on the home screen.
// Injects it above the attend button if missing.
function _ensureShiftInfoEl() {
  let el = _attId('emp-shift-info');
  if (el) return el;

  const attendBtn = _attId('attend-btn');
  if (!attendBtn || !attendBtn.parentNode) return null;

  el = document.createElement('div');
  el.id = 'emp-shift-info';
  el.style.cssText =
    'font-size:12px;font-weight:700;color:var(--green);text-align:center;padding:8px 12px;margin:0 0 12px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.2);border-radius:12px;direction:rtl';

  attendBtn.parentNode.insertBefore(el, attendBtn);
  return el;
}

function _ensureAttendCountdownEl() {
  let el = _attId('emp-attend-countdown');
  if (el) return el;

  const status = _attId('attend-status');
  if (!status || !status.parentNode) return null;

  el = document.createElement('div');
  el.id = 'emp-attend-countdown';
  el.style.cssText =
    'font-size:18px;font-weight:800;color:var(--yellow);text-align:center;margin-top:6px;direction:ltr;display:none';

  status.insertAdjacentElement('afterend', el);
  return el;
}

async function startAttendanceCountdown(checkInTime) {
  const el = _ensureAttendCountdownEl();
  if (!el || !checkInTime || !currentUser) return;

  if (attendCountdownTimer) {
    clearInterval(attendCountdownTimer);
    attendCountdownTimer = null;
  }

  const checkInDate = _getTodayDateFromTimeString(checkInTime);
  if (!checkInDate) {
    el.style.display = 'none';
    return;
  }

  // 8 ساعات عمل - وقت إذن التأخير المعتمد (إن وجد)
  const approvedDelayMinutes = await _getApprovedDelayMinutesForToday(currentUser.id, todayStr());
  const workMinutes = Math.max(0, (8 * 60) - Number(approvedDelayMinutes || 0));
  const endTime = new Date(checkInDate.getTime() + (workMinutes * 60 * 1000));

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
    el.textContent = _formatHHMMSS(totalSeconds);
  }

  render();
  attendCountdownTimer = setInterval(render, 1000);
}

function stopAttendanceCountdown() {
  if (attendCountdownTimer) {
    clearInterval(attendCountdownTimer);
    attendCountdownTimer = null;
  }

  const el = _attId('emp-attend-countdown');
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

    const attCountEl = _attId('emp-attend-count');
    if (attCountEl) attCountEl.textContent = (monthAtt || []).length;

    let lateTotal = 0;
    (monthAtt || []).forEach(a => { lateTotal += (a.late_minutes || 0); });

    const lateEl = _attId('emp-late-total');
    if (lateEl) lateEl.textContent = lateTotal + (currentLang === 'ar' ? ' د' : 'm');

    // ── Month's sales ──
    const monthSales = await dbGet(
      'sales',
      `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`
    ).catch(() => []);

    let salesTotal = 0;
    (monthSales || []).forEach(s => { salesTotal += Number(s.total_amount || 0); });

    const salesEl = _attId('emp-sales-total');
    if (salesEl) salesEl.textContent = 'EGP ' + fmtEGP(salesTotal);

    // ── Target & K Model ──
    const mon = pm.start.substring(0, 7);
    const targetRes = await dbGet(
      'targets',
      `?employee_id=eq.${currentUser.id}&month=eq.${mon}&select=*`
    ).catch(() => []);

    const target = targetRes && targetRes.length > 0 ? Number(targetRes[0].amount || 0) : 0;
    const kmodel = targetRes && targetRes.length > 0 ? Number(targetRes[0].kmodel_amount || 0) : 0;

    const achEl = _attId('target-achieved');
    if (achEl) achEl.textContent = 'EGP ' + fmtEGP(salesTotal);

    const goalEl = _attId('target-goal');
    if (goalEl) goalEl.textContent = (currentLang === 'ar' ? 'التارجت: ' : 'Target: ') + 'EGP ' + fmtEGP(target);

    const pct = target > 0 ? Math.min(100, Math.round((salesTotal / target) * 100)) : 0;

    const fillEl = _attId('target-fill');
    if (fillEl) fillEl.style.width = pct + '%';

    const pctEl = _attId('target-pct');
    if (pctEl) pctEl.textContent = pct + '%';

    const kr = _attId('kmodel-row');
    if (kmodel > 0 && kr) {
      kr.style.display = 'block';
      const kpct = Math.min(100, Math.round((salesTotal / kmodel) * 100));

      const kf = _attId('kmodel-fill');
      if (kf) kf.style.width = kpct + '%';

      const kp = _attId('kmodel-pct');
      if (kp) kp.textContent = kpct + '%';
    } else if (kr) {
      kr.style.display = 'none';
    }

    // ── Absent days ──
    const startD = new Date(pm.start);
    const endD = new Date(Math.min(new Date(pm.end), new Date()));
    let absent = 0;

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === currentUser.day_off) continue;
      const ds = fmtDate(new Date(d));
      if (!(monthAtt || []).find(a => a.date === ds)) absent++;
    }

    const absEl = _attId('emp-absent-count');
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

    _attBindAttendBtn();
  } catch (e) {
    console.error('[loadEmpData]', e);
  }
}

function updateAttendBtn(record) {
  const btn = _attId('attend-btn');
  const status = _attId('attend-status');
  if (!btn) return;

  const ar = currentLang === 'ar';
  const iconEl = btn.querySelector('.attend-icon');
  const labelEl = btn.querySelector('.attend-label');
  const countdownEl = _ensureAttendCountdownEl();

  _attBindAttendBtn();

  if (countdownEl) countdownEl.style.display = 'none';

  btn.disabled = false;
  btn.style.pointerEvents = '';

  if (record && record.check_in && !record.check_out) {
    btn.classList.add('checked-in');

    if (iconEl) iconEl.textContent = '🔴';
    if (labelEl) labelEl.textContent = ar ? 'تسجيل خروج' : 'Check Out';

    if (status) {
      status.textContent =
        `${ar ? 'دخل الساعة' : 'In at'} ${record.check_in}` +
        (record.late_minutes > 0
          ? (ar ? ` (تأخر ${record.late_minutes} د)` : ` (${record.late_minutes}m late)`)
          : '');
    }

    if (countdownEl) countdownEl.style.display = 'block';
    startAttendanceCountdown(record.check_in);

  } else if (record && record.check_out) {
    btn.classList.remove('checked-in');

    if (iconEl) iconEl.textContent = '✅';
    if (labelEl) labelEl.textContent = ar ? 'تم' : 'Done';

    btn.onclick = null;
    btn.disabled = true;
    btn.style.pointerEvents = 'none';

    if (status) {
      status.textContent = `${ar ? 'دخول' : 'In'}: ${record.check_in} – ${ar ? 'خروج' : 'Out'}: ${record.check_out}`;
    }

    stopAttendanceCountdown();
  } else {
    btn.classList.remove('checked-in');

    if (iconEl) iconEl.textContent = '🟢';
    if (labelEl) labelEl.textContent = ar ? 'تسجيل دخول' : 'Check In';

    if (status) status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';

    stopAttendanceCountdown();
  }
}

async function handleAttendClick() {
  const btn = _attId('attend-btn');
  if (!btn || !currentUser) return;

  const iconEl = btn.querySelector('.attend-icon');
  if (iconEl && iconEl.textContent === '✅') return;
  if (attendanceSubmitLock) return;

  const ar = currentLang === 'ar';
  const today = todayStr();

  attendMode = btn.classList.contains('checked-in') ? 'out' : 'in';

  // مهم جدًا:
  // عند تسجيل الخروج، نتحقق من صور الديسبلاي أولًا قبل أي كاميرا أو GPS
  if (attendMode === 'out') {
    try {
      const todayAtt = await dbGet(
        'attendance',
        `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`
      ).catch(() => []);

      const todayRecord = todayAtt && todayAtt.length > 0 ? todayAtt[0] : null;

      if (!todayRecord || !todayRecord.check_in) {
        _attSafeNotify(ar ? '❌ لا يوجد تسجيل دخول اليوم' : '❌ No check-in found for today', 'error');
        await loadEmpData();
        return;
      }

      if (todayRecord.check_out) {
        _attSafeNotify(ar ? '✅ تم تسجيل الخروج بالفعل' : '✅ Already checked out', 'info');
        updateAttendBtn(todayRecord);
        return;
      }

      const hasDisplay = await _hasTodayDisplayPhotos(currentUser.id, today);
      if (!hasDisplay) {
        _attSafeNotify(
          ar
            ? '❌ لازم ترفع صور الديسبلاي قبل تسجيل الخروج'
            : '❌ You must upload display photos before check-out',
          'error'
        );

        _attSafeCloseModal('selfie-modal');
        closeCamera();
        _attShowDisplayTab();
        return;
      }
    } catch (e) {
      console.error('[handleAttendClick][checkout-check]', e);
      _attSafeNotify(ar ? 'حدث خطأ أثناء التحقق من الديسبلاي' : 'Error while checking display photos', 'error');
      return;
    }
  }

  const titleEl = _attId('selfie-modal-title');
  const camLabelEl = _attId('camera-label');

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

  _attResetCaptureState();

  if (!navigator.geolocation) {
    _attSafeNotify(ar ? '⚠️ جهازك لا يدعم تحديد الموقع' : '⚠️ Geolocation not supported', 'error');
    return;
  }

  _attSafeNotify(ar ? '📍 جاري تحديد موقعك...' : '📍 Getting your location...', 'info');
  _attSetAttendBtnBusy(true);

  navigator.geolocation.getCurrentPosition(
    async pos => {
      capturedLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      _attSetAttendBtnBusy(false);
      await openCamera();
    },
    err => {
      capturedLocation = null;
      _attSetAttendBtnBusy(false);

      if (err.code === 1) {
        _attSafeNotify(
          ar ? '❌ افتح الإعدادات ← Safari ← الموقع وافعّله' : '❌ Settings → Safari → Location → Allow',
          'error'
        );
      } else {
        _attSafeNotify(
          ar ? '❌ تعذر تحديد الموقع، حاول مرة أخرى' : '❌ Location failed, try again',
          'error'
        );
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function renderAttendHistory(records) {
  const el = _attId('emp-attend-history');
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
          ${r.late_minutes > 0 ? (r.late_minutes + (ar ? ' د تأخير' : 'm late')) : (ar ? 'في الوقت' : 'On time')}
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

    const card = _attId('emp-warnings-card');
    const list = _attId('emp-warnings-list');

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
          <div style="font-size:12px">${w.message}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.warn('[loadEmpWarnings]', e);
  }
}

async function loadEmpDailyLog() {
  const pm = getPayrollMonth();
  const ar = currentLang === 'ar';

  const att = await dbGet(
    'attendance',
    `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`
  ).catch(() => []) || [];

  const el = _attId('emp-daily-log');
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
              ${
                a.late_minutes > 0
                  ? `<span class="badge badge-yellow">${a.late_minutes}${ar ? 'د' : 'm'}</span>`
                  : '<span class="badge badge-green">✓</span>'
              }
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

async function loadEmpMonthlyReport() {
  const pm = getPayrollMonth();
  const ar = currentLang === 'ar';

  const [att, sales] = await Promise.all([
    dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
    dbGet('sales', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => [])
  ]);

  let salesTotal = 0;
  (sales || []).forEach(s => { salesTotal += Number(s.total_amount || 0); });

  let lateTotal = 0;
  (att || []).forEach(a => { lateTotal += (a.late_minutes || 0); });

  const el = _attId('monthly-report-emp');
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
  const modal = _attId('camera-modal');
  const video = _attId('video');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    _attSafeNotify(ar ? '❌ الكاميرا غير مدعومة على هذا الجهاز' : '❌ Camera not supported on this device', 'error');
    return;
  }

  if (!modal || !video) {
    _attSafeNotify(ar ? '❌ عناصر الكاميرا غير موجودة في الصفحة' : '❌ Camera elements are missing from the page', 'error');
    return;
  }

  try {
    closeCamera();

    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (_) {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    video.srcObject = videoStream;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.muted = true;

    // دعم أفضل لشاشة كاملة
    modal.classList.add('open');
    document.body.classList.add('camera-open');

    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.background = '#000';

    await video.play().catch(() => {});
  } catch (e) {
    console.error('[openCamera]', e);
    _attSafeNotify((ar ? '❌ خطأ في الكاميرا: ' : '❌ Camera error: ') + (e.message || ''), 'error');
  }
}

function closeCamera() {
  if (videoStream) {
    try {
      videoStream.getTracks().forEach(t => t.stop());
    } catch (_) {}
    videoStream = null;
  }

  const video = _attId('video');
  if (video) {
    try { video.pause(); } catch (_) {}
    try { video.srcObject = null; } catch (_) {}
  }

  const m = _attId('camera-modal');
  if (m) {
    m.classList.remove('open');
    m.style.display = '';
  }

  document.body.classList.remove('camera-open');
}

function capturePhoto() {
  const video = _attId('video');
  const canvas = _attId('canvas');

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    _attSafeNotify(currentLang === 'ar' ? '❌ تعذر التقاط الصورة' : '❌ Failed to capture photo', 'error');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // عكس السيلفي أفقيًا للكاميرا الأمامية
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);

  closeCamera();

  const preview = _attId('selfie-preview-img');
  if (preview) preview.src = capturedPhoto;

  const selfieModal = _attId('selfie-modal');
  if (selfieModal) selfieModal.classList.add('open');

  const confirmBtn = _attId('confirm-attend-btn');
  if (confirmBtn) confirmBtn.disabled = false;

  const ar = currentLang === 'ar';
  const locStatusEl = _attId('location-status');

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
  if (!currentUser || attendanceSubmitLock) return;

  const today = todayStr();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  const ar = currentLang === 'ar';
  const confirmBtn = _attId('confirm-attend-btn');

  if (!capturedPhoto) {
    _attSafeNotify(ar ? '❌ يجب التقاط صورة أولًا' : '❌ You must capture a photo first', 'error');
    return;
  }

  try {
    attendanceSubmitLock = true;
    if (confirmBtn) confirmBtn.disabled = true;

    const todayAtt = await dbGet(
      'attendance',
      `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`
    ).catch(() => []);

    const todayRecord = todayAtt && todayAtt.length > 0 ? todayAtt[0] : null;

    if (attendMode === 'in') {
      if (todayRecord && todayRecord.check_in) {
        _attSafeNotify(ar ? '✅ تم تسجيل الدخول بالفعل اليوم' : '✅ Already checked in today', 'info');
        _attSafeCloseModal('selfie-modal');
        await loadEmpData();
        return;
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
        location_lat: capturedLocation?.lat ?? null,
        location_lng: capturedLocation?.lng ?? null
      });

      _attSafeNotify(ar ? 'تم تسجيل الدخول ✅' : 'Checked in ✅', 'success');

    } else {
      if (!todayRecord || !todayRecord.check_in) {
        _attSafeNotify(ar ? '❌ لا يوجد تسجيل دخول اليوم' : '❌ No check-in found for today', 'error');
        _attSafeCloseModal('selfie-modal');
        await loadEmpData();
        return;
      }

      if (todayRecord.check_out) {
        _attSafeNotify(ar ? '✅ تم تسجيل الخروج بالفعل' : '✅ Already checked out', 'info');
        _attSafeCloseModal('selfie-modal');
        await loadEmpData();
        return;
      }

      const hasDisplay = await _hasTodayDisplayPhotos(currentUser.id, today);
      if (!hasDisplay) {
        _attSafeNotify(
          ar
            ? '❌ لازم ترفع صور الديسبلاي قبل تسجيل الخروج'
            : '❌ You must upload display photos before check-out',
          'error'
        );

        _attSafeCloseModal('selfie-modal');
        closeCamera();
        _attShowDisplayTab();
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

      _attSafeNotify(ar ? 'تم تسجيل الخروج ✅' : 'Checked out ✅', 'success');
    }

    _attSafeCloseModal('selfie-modal');
    _attResetCaptureState();
    await loadEmpData();

  } catch (e) {
    console.error('[confirmAttendance]', e);
    _attSafeNotify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  } finally {
    attendanceSubmitLock = false;
    if (confirmBtn) confirmBtn.disabled = false;
    _attSetAttendBtnBusy(false);
  }
}
// ─────────────────────────────────────────
// Expose globals safely
// ─────────────────────────────────────────
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
