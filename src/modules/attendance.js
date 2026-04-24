// ═══════════════════════════════════════════════════════════
// modules/attendance.js — Attendance, selfie, camera, daily log
// Provides globals: loadEmpData, updateAttendBtn, handleAttendClick,
//   confirmAttendance, openCamera, closeCamera, capturePhoto,
//   renderAttendHistory, loadEmpWarnings, loadEmpDailyLog, loadEmpMonthlyReport
// ═══════════════════════════════════════════════════════════

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

function _to12HourLabel(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return '-';
  const parts = hhmm.split(':');
  if (parts.length < 2) return hhmm;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
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
  if (parts.length < 2) {
    status.textContent = `${currentLang === 'ar' ? 'دخل الساعة' : 'In at'} ${_to12HourLabel(checkInHHMM)}`;
    return;
  }
  const inH = Number(parts[0]);
  const inM = Number(parts[1]);
  if (!Number.isFinite(inH) || !Number.isFinite(inM)) {
    status.textContent = `${currentLang === 'ar' ? 'دخل الساعة' : 'In at'} ${_to12HourLabel(checkInHHMM)}`;
    return;
  }

  const baseInMin = inH * 60 + inM;
  const shiftSeconds = 8 * 60 * 60;

  const render = () => {
    const ar = currentLang === 'ar';
    const now = new Date();
    const nowSec = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
    let remaining = shiftSeconds - (nowSec - baseInMin * 60);
    if (!Number.isFinite(remaining)) remaining = 0;
    if (remaining < 0) remaining = 0;

    const hh = Math.floor(remaining / 3600);
    const mm = Math.floor((remaining % 3600) / 60);
    const ss = remaining % 60;
    const countdown = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    status.textContent =
      `${ar ? 'دخل الساعة' : 'In at'} ${_to12HourLabel(checkInHHMM)}` +
      `${lateMinutes > 0 ? (ar ? ` (تأخر ${lateMinutes} د)` : ` (${lateMinutes}m late)`) : ''}` +
      `${ar ? ` • المتبقي: ${countdown}` : ` • Remaining: ${countdown}`}`;

    if (remaining <= 0) _clearWorkCountdown();
  };

  render();
  _workCountdownTimer = setInterval(render, 1000);
}

// Helper: ensure shift-info element exists on the home screen.
// Injects it above the attend button if missing.
function _ensureShiftInfoEl() {
  let el = document.getElementById('emp-shift-info');
  if (el) return el;
  const attendBtn = document.getElementById('attend-btn');
  if (!attendBtn) return null;
  el = document.createElement('div');
  el.id = 'emp-shift-info';
  el.style.cssText = 'font-size:12px;font-weight:700;color:var(--green);text-align:center;padding:8px 12px;margin:0 0 12px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.2);border-radius:12px;direction:rtl';
  attendBtn.parentNode.insertBefore(el, attendBtn);
  return el;
}

async function loadEmpData() {
  if (!currentUser) return;
  try {
    const today = todayStr(), pm = getPayrollMonth();

    // ── Today's attendance ──
    const todayAtt = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`).catch(() => []);
    updateAttendBtn(todayAtt && todayAtt.length > 0 ? todayAtt[0] : null);

    // ── Month's attendance & stats ──
    const monthAtt = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []);
    const attCountEl = document.getElementById('emp-attend-count'); if (attCountEl) attCountEl.textContent = (monthAtt || []).length;
    let lateTotal = 0; (monthAtt || []).forEach(a => { lateTotal += (a.late_minutes || 0); });
    const lateEl = document.getElementById('emp-late-total'); if (lateEl) lateEl.textContent = lateTotal + (currentLang === 'ar' ? ' د' : 'm');

    // ── Month's sales ──
    const monthSales = await dbGet('sales', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []);
    let salesTotal = 0; (monthSales || []).forEach(s => { salesTotal += s.total_amount; });
    const salesEl = document.getElementById('emp-sales-total'); if (salesEl) salesEl.textContent = 'EGP ' + fmtEGP(salesTotal);

    // ── Target & K Model ──
    const mon = pm.start.substring(0, 7);
    const targetRes = await dbGet('targets', `?employee_id=eq.${currentUser.id}&month=eq.${mon}&select=*`).catch(() => []);
    const target = targetRes && targetRes.length > 0 ? targetRes[0].amount : 0;
    const kmodel = targetRes && targetRes.length > 0 ? targetRes[0].kmodel_amount : 0;
    const achEl = document.getElementById('target-achieved'); if (achEl) achEl.textContent = 'EGP ' + fmtEGP(salesTotal);
    const goalEl = document.getElementById('target-goal'); if (goalEl) goalEl.textContent = (currentLang === 'ar' ? 'التارجت: ' : 'Target: ') + 'EGP ' + fmtEGP(target);
    const pct = target > 0 ? Math.min(100, Math.round(salesTotal / target * 100)) : 0;
    const fillEl = document.getElementById('target-fill'); if (fillEl) fillEl.style.width = pct + '%';
    const pctEl = document.getElementById('target-pct'); if (pctEl) pctEl.textContent = pct + '%';
    const kr = document.getElementById('kmodel-row');
    if (kmodel > 0 && kr) {
      kr.style.display = 'block';
      const kpct = Math.min(100, Math.round(salesTotal / kmodel * 100));
      const kf = document.getElementById('kmodel-fill'); if (kf) kf.style.width = kpct + '%';
      const kp = document.getElementById('kmodel-pct'); if (kp) kp.textContent = kpct + '%';
    } else if (kr) kr.style.display = 'none';

    // ── Absent days ──
    const startD = new Date(pm.start), endD = new Date(Math.min(new Date(pm.end), new Date()));
    let absent = 0;
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === currentUser.day_off) continue;
      const ds = fmtDate(new Date(d));
      if (!(monthAtt || []).find(a => a.date === ds)) absent++;
    }
    const absEl = document.getElementById('emp-absent-count'); if (absEl) absEl.textContent = absent;

    // ── Charts ──
    if (typeof renderDailySalesGrid === 'function') renderDailySalesGrid(monthSales, pm);
    if (typeof renderEmpPerfChart === 'function') renderEmpPerfChart(monthSales, pm);

    // ── Recent attendance + warnings + today sales ──
    const recent = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&order=date.desc&limit=7&select=*`).catch(() => []);
    renderAttendHistory(recent);
    loadEmpWarnings();
    if (typeof loadTodaySales === 'function') loadTodaySales();

    // ── SHIFT LABEL ON HOME (the fix) ──
    const shiftInfoEl = _ensureShiftInfoEl();
    if (shiftInfoEl) {
      const ar = currentLang === 'ar';
      const dow = new Date().getDay();
      const shift = currentUser.shift || 'morning';
      const { labelAr, labelEn } = _getShiftTimes(shift, dow);
      shiftInfoEl.textContent = ar ? labelAr : labelEn;
    }
  } catch (e) { console.error('[loadEmpData]', e); }
}

function updateAttendBtn(record) {
  const btn = document.getElementById('attend-btn'), status = document.getElementById('attend-status');
  if (!btn) return;
  const ar = currentLang === 'ar';
  const iconEl = btn.querySelector('.attend-icon');
  const labelEl = btn.querySelector('.attend-label');
  if (record && record.check_in && !record.check_out) {
    btn.classList.add('checked-in');
    if (iconEl) iconEl.textContent = '🔴';
    if (labelEl) labelEl.textContent = ar ? 'تسجيل خروج' : 'Check Out';
    _startWorkCountdown(record.check_in, record.late_minutes || 0);
  } else if (record && record.check_out) {
    _clearWorkCountdown();
    btn.classList.remove('checked-in');
    if (iconEl) iconEl.textContent = '✅';
    if (labelEl) labelEl.textContent = ar ? 'تم' : 'Done';
    btn.onclick = null;
    if (status) status.textContent = `${ar ? 'دخول' : 'In'}: ${_to12HourLabel(record.check_in)} – ${ar ? 'خروج' : 'Out'}: ${_to12HourLabel(record.check_out)}`;
  } else {
    _clearWorkCountdown();
    btn.classList.remove('checked-in');
    if (iconEl) iconEl.textContent = '🟢';
    if (labelEl) labelEl.textContent = ar ? 'تسجيل دخول' : 'Check In';
    if (status) status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';
  }
}

function handleAttendClick() {
  const btn = document.getElementById('attend-btn');
  if (!btn) return;
  const iconEl = btn.querySelector('.attend-icon');
  if (iconEl && iconEl.textContent === '✅') return;
  attendMode = btn.classList.contains('checked-in') ? 'out' : 'in';
  const ar = currentLang === 'ar';
  const titleEl = document.getElementById('selfie-modal-title');
  const camLabelEl = document.getElementById('camera-label');
  if (titleEl) titleEl.textContent = attendMode === 'in' ? (ar ? 'تأكيد تسجيل الدخول' : 'Confirm Check In') : (ar ? 'تأكيد تسجيل الخروج' : 'Confirm Check Out');
  if (camLabelEl) camLabelEl.textContent = attendMode === 'in' ? (ar ? '📸 التقط سيلفي للدخول' : '📸 Take selfie to check in') : (ar ? '📸 التقط سيلفي للخروج' : '📸 Take selfie to check out');

  if (!navigator.geolocation) { notify(ar ? '⚠️ جهازك لا يدعم تحديد الموقع' : '⚠️ Geolocation not supported', 'error'); return; }
  notify(ar ? '📍 جاري تحديد موقعك...' : '📍 Getting your location...', 'info');
  btn.style.pointerEvents = 'none';
  navigator.geolocation.getCurrentPosition(
    pos => { capturedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; btn.style.pointerEvents = ''; openCamera(); },
    err => {
      capturedLocation = null; btn.style.pointerEvents = '';
      if (err.code === 1) notify(ar ? '❌ افتح الإعدادات ← Safari ← الموقع وافعّله' : '❌ Settings → Safari → Location → Allow', 'error');
      else notify(ar ? '❌ تعذر تحديد الموقع، حاول مرة أخرى' : '❌ Location failed, try again', 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function renderAttendHistory(records) {
  const el = document.getElementById('emp-attend-history'); if (!el) return;
  const ar = currentLang === 'ar';
  if (!records || records.length === 0) { el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div>${ar ? 'لا توجد سجلات' : 'No records'}</div>`; return; }
  el.innerHTML = records.map(r => `<div class="history-item">
    <div class="hist-top"><div class="hist-name">${r.date}</div>
    <span class="badge ${r.late_minutes > 0 ? 'badge-yellow' : 'badge-green'}">${r.late_minutes > 0 ? r.late_minutes + (ar ? ' د تأخير' : 'm late') : (ar ? 'في الوقت' : 'On time')}</span></div>
    <div style="display:flex;justify-content:space-between">
      <div class="hist-meta">${ar ? 'دخول' : 'In'}: ${_to12HourLabel(r.check_in)}</div>
      <div class="hist-meta">${ar ? 'خروج' : 'Out'}: ${_to12HourLabel(r.check_out)}</div>
    </div></div>`).join('');
}

async function loadEmpWarnings() {
  try {
    const warns = await dbGet('warnings', `?employee_id=eq.${currentUser.id}&order=created_at.desc&limit=5&select=*`);
    const card = document.getElementById('emp-warnings-card'), list = document.getElementById('emp-warnings-list');
    if (!warns || warns.length === 0) { if (card) card.style.display = 'none'; return; }
    if (card) card.style.display = 'block';
    if (list) list.innerHTML = warns.map(w => `<div class="perm-card" style="border-color:var(--yellow)">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span class="badge badge-yellow">${currentLang === 'ar' ? 'تحذير' : 'Warning'}</span>
        <span style="font-size:10px;color:var(--muted)">${(w.created_at || '').substring(0, 10)}</span>
      </div><div style="font-size:12px">${w.message}</div></div>`).join('');
  } catch (e) { console.warn('[loadEmpWarnings]', e); }
}

async function loadEmpDailyLog() {
  const pm = getPayrollMonth(); const ar = currentLang === 'ar';
  const att = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`).catch(() => []) || [];
  const el = document.getElementById('emp-daily-log'); if (!el) return;
  if (att.length === 0) { el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div>${ar ? 'لا توجد سجلات' : 'No records'}</div>`; return; }
  el.innerHTML = `<div class="table-wrap"><table>
    <tr><th>${ar ? 'التاريخ' : 'Date'}</th><th>${ar ? 'دخول' : 'In'}</th><th>${ar ? 'خروج' : 'Out'}</th><th>${ar ? 'تأخير' : 'Late'}</th></tr>
    ${att.map(a => `<tr><td>${a.date}</td><td>${_to12HourLabel(a.check_in)}</td><td>${_to12HourLabel(a.check_out)}</td>
      <td>${a.late_minutes > 0 ? `<span class="badge badge-yellow">${a.late_minutes}${ar ? 'د' : 'm'}</span>` : '<span class="badge badge-green">✓</span>'}</td></tr>`).join('')}
  </table></div>`;
}

async function loadEmpMonthlyReport() {
  const pm = getPayrollMonth(); const ar = currentLang === 'ar';
  const [att, sales] = await Promise.all([
    dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => []),
    dbGet('sales', `?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`).catch(() => [])
  ]);
  let salesTotal = 0; (sales || []).forEach(s => salesTotal += s.total_amount);
  let lateTotal = 0; (att || []).forEach(a => lateTotal += (a.late_minutes || 0));
  const el = document.getElementById('monthly-report-emp'); if (!el) return;
  const rows = ar ? [['أيام الحضور', (att || []).length + ' أيام', 'var(--green)'], ['دقائق التأخير', lateTotal + ' د', 'var(--yellow)'], ['إجمالي المبيعات', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'], ['عدد المعاملات', (sales || []).length, 'var(--text)']]
    : [['Attendance', (att || []).length + ' days', 'var(--green)'], ['Late', lateTotal + 'm', 'var(--yellow)'], ['Total Sales', 'EGP ' + salesTotal.toLocaleString(), 'var(--green)'], ['Transactions', (sales || []).length, 'var(--text)']];
  el.innerHTML = `<div style="font-size:11px;color:var(--muted);margin-bottom:10px">${pm.label}</div>` + rows.map(([l, v, c]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">${l}</span><span style="font-size:13px;font-weight:700;color:${c}">${v}</span></div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════════════════════════
async function openCamera() {
  try {
    const constraints = { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('video');
    video.srcObject = videoStream;
    video.setAttribute('playsinline', ''); video.setAttribute('autoplay', ''); video.muted = true;
    await video.play().catch(() => { });
    document.getElementById('camera-modal').classList.add('open');
  } catch (e) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const video = document.getElementById('video');
      video.srcObject = videoStream; video.setAttribute('playsinline', ''); video.muted = true;
      await video.play().catch(() => { });
      document.getElementById('camera-modal').classList.add('open');
    } catch (e2) {
      notify((currentLang === 'ar' ? '❌ خطأ في الكاميرا: ' : '❌ Camera error: ') + e2.message, 'error');
    }
  }
}
function closeCamera() { if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; } const m = document.getElementById('camera-modal'); if (m) m.classList.remove('open'); }
function capturePhoto() {
  const video = document.getElementById('video'), canvas = document.getElementById('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d'); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0);
  capturedPhoto = canvas.toDataURL('image/jpeg', 0.65); closeCamera();
  document.getElementById('selfie-preview-img').src = capturedPhoto;
  document.getElementById('selfie-modal').classList.add('open');
  document.getElementById('confirm-attend-btn').disabled = false;
  const ar = currentLang === 'ar';
  const locStatusEl = document.getElementById('location-status');
  if (locStatusEl) {
    if (capturedLocation) locStatusEl.innerHTML = `✅ ${ar ? 'تم تحديد الموقع' : 'Location found'} — <a href="https://maps.google.com/?q=${capturedLocation.lat},${capturedLocation.lng}" target="_blank" style="color:var(--green)">${ar ? 'عرض' : 'View'}</a>`;
    else locStatusEl.textContent = ar ? '⚠️ لم يتم تحديد الموقع' : '⚠️ Location unavailable';
  }
}

async function confirmAttendance() {
  const today = todayStr(), now = new Date(), timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const ar = currentLang === 'ar';
  try {
    const todayAtt = await dbGet('attendance', `?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`).catch(() => []);
    if (attendMode === 'in') {
      const dow = now.getDay();
      const { start: shiftStart } = _getShiftTimes(currentUser.shift || 'morning', dow);
      const [wh, wm] = shiftStart.split(':').map(Number), [ah, am] = timeStr.split(':').map(Number);
      const lateMin = Math.max(0, (ah * 60 + am) - (wh * 60 + wm));
      await dbPost('attendance', {
        employee_id: currentUser.id, date: today, check_in: timeStr,
        late_minutes: lateMin, selfie_in: capturedPhoto,
        location_lat: capturedLocation?.lat, location_lng: capturedLocation?.lng
      });
      notify(ar ? 'تم تسجيل الدخول ✅' : 'Checked in ✅', 'success');
    } else {
      if (todayAtt && todayAtt.length > 0) {
        await dbPatch('attendance', { check_out: timeStr, selfie_out: capturedPhoto }, `?employee_id=eq.${currentUser.id}&date=eq.${today}`);
        notify(ar ? 'تم تسجيل الخروج ✅' : 'Checked out ✅', 'success');
      }
    }
    closeModal('selfie-modal');
    loadEmpData();
  } catch (e) {
    console.error('[confirmAttendance]', e);
    notify((ar ? 'خطأ: ' : 'Error: ') + e.message, 'error');
  }
}
