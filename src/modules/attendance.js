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
  const startD = new Date(pm.start);
  const endD = new Date(Math.min(new Date(pm.end), new Date()));
  let absent = 0;

  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const currentLoopDate = new Date(d);
    if (currentLoopDate.getDay() === currentUser.day_off) continue;

    const ds = fmtDate(currentLoopDate);
    if (!(monthAtt || []).find(a => a.date === ds)) absent++;
  }

  return absent;
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
