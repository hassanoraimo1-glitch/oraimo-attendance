// ═══════════════════════════════════════════════════════════
// modules/admin/display.js — Display photos + CSV/Excel exports
// Provides globals: addDisplayPhoto, renderDisplayPreviews,
//   removeDisplayPhoto, submitDisplayPhotos, loadDisplayTab,
//   exportToExcel, downloadCSV, openDisplayCamera,
//   closeDisplayCamera, captureDisplayPhoto
// Module state: displayPhotos
// ═══════════════════════════════════════════════════════════

// ── DISPLAY PHOTOS UPLOAD + HISTORY ──
let displayPhotos = [];
let displayCameraStream = null;

async function openDisplayCamera() {
  if (currentUser && currentUser.role !== 'employee') {
    notify('الديسبلاي للموظفين فقط', 'error');
    return;
  }

  if (displayPhotos.length >= 3) {
    notify(currentLang === 'ar' ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
    return;
  }

  const modal = document.getElementById('display-camera-modal');
  const video = document.getElementById('display-camera-video');

  if (!modal || !video) {
    notify(currentLang === 'ar' ? 'واجهة الكاميرا غير موجودة' : 'Camera UI not found', 'error');
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
      notify(
        (currentLang === 'ar' ? '❌ تعذر فتح الكاميرا: ' : '❌ Camera error: ') + e2.message,
        'error'
      );
    }
  }
}

function closeDisplayCamera() {
  if (displayCameraStream) {
    displayCameraStream.getTracks().forEach(track => track.stop());
    displayCameraStream = null;
  }

  const video = document.getElementById('display-camera-video');
  if (video) {
    try { video.pause(); } catch (_) {}
    video.srcObject = null;
  }

  const modal = document.getElementById('display-camera-modal');
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
  if (currentUser && currentUser.role !== 'employee') {
    notify('الديسبلاي للموظفين فقط', 'error');
    return;
  }

  if (displayPhotos.length >= 3) {
    notify(currentLang === 'ar' ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos', 'error');
    closeDisplayCamera();
    return;
  }

  const video = document.getElementById('display-camera-video');
  const canvas = document.getElementById('display-camera-canvas');

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    notify(currentLang === 'ar' ? 'تعذر التقاط الصورة' : 'Unable to capture photo', 'error');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    notify(currentLang === 'ar' ? 'تعذر تجهيز الصورة' : 'Canvas error', 'error');
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

  const photoData = canvas.toDataURL('image/jpeg', 0.85);
  displayPhotos.push(photoData);

  // أول ما الصورة تتاخد: نقفل الكاميرا فورًا
  closeDisplayCamera();

  // نظهر المعاينة ونخفي مكان الرفع إذا وصلنا للحد أو حسب وجود صور
  renderDisplayPreviews();

  notify(currentLang === 'ar' ? 'تم التقاط الصورة ✅' : 'Photo captured ✅', 'success');
}

// الإبقاء على الدالة للتوافق لو أي مكان قديم ما زال يناديها
function addDisplayPhoto(e) {
  if (currentLang === 'ar') {
    notify('استخدم الكاميرا فقط لإضافة صورة الديسبلاي', 'info');
  } else {
    notify('Use camera only to add display photo', 'info');
  }
}

function renderDisplayPreviews() {
  const el = document.getElementById('display-photo-previews');
  if (!el) return;

  el.innerHTML = displayPhotos.map((src, i) => `
    <div class="photo-preview-wrap">
      <img src="${src}">
      <button class="photo-preview-del" onclick="removeDisplayPhoto(${i})">✕</button>
    </div>
  `).join('');

  const zone = document.getElementById('display-upload-zone');
  if (zone) {
    zone.style.display = displayPhotos.length >= 3 ? 'none' : 'block';
  }
}

function removeDisplayPhoto(i) {
  if (i < 0 || i >= displayPhotos.length) return;
  displayPhotos.splice(i, 1);
  renderDisplayPreviews();
}

async function submitDisplayPhotos() {
  const noteEl = document.getElementById('display-note');
  const note = noteEl ? noteEl.value.trim() : '';
  const ar = currentLang === 'ar';

  if (displayPhotos.length === 0) {
    return notify(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one photo', 'error');
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

    if (noteEl) noteEl.value = '';

    loadDisplayTab();
  } catch (e) {
    if (e.message && e.message.includes('security')) {
      notify(
        ar
          ? 'خطأ: تأكد من إيقاف RLS على جدول display_photos'
          : 'Error: Disable RLS on display_photos table',
        'error'
      );
    } else {
      notify('Error: ' + e.message, 'error');
    }
  }
}

async function loadDisplayTab() {
  const el = document.getElementById('display-date-label');
  if (el) el.textContent = todayStr();

  const hist = document.getElementById('display-history-list');
  if (!hist) return;

  const pm = getPayrollMonth();

  const records = await dbGet(
    'display_photos',
    `?employee_id=eq.${currentUser.id}&photo_date=gte.${pm.start}&photo_date=lte.${pm.end}&order=photo_date.desc&select=*`
  ).catch(() => []) || [];

  if (!records.length) {
    hist.innerHTML = '<div class="empty"><div class="empty-icon">🖼️</div>لا توجد صور هذا الشهر</div>';
    return;
  }

  hist.innerHTML = records.map(r => {
    const photos = [r.photo1, r.photo2, r.photo3].filter(Boolean);
    return `<div class="visit-card"><div class="visit-header"><div><div class="visit-branch-name">🗓️ ${r.photo_date}</div><div class="visit-meta">${r.branch || ''}</div></div><span class="badge badge-blue">${photos.length} 📷</span></div>${r.note ? `<div class="visit-note">📝 ${r.note}</div>` : ''}<div class="visit-photos-row">${photos.map(src => `<img class="visit-photo" src="${src}" onclick="fullSelfie('${src}')">`).join('')}</div></div>`;
  }).join('');
}

// ── EXPORTS (Excel/CSV) ──
async function exportToExcel(type) {
  const ar = currentLang === 'ar';
  const pm = getPayrollMonth();
  notify(ar ? 'جاري تحضير البيانات...' : 'Preparing data...', 'success');

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

      const empLeaders = (emps || []).filter(e => e.role === 'team_leader');
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
    notify('Error: ' + e.message, 'error');
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
