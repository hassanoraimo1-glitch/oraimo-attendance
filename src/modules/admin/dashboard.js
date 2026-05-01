// ═══════════════════════════════════════════════════════════
// modules/admin/dashboard.js — Admin dashboard (home) + perf ranking
// Globals: loadAdminDashboard, renderPerformanceRanking, showAttList
// ═══════════════════════════════════════════════════════════

function roleOf() {
  return window.normalizeRole
    ? window.normalizeRole(window.currentUser?.role)
    : String(window.currentUser?.role || '').trim().toLowerCase();
}

function isTL() {
  return roleOf() === 'team_leader';
}

function isAdminLike() {
  return ['admin', 'super_admin'].includes(roleOf());
}

function n(v) {
  return Number(v || 0);
}

function sameId(a, b) {
  return Number(a) === Number(b);
}

async function getCurrentTeamIds() {
  if (!window.currentUser?.id || !isTL()) return null;

  if (typeof window.getManagerTeamIds === 'function') {
    try {
      const ids = await window.getManagerTeamIds();
      return Array.isArray(ids) ? ids.map(Number) : [];
    } catch (_) {}
  }

  try {
    const rows = await dbGet(
      'manager_teams',
      `?manager_id=eq.${window.currentUser.id}&select=employee_id`
    ).catch(() => []) || [];
    return rows.map(r => Number(r.employee_id)).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

function toggleSalesVisibility(show) {
  ['adm-sales-today', 'adm-sales-month'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const card = el.closest('.stat-card, .card, .dash-card') || el.parentElement;
    if (card) card.style.display = show ? '' : 'none';
    else el.style.display = show ? '' : 'none';
  });

  const perfWrap = document.getElementById('adm-performance-list');
  if (perfWrap) {
    const card = perfWrap.closest('.card, .dash-card, .section-card') || perfWrap.parentElement;
    if (card) card.style.display = show ? '' : 'none';
    else perfWrap.style.display = show ? '' : 'none';
  }
}

async function loadAdminDashboard() {
  const loader = document.getElementById('dash-loader');
  const dashC = document.getElementById('dash-content');

  if (loader) loader.style.display = 'none';
  if (dashC) dashC.style.display = 'block';

  try {
    const today = todayStr();
    const pm = getPayrollMonth();
    const ar = currentLang === 'ar';
    const yestDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const teamIds = await getCurrentTeamIds();
    const tlMode = isTL();
    const salesAllowed = isAdminLike();

    const [allEmpRaw, todayAttRaw, yestAttRaw, todaySalesRaw, monthSalesRaw, leavesRaw] = await Promise.all([
      dbGet('employees', '?select=*').catch(() => []),
      dbGet('attendance', `?date=eq.${today}&select=*`).catch(() => []),
      dbGet('attendance', `?date=eq.${yestDate}&select=*`).catch(() => []),
      dbGet('sales', `?date=eq.${today}&select=total_amount,employee_id`).catch(() => []),
      dbGet('sales', `?date=gte.${pm.start}&date=lte.${pm.end}&select=total_amount,employee_id,product_name`).catch(() => []),
      dbGet('leave_requests', '?status=eq.pending&select=*').catch(() => [])
    ]);

    let employees = allEmpRaw || [];
    let todayAtt = todayAttRaw || [];
    let yestAtt = yestAttRaw || [];
    let todaySales = todaySalesRaw || [];
    let monthSales = monthSalesRaw || [];
    let leaves = leavesRaw || [];

    if (tlMode) {
      const ids = Array.isArray(teamIds) ? teamIds : [];
      employees = employees.filter(e => ids.includes(Number(e.id)));
      todayAtt = todayAtt.filter(a => ids.includes(Number(a.employee_id)));
      yestAtt = yestAtt.filter(a => ids.includes(Number(a.employee_id)));
      todaySales = todaySales.filter(s => ids.includes(Number(s.employee_id)));
      monthSales = monthSales.filter(s => ids.includes(Number(s.employee_id)));
      leaves = leaves.filter(l => ids.includes(Number(l.employee_id)));
    }

    window.allEmployees = employees;
    window._todayAtt = todayAtt;
    window._todayPresentIds = todayAtt.map(a => Number(a.employee_id));
    window._yestAtt = yestAtt;
    window._yestPresentIds = yestAtt.map(a => Number(a.employee_id));

    const present = todayAtt.length;
    const absent = Math.max(0, employees.length - present);
    const yPresent = yestAtt.length;
    const yAbsent = Math.max(0, employees.length - yPresent);

    setText('adm-present', String(present));
    setText('adm-absent', String(absent));
    setText('adm-present-yest', String(yPresent));
    setText('adm-absent-yest', String(yAbsent));

    toggleSalesVisibility(salesAllowed);

    if (salesAllowed) {
      let todayTotal = 0;
      let monthTotal = 0;

      todaySales.forEach(s => { todayTotal += n(s.total_amount); });
      monthSales.forEach(s => { monthTotal += n(s.total_amount); });

      setText('adm-sales-today', 'EGP ' + fmtEGP(todayTotal));
      setText('adm-sales-month', 'EGP ' + fmtEGP(monthTotal));

      window._dashboardTodaySales = todaySales;
      window._dashboardMonthSales = monthSales;

      renderPerformanceRanking(monthSales);
    } else {
      setText('adm-sales-today', ar ? 'غير متاح' : 'N/A');
      setText('adm-sales-month', ar ? 'غير متاح' : 'N/A');
      setHTML(
        'adm-performance-list',
        `<div class="empty"><div class="empty-icon">🔒</div>${ar ? 'غير متاح للتيم ليدر' : 'Not available for team leader'}</div>`
      );
    }

    if (typeof applyLang === 'function') applyLang();

    const empTodayEl = document.getElementById('adm-emp-today');
    if (empTodayEl) {
      if (!employees.length) {
        empTodayEl.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
      } else {
        empTodayEl.innerHTML = employees.map(emp => {
          const att = todayAtt.find(a => sameId(a.employee_id, emp.id));
          const mapLink = att && att.location_lat
            ? `https://maps.google.com/?q=${att.location_lat},${att.location_lng}`
            : null;

          const avatar = emp.profile_photo
            ? `<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">`
            : ((emp.name || '?')[0]).toUpperCase();

          const attLine = att
            ? `<div style="font-size:10px;color:var(--green);margin-top:2px">
                 ${ar ? 'دخول' : 'In'}: ${att.check_in || '-'}
                 ${n(att.late_minutes) > 0 ? (ar ? ` (تأخر ${att.late_minutes} د)` : ` (${att.late_minutes}m late)`) : ''}
                 ${att.check_out ? ((ar ? ' · خروج: ' : ' · Out: ') + att.check_out) : ''}
               </div>`
            : '';

          const locationLine = mapLink
            ? `<a href="${mapLink}" target="_blank" style="font-size:10px;color:var(--blue);text-decoration:none">📍 ${ar ? 'عرض الموقع' : 'View Location'}</a>`
            : (att ? `<div style="font-size:10px;color:var(--muted)">📍 ${ar ? 'لا يوجد موقع' : 'No location'}</div>` : '');

          const badge = att
            ? (att.check_out
                ? `<span class="badge badge-blue">${ar ? 'غادر' : 'Left'}</span>`
                : `<span class="badge badge-green">${ar ? 'حاضر' : 'Present'}</span>`)
            : `<span class="badge badge-red">${ar ? 'غائب' : 'Absent'}</span>`;

          const selfie = att && att.selfie_in
            ? `<img src="${att.selfie_in}" class="selfie-preview" onclick="viewSelfie('${String(emp.name || '').replace(/'/g, "\\'")}','${att.selfie_in}','${att.selfie_out || ''}','${mapLink || ''}')">`
            : '';

          const warnBtn = `<button class="action-btn warn" onclick="openWarnModal(${emp.id},'${String(emp.name || '').replace(/'/g, "\\'")}')">⚠️</button>`;

          return `
            <div class="emp-card">
              <div class="emp-avatar" style="overflow:hidden">${avatar}</div>
              <div class="emp-info">
                <div class="emp-name">${emp.name || '-'}</div>
                <div class="emp-branch">${emp.branch || '-'}</div>
                ${attLine}
                ${locationLine}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
                ${badge}
                ${selfie}
                ${warnBtn}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    const leaveEl = document.getElementById('adm-leave-requests');
    if (leaveEl) {
      if (!leaves.length) {
        leaveEl.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:8px">${ar ? 'لا توجد طلبات معلقة' : 'No pending requests'}</div>`;
      } else {
        leaveEl.innerHTML = leaves.map(l => `
          <div class="perm-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:13px;font-weight:700">${l.employee_name || '-'}</div>
              <span class="badge ${l.leave_type === 'vacation' ? 'badge-blue' : 'badge-yellow'}">
                ${l.leave_type === 'vacation' ? (ar ? 'إجازة' : 'Vacation') : (ar ? 'إذن' : 'Permission')}
              </span>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${l.reason || '-'}</div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
              ${
                l.leave_type === 'vacation'
                  ? (ar ? 'تاريخ: ' : 'Date: ') + (l.leave_date || '')
                  : (ar ? 'المدة: ' : 'Duration: ') + n(l.duration_minutes) + (ar ? ' د' : ' min')
              }
            </div>
            <div style="display:flex;gap:8px">
              <button class="perm-btn approve" onclick="respondLeave(${l.id},'approved')">✅ ${ar ? 'موافقة' : 'Approve'}</button>
              <button class="perm-btn reject" onclick="respondLeave(${l.id},'rejected')">❌ ${ar ? 'رفض' : 'Reject'}</button>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.error('[dashboard]', e);
  }
}

function renderPerformanceRanking(monthSales = []) {
  const el = document.getElementById('adm-performance-list');
  const ar = currentLang === 'ar';

  if (!el) return;

  if (isTL()) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔒</div>${ar ? 'غير متاح للتيم ليدر' : 'Not available for team leader'}</div>`;
    return;
  }

  if (!allEmployees || !allEmployees.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>${ar ? 'لا توجد بيانات' : 'No data'}</div>`;
    return;
  }

  const salesByEmp = {};
  monthSales.forEach(s => {
    const empId = Number(s.employee_id);
    salesByEmp[empId] = (salesByEmp[empId] || 0) + n(s.total_amount);
  });

  const ranked = allEmployees
    .filter(e => roleOf() === 'team_leader' ? false : String(e.role || '') !== 'team_leader')
    .map(e => ({ ...e, sales: salesByEmp[Number(e.id)] || 0 }))
    .sort((a, b) => b.sales - a.sales);

  if (!ranked.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>${ar ? 'لا توجد بيانات' : 'No data'}</div>`;
    return;
  }

  const maxSales = ranked[0]?.sales || 1;
  const medals = ['🥇', '🥈', '🥉'];

  el.innerHTML = ranked.map((e, i) => `
    <div class="perf-bar-wrap">
      <div class="perf-rank">${medals[i] || '#' + (i + 1)}</div>
      <div class="perf-name">${e.name || '-'}</div>
      <div class="perf-bar-bg">
        <div class="perf-bar-fill" style="width:${e.sales > 0 ? Math.max(4, Math.round((e.sales / maxSales) * 100)) : 0}%;background:${i === 0 ? 'var(--gold)' : i === 1 ? 'var(--silver)' : i === 2 ? 'var(--bronze)' : 'var(--green)'}"></div>
      </div>
      <div class="perf-val">EGP ${fmtEGP(e.sales)}</div>
    </div>
  `).join('');
}

function showAttList(type, day) {
  const ar = currentLang === 'ar';
  const isToday = day === 'today';
  const attData = isToday ? (window._todayAtt || []) : (window._yestAtt || []);
  const presentIds = attData.map(a => Number(a.employee_id));

  const empMap = {};
  (allEmployees || []).forEach(e => { empMap[Number(e.id)] = e; });

  const isPresent = type === 'present';
  const list = isPresent
    ? attData.map(a => ({ emp: empMap[Number(a.employee_id)] || { name: String(a.employee_id) }, att: a }))
    : (allEmployees || []).filter(e => !presentIds.includes(Number(e.id))).map(e => ({ emp: e, att: null }));

  const color = isPresent ? 'var(--green)' : 'var(--red)';
  const icon = isPresent ? '✅' : '😴';
  const titleAr = isPresent
    ? (isToday ? 'الحاضرون اليوم' : 'حاضرون أمس')
    : (isToday ? 'الغائبون اليوم' : 'غائبون أمس');
  const titleEn = isPresent
    ? (isToday ? 'Present Today' : 'Present Yesterday')
    : (isToday ? 'Absent Today' : 'Absent Yesterday');

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:8000;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';
  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px 18px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid ${color}">
      <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:14px">${icon} ${ar ? titleAr : titleEn} (${list.length})</div>

      ${list.length === 0
        ? `<div style="text-align:center;color:var(--muted);padding:20px">${ar ? 'لا يوجد' : 'None'}</div>`
        : list.map(item => {
            const e = item.emp || {};
            const a = item.att;
            const detail = a
              ? `${ar ? 'دخول' : 'In'}: ${a.check_in || '-'}${n(a.late_minutes) > 0 ? ' · ⚠️' + a.late_minutes + (ar ? 'د' : 'm') : ''}${a.check_out ? (ar ? ' · خروج: ' : ' · Out: ') + a.check_out : ''}`
              : (e.branch || '-');

            const avatar = e.profile_photo
              ? `<img src="${e.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
              : ((e.name || '?')[0]).toUpperCase();

            return `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">${avatar}</div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:700">${e.name || '?'}</div>
                  <div style="font-size:11px;color:var(--muted)">${detail}</div>
                </div>
              </div>
            `;
          }).join('')
      }

      <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

Object.assign(window, {
  loadAdminDashboard,
  renderPerformanceRanking,
  showAttList
});
