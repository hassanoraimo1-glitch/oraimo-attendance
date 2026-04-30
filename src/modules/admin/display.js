// ═══════════════════════════════════════════════════════════
// src/modules/admin/display.js — Display photos + CSV/Excel exports
// Provides globals:
//   addDisplayPhoto, renderDisplayPreviews, removeDisplayPhoto,
//   submitDisplayPhotos, loadDisplayTab, exportToExcel, downloadCSV,
//   openDisplayCamera, closeDisplayCamera, captureDisplayPhoto
// Module state: displayPhotos
// ═══════════════════════════════════════════════════════════

let displayPhotos = [];
let displayCameraStream = null;

// ── HELPERS ───────────────────────────────────────────────
function _dId(id) {
  return document.getElementById(id);
}

function _dLangAr() {
  return (window.currentLang || 'ar') === 'ar';
}

function _dNotify(arMsg, enMsg, type = 'info') {
  if (typeof window.notify === 'function') {
    window.notify(_dLangAr() ? arMsg : enMsg, type);
  }
}

function _dNormalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();

  if (!r) return 'employee';
  if (r === 'super_admin') return 'superadmin';
  if (r === 'superadmin') return 'superadmin';
  if (r === 'manager') return 'admin';
  if (r === 'viewer') return 'admin';
  if (r === 'admin') return 'admin';
  if (r === 'teamleader') return 'team_leader';
  if (r === 'team_leader') return 'team_leader';
  if (r === 'employee') return 'employee';

  return r;
}

function _dCanUploadDisplay() {
  const role = _dNormalizeRole(window.currentUser?.role);

  // المسموح لهم فقط
  return role === 'employee' || role === 'team_leader';
}

function _dIsReviewOnlyUser() {
  const role = _dNormalizeRole(window.currentUser?.role);
  return role === 'admin' || role === 'superadmin';
}

function _dStopDisplayCameraStream() {
  if (displayCameraStream) {
    try {
      displayCameraStream.getTracks().forEach(track => track.stop());
    } catch (_) {}
    displayCameraStream = null;
  }
}

function _dApplyDisplayUploadPermissions() {
  const canUpload = _dCanUploadDisplay();

  // عناصر الإدخال والرفع
  [
    'display-upload-zone',
    'display-note',
    'display-camera-modal'
  ].forEach(id => {
    const el = _dId(id);
    if (!el) return;

    if (id !== 'display-camera-modal') {
      if ('disabled' in el) el.disabled = !canUpload;
      el.style.pointerEvents = canUpload ? '' : 'none';
    }
  });

  // الأزرار التي تستدعي الرفع / التصوير
  document.querySelectorAll(
    '[onclick*="openDisplayCamera"], [onclick*="captureDisplayPhoto"], [onclick*="submitDisplayPhotos"]'
  ).forEach(btn => {
    if ('disabled' in btn) btn.disabled = !canUpload;
    btn.style.pointerEvents = canUpload ? '' : 'none';
    btn.style.opacity = canUpload ? '' : '0.6';
  });

  // عند الأدمن لا نسمح بفتح مودال الكاميرا أساسًا
  if (!canUpload) {
    closeDisplayCamera();
  }
}

function _dSetRemoveButtonsVisibility() {
  const canUpload = _dCanUploadDisplay();
  document.querySelectorAll('#display-photo-previews .photo-preview-del').forEach(btn => {
    btn.style.display = canUpload ? 'flex' : 'none';
    btn.style.pointerEvents = canUpload ? '' : 'none';
  });
}

function _dEscapeAttr(value) {
  return String(value ?? '').replace(/'/g, "\\'");
}

function _dBuildDisplayPayload() {
  return {
    employee_name: window.currentUser?.name || null,
    branch: window.currentUser?.branch || window.currentUser?.branch_name || '',
    photo1: displayPhotos[0] || null,
    photo2: displayPhotos[1] || null,
    photo3: displayPhotos[2] || null,
    note: (_dId('display-note')?.value || '').trim() || null,
    photo_date: typeof window.todayStr === 'function'
      ? window.todayStr()
      : new Date().toISOString().slice(0, 10)
  };
}

function _dResizeCanvasIfNeeded(sourceCanvas, maxW = 1280, maxH = 1280) {
  const w = sourceCanvas.width || 0;
  const h = sourceCanvas.height || 0;

  if (!w || !h) return sourceCanvas;

  const ratio = Math.min(1, maxW / w, maxH / h);
  if (ratio >= 1) return sourceCanvas;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * ratio));
  canvas.height = Math.max(1, Math.round(h * ratio));

  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function _dCanvasToOptimizedJpeg(canvas) {
  const optimized = _dResizeCanvasIfNeeded(canvas, 1280, 1280);
  return optimized.toDataURL('image/jpeg', 0.72);
}

// ── CAMERA ────────────────────────────────────────────────
async function openDisplayCamera() {
  if (!_dCanUploadDisplay()) {
    _dNotify('هذا القسم للموظف أو التيم ليدر فقط', 'This section is only for employee or team leader', 'info');
    return;
  }

  if (displayPhotos.length >= 3) {
    _dNotify('الحد الأقصى 3 صور', 'Maximum 3 photos', 'error');
    return;
  }

  const modal = _dId('display-camera-modal');
  const video = _dId('display-camera-video');

  if (!modal || !video) {
    _dNotify('واجهة الكاميرا غير موجودة', 'Camera UI not found', 'error');
    return;
  }

  try {
    displayCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    video.srcObject = displayCameraStream;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.muted = true;

    await video.play().catch(() => {});
    modal.classList.add('open');
    modal.style.display = 'flex';
  } catch (e) {
    try {
      displayCameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      video.srcObject = displayCameraStream;
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.muted = true;

      await video.play().catch(() => {});
      modal.classList.add('open');
      modal.style.display = 'flex';
    } catch (e2) {
      _dNotify(
        `❌ تعذر فتح الكاميرا: ${e2.message || ''}`,
        `❌ Camera error: ${e2.message || ''}`,
        'error'
      );
    }
  }
}

function closeDisplayCamera() {
  _dStopDisplayCameraStream();

  const video = _dId('display-camera-video');
  if (video) {
    try { video.pause(); } catch (_) {}
    video.srcObject = null;
  }

  const modal = _dId('display-camera-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function captureDisplayPhoto() {
  if (!_dCanUploadDisplay()) {
    _dNotify('هذا القسم للموظف أو التيم ليدر فقط', 'This section is only for employee or team leader', 'info');
    return;
  }

  if (displayPhotos.length >= 3) {
    _dNotify('الحد الأقصى 3 صور', 'Maximum 3 photos', 'error');
    closeDisplayCamera();
    return;
  }

  const video = _dId('display-camera-video');
  const canvas = _dId('display-camera-canvas');

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    _dNotify('تعذر التقاط الصورة', 'Unable to capture photo', 'error');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    _dNotify('تعذر تجهيز الصورة', 'Canvas error', 'error');
    return;
  }

  // رسم الصورة الأصلية
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // التاريخ والوقت الحالي
  const now = new Date();
  const dateText = now.toLocaleDateString('en-GB');
  const timeText = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const watermarkText = `${dateText}  ${timeText}`;

  // إعدادات الواتر مارك
  const padding = Math.max(20, Math.floor(canvas.width * 0.02));
  const fontSize = Math.max(24, Math.floor(canvas.width * 0.022));
  const circleRadius = Math.max(12, Math.floor(canvas.width * 0.012));
  const circleDiameter = circleRadius * 2;
  const gap = 12;

  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const textWidth = ctx.measureText(watermarkText).width;
  const boxHeight = Math.max(44, fontSize + 18);
  const boxWidth = textWidth + circleDiameter + gap + 28;

  const x = padding;
  const y = canvas.height - padding - boxHeight;

  // خلفية الواتر مارك
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  roundRect(ctx, x, y, boxWidth, boxHeight, 14);
  ctx.fill();

  // دائرة خضراء فيها O
  const circleX = x + 16 + circleRadius;
  const circleY = y + boxHeight / 2;

  ctx.beginPath();
  ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#00C853';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(12, Math.floor(circleRadius * 1.05))}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('O', circleX, circleY + 1);

  // نص التاريخ والوقت
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(watermarkText, x + 16 + circleDiameter + gap, y + boxHeight / 2);

  // ضغط الصورة لتقليل أخطاء الحفظ
  const photoData = _dCanvasToOptimizedJpeg(canvas);
  displayPhotos.push(photoData);

  // قفل الكاميرا فورًا بعد الالتقاط
  closeDisplayCamera();

  renderDisplayPreviews();
  _dNotify('تم التقاط الصورة ✅', 'Photo captured ✅', 'success');
}

// التوافق مع الأكواد القديمة
function addDisplayPhoto() {
  _dNotify('استخدم الكاميرا فقط لإضافة صورة الديسبلاي', 'Use camera only to add display photo', 'info');
}

// ── PREVIEWS ──────────────────────────────────────────────
function renderDisplayPreviews() {
  const el = _dId('display-photo-previews');
  if (!el) return;

  el.innerHTML = displayPhotos.map((src, i) => `
    <div class="photo-preview-wrap">
      <img src="${src}" onclick="fullSelfie('${_dEscapeAttr(src)}')">
      <button class="photo-preview-del" onclick="removeDisplayPhoto(${i})">✕</button>
    </div>
  `).join('');

  const zone = _dId('display-upload-zone');
  if (zone) {
    zone.style.display = displayPhotos.length >= 3 ? 'none' : 'block';
    if (!_dCanUploadDisplay()) zone.style.display = 'none';
  }

  _dSetRemoveButtonsVisibility();
}

function removeDisplayPhoto(i) {
  if (!_dCanUploadDisplay()) {
    _dNotify('هذا القسم للمشاهدة فقط', 'This section is view only', 'info');
    return;
  }

  if (i < 0 || i >= displayPhotos.length) return;
  displayPhotos.splice(i, 1);
  renderDisplayPreviews();
}

// ── SAVE ──────────────────────────────────────────────────
async function submitDisplayPhotos() {
  const ar = _dLangAr();

  if (!window.currentUser) {
    _dNotify('يجب تسجيل الدخول أولاً', 'You must login first', 'error');
    return;
  }

  if (!_dCanUploadDisplay()) {
    _dNotify('هذا القسم للمشاهدة فقط وليس للرفع', 'This section is view only, not upload', 'info');
    return;
  }

  if (displayPhotos.length === 0) {
    _dNotify('أضف صورة واحدة على الأقل', 'Add at least one photo', 'error');
    return;
  }

  const numericId = Number(window.currentUser.id);
  const basePayload = _dBuildDisplayPayload();

  const tries = [];

  if (!Number.isNaN(numericId) && Number.isFinite(numericId)) {
    tries.push({
      ...basePayload,
      employee_id: numericId
    });
  }

  tries.push({
    ...basePayload,
    employee_id: window.currentUser.id
  });

  tries.push({
    ...basePayload
  });

  let lastErr = null;

  for (const payload of tries) {
    try {
      await dbPost('display_photos', payload);

      _dNotify('تم رفع صور الديسبلاي ✅', 'Display photos uploaded ✅', 'success');

      displayPhotos = [];
      renderDisplayPreviews();

      const noteEl = _dId('display-note');
      if (noteEl) noteEl.value = '';

      await loadDisplayTab();
      return;
    } catch (e) {
      console.error('[submitDisplayPhotos try failed]', payload, e);
      lastErr = e;
    }
  }

  const msg = String(lastErr?.message || '');

  if (msg.includes('security') || msg.includes('policy') || msg.includes('row-level')) {
    _dNotify(
      'خطأ صلاحيات: تحقق من سياسات جدول display_photos',
      'Permissions error: check display_photos policies',
      'error'
    );
    return;
  }

  if (msg.includes('400') || msg.includes('invalid input syntax') || msg.includes('integer')) {
    _dNotify(
      'تعذر الحفظ: راجع نوع employee_id أو بنية جدول display_photos',
      'Save failed: check employee_id type or display_photos schema',
      'error'
    );
    return;
  }

  _dNotify(
    ar ? `تعذر حفظ الصورة: ${msg || 'خطأ غير معروف'}` : `Failed to save image: ${msg || 'Unknown error'}`,
    ar ? 'Failed to save image' : 'Failed to save image',
    'error'
  );
}

// ── HISTORY ───────────────────────────────────────────────
async function loadDisplayTab() {
  _dApplyDisplayUploadPermissions();

  const el = _dId('display-date-label');
  if (el && typeof window.todayStr === 'function') el.textContent = window.todayStr();

  const hist = _dId('display-history-list');
  if (!hist || !window.currentUser) return;

  const pm = typeof window.getPayrollMonth === 'function'
    ? window.getPayrollMonth()
    : {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10)
      };

  const records = await dbGet(
    'display_photos',
    `?employee_id=eq.${window.currentUser.id}&photo_date=gte.${pm.start}&photo_date=lte.${pm.end}&order=photo_date.desc&select=*`
  ).catch(() => []) || [];

  if (!records.length) {
    hist.innerHTML = `<div class="empty"><div class="empty-icon">🖼️</div>${_dLangAr() ? 'لا توجد صور هذا الشهر' : 'No photos this month'}</div>`;
    renderDisplayPreviews();
    return;
  }

  hist.innerHTML = records.map(r => {
    const photos = [r.photo1, r.photo2, r.photo3].filter(Boolean);
    return `
      <div class="visit-card">
        <div class="visit-header">
          <div>
            <div class="visit-branch-name">🗓️ ${r.photo_date || ''}</div>
            <div class="visit-meta">${r.branch || ''}</div>
          </div>
          <span class="badge badge-blue">${photos.length} 📷</span>
        </div>
        ${r.note ? `<div class="visit-note">📝 ${r.note}</div>` : ''}
        <div class="visit-photos-row">
          ${photos.map(src => `<img class="visit-photo" src="${src}" onclick="fullSelfie('${_dEscapeAttr(src)}')">`).join('')}
        </div>
      </div>
    `;
  }).join('');

  renderDisplayPreviews();
}

// ── EXPORTS (Excel/CSV) ───────────────────────────────────
async function exportToExcel(type) {
  const ar = _dLangAr();
  const pm = typeof window.getPayrollMonth === 'function'
    ? window.getPayrollMonth()
    : {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10)
      };

  _dNotify('جاري تحضير البيانات...', 'Preparing data...', 'success');

  try {
    if (type === 'attendance') {
      const [att, emps] = await Promise.all([
        dbGet('attendance', `?date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`),
        dbGet('employees', '?select=*')
      ]);

      let csv = 'الاسم,الفرع,التاريخ,وقت الدخول,وقت الخروج,التأخير (دقيقة),الحالة\n';

      (att || []).forEach(a => {
        const emp = (emps || []).find(e => e.id === a.employee_id);
        const name = emp?.name || a.employee_id;
        const branch = emp?.branch || '';
        const status = a.check_out ? 'حضر وانصرف' : a.check_in ? 'حضر' : 'غائب';

        csv += `"${name}","${branch}","${a.date}","${a.check_in || ''}","${a.check_out || ''}","${a.late_minutes || 0}","${status}"\n`;
      });

      downloadCSV(csv, `attendance_${pm.start.substring(0, 7)}.csv`);
    } else if (type === 'sales') {
      const [sales, emps, tls] = await Promise.all([
        dbGet('sales', `?date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`),
        dbGet('employees', '?select=*'),
        dbGet('manager_teams', '?select=*').catch(() => [])
      ]);

      const teamMap = {};
      (tls || []).forEach(t => {
        teamMap[t.employee_id] = t.manager_id;
      });

      const admins = await dbGet('admins', '?select=id,name').catch(() => []) || [];
      const adminMap = {};
      admins.forEach(a => {
        adminMap[a.id] = a.name;
      });

      const empLeaders = (emps || []).filter(e => _dNormalizeRole(e.role) === 'team_leader');
      empLeaders.forEach(e => {
        adminMap[e.id] = e.name;
      });

      let csv = 'الاسم,الفرع,التيم ليدر,التاريخ,المنتج,الكمية,سعر الوحدة,الإجمالي\n';

      (sales || []).forEach(s => {
        const emp = (emps || []).find(e => e.id === s.employee_id);
        const name = emp?.name || s.employee_id;
        const branch = emp?.branch || '';
        const tlId = teamMap[s.employee_id];
        const tlName = tlId ? (adminMap[tlId] || '') : '';

        csv += `"${name}","${branch}","${tlName}","${s.date}","${s.product_name}","${s.quantity}","${s.unit_price}","${s.total_amount}"\n`;
      });

      downloadCSV(csv, `sales_${pm.start.substring(0, 7)}.csv`);
    }
  } catch (e) {
    _dNotify(`خطأ: ${e.message || ''}`, `Error: ${e.message || ''}`, 'error');
  }
}

function downloadCSV(csv, filename) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── INIT ──────────────────────────────────────────────────
function initDisplayModule() {
  _dApplyDisplayUploadPermissions();
  renderDisplayPreviews();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDisplayModule);
} else {
  initDisplayModule();
}

// ── EXPOSE GLOBALS ────────────────────────────────────────
window.addDisplayPhoto = addDisplayPhoto;
window.renderDisplayPreviews = renderDisplayPreviews;
window.removeDisplayPhoto = removeDisplayPhoto;
window.submitDisplayPhotos = submitDisplayPhotos;
window.loadDisplayTab = loadDisplayTab;
window.exportToExcel = exportToExcel;
window.downloadCSV = downloadCSV;
window.openDisplayCamera = openDisplayCamera;
window.closeDisplayCamera = closeDisplayCamera;
window.captureDisplayPhoto = captureDisplayPhoto;
