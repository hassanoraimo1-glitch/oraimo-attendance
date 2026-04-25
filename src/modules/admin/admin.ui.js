// Admin dashboard UI — templates only (loaded before dashboard.js).
(function initAdminUI(global) {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDashboardEmployees(opts) {
    const { container, employees, todayAtt, isViewer, isArabic, emptyText } = opts;
    if (!container) return;
    if (!employees || !employees.length) {
      container.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${esc(emptyText)}</div>`;
      return;
    }
    container.innerHTML = employees.map((emp) => {
      const att = (todayAtt || []).find((a) => a.employee_id === emp.id);
      const mapLink = att && att.location_lat ? `https://maps.google.com/?q=${att.location_lat},${att.location_lng}` : null;
      const mapLinkSafe = mapLink ? esc(mapLink) : '';
      return `<div class="emp-card admin-card-row">
        <div class="emp-avatar admin-avatar" style="overflow:hidden">${emp.profile_photo ? `<img src="${esc(emp.profile_photo)}" style="width:100%;height:100%;object-fit:cover">` : esc(((emp.name || '?')[0] || '?').toUpperCase())}</div>
        <div class="emp-info">
          <div class="emp-name">${esc(emp.name)}</div><div class="emp-branch">${esc(emp.branch || '-')}</div>
          ${att ? `<div class="admin-emp-meta">${isArabic ? 'دخول' : 'In'}: ${esc(att.check_in)}${att.late_minutes > 0 ? (isArabic ? ` (تأخر ${att.late_minutes} د)` : ` (${att.late_minutes}m late)`) : ''} ${att.check_out ? (isArabic ? '· خروج: ' : '· Out: ') + esc(att.check_out) : ''}</div>` : ''}
          ${mapLink ? `<a href="${mapLinkSafe}" target="_blank" rel="noopener noreferrer" class="admin-map-link">📍 ${isArabic ? 'عرض الموقع' : 'View Location'}</a>` : att ? `<div class="admin-emp-meta">📍 ${isArabic ? 'لا يوجد موقع' : 'No location'}</div>` : ''}
        </div>
        <div class="admin-emp-actions">
          <span class="badge ${att ? (att.check_out ? 'badge-blue' : 'badge-green') : 'badge-red'}">${att ? (att.check_out ? (isArabic ? 'غادر' : 'Left') : (isArabic ? 'حاضر' : 'Present')) : (isArabic ? 'غائب' : 'Absent')}</span>
          ${att && att.selfie_in ? `<img src="${esc(att.selfie_in)}" class="selfie-preview" onclick="viewSelfie(${JSON.stringify(String(emp.name || ''))},${JSON.stringify(String(att.selfie_in || ''))},${JSON.stringify(String(att.selfie_out || ''))},${JSON.stringify(mapLinkSafe)})">` : ''}
          ${!isViewer ? `<button class="action-btn warn" onclick="openWarnModal(${emp.id},${JSON.stringify(String(emp.name || ''))})">⚠️</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function renderPendingLeaves(opts) {
    const { container, leaves, isViewer, isArabic, emptyText } = opts;
    if (!container) return;
    if (!leaves || !leaves.length) {
      container.innerHTML = `<div class="admin-empty-inline">${esc(emptyText)}</div>`;
      return;
    }
    container.innerHTML = leaves.map((l) => `<div class="perm-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700">${esc(l.employee_name)}</div>
        <span class="badge ${l.leave_type === 'vacation' ? 'badge-blue' : 'badge-yellow'}">${l.leave_type === 'vacation' ? (isArabic ? 'إجازة' : 'Vacation') : (isArabic ? 'إذن' : 'Permission')}</span>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${esc(l.reason)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${l.leave_type === 'vacation' ? ((isArabic ? 'تاريخ: ' : 'Date: ') + esc(l.leave_date || '')) : ((isArabic ? 'المدة: ' : 'Duration: ') + Number(l.duration_minutes || 0) + (isArabic ? ' د' : ' min'))}</div>
      ${!isViewer ? `<div style="display:flex;gap:8px"><button class="perm-btn approve" onclick="respondLeave(${l.id},'approved')">✅ ${isArabic ? 'موافقة' : 'Approve'}</button><button class="perm-btn reject" onclick="respondLeave(${l.id},'rejected')">❌ ${isArabic ? 'رفض' : 'Reject'}</button></div>` : ''}
    </div>`).join('');
  }

  function renderPerformance(opts) {
    const { container, ranked, isArabic } = opts;
    if (!container) return;
    if (!ranked || !ranked.length) {
      container.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>${isArabic ? 'لا توجد بيانات' : 'No data'}</div>`;
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const maxSales = ranked[0]?.sales || 1;
    container.innerHTML = ranked.map((e, i) => `<div class="perf-bar-wrap">
      <div class="perf-rank">${medals[i] || `#${i + 1}`}</div>
      <div class="perf-name">${esc(e.name)}</div>
      <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${e.sales > 0 ? Math.max(4, Math.round(e.sales / maxSales * 100)) : 0}%;background:${i === 0 ? 'var(--gold)' : i === 1 ? 'var(--silver)' : i === 2 ? 'var(--bronze)' : 'var(--green)'}"></div></div>
      <div class="perf-val">EGP ${esc(global.fmtEGP ? global.fmtEGP(e.sales) : e.sales)}</div>
    </div>`).join('');
  }

  function showAttendanceOverlay(opts) {
    const { list, isPresent, isToday, isArabic } = opts;
    const color = isPresent ? 'var(--green)' : 'var(--red)';
    const icon = isPresent ? '✅' : '😴';
    const titleAr = isPresent ? (isToday ? 'الحاضرون اليوم' : 'حاضرون أمس') : (isToday ? 'الغائبون اليوم' : 'غائبون أمس');
    const titleEn = isPresent ? (isToday ? 'Present Today' : 'Present Yesterday') : (isToday ? 'Absent Today' : 'Absent Yesterday');
    const overlay = document.createElement('div');
    overlay.className = 'admin-att-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
    overlay.innerHTML = `<div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid ${color}">
      <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:14px">${icon} ${isArabic ? titleAr : titleEn} (${list.length})</div>
      ${list.length === 0 ? `<div style="text-align:center;color:var(--muted);padding:20px">${isArabic ? 'لا يوجد' : 'None'}</div>` :
        list.map((item) => {
          const e = item.emp, a = item.att;
          const detail = a ? `${isArabic ? 'دخول' : 'In'}: ${a.check_in || '-'}${a.late_minutes > 0 ? ' · ⚠️' + a.late_minutes + (isArabic ? 'د' : 'm') : ''}${a.check_out ? (isArabic ? ' · خروج: ' : ' · Out: ') + a.check_out : ''}` : (e.branch || '-');
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">${e.profile_photo ? `<img src="${esc(e.profile_photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : esc((e.name || '?')[0].toUpperCase())}</div>
            <div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(e.name || '?')}</div><div style="font-size:11px;color:var(--muted)">${esc(detail)}</div></div>
          </div>`;
        }).join('')}
      <button type="button" class="admin-att-overlay-close" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${isArabic ? 'إغلاق' : 'Close'}</button>
    </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.admin-att-overlay-close')?.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  global.AdminUI = {
    renderDashboardEmployees,
    renderPendingLeaves,
    renderPerformance,
    showAttendanceOverlay,
  };
})(window);
