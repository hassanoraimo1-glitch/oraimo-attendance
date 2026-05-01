// ═══════════════════════════════════════════════════════════
// modules/admin/dashboard.js — Admin dashboard (home) + perf ranking
// Globals: loadAdminDashboard, renderPerformanceRanking, showAttList
// Safe version to avoid global redeclare conflicts
// ═══════════════════════════════════════════════════════════

(() => {
  function _dashNormalizeRole(role) {
    if (typeof window.normalizeRole === 'function') {
      try { return window.normalizeRole(role); } catch (_) {}
    }

    const raw = String(role || '').trim().toLowerCase();

    if (['superadmin', 'super_admin', 'super admin'].includes(raw)) return 'super_admin';
    if (['teamleader', 'team_leader', 'team leader', 'tl', 'manager'].includes(raw)) return 'team_leader';
    return raw;
  }

  function _dashRoleOf() {
    return _dashNormalizeRole(window.currentUser?.role);
  }

  function _dashIsTL() {
    return _dashRoleOf() === 'team_leader';
  }

  function _dashIsAdminLike() {
    return ['admin', 'super_admin'].includes(_dashRoleOf());
  }

  function _dashN(v) {
    return Number(v || 0);
  }

  function _dashSameId(a, b) {
    return Number(a) === Number(b);
  }

  function _dashEscapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _dashEscapeJsStr(str) {
    return String(str ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }

  function _dashTodayStr() {
    if (typeof window.todayStr === 'function') {
      try { return window.todayStr(); } catch (_) {}
    }
    return new Date().toISOString().slice(0, 10);
  }

  function _dashGetPayrollMonth() {
    if (typeof window.getPayrollMonth === 'function') {
      try { return window.getPayrollMonth(); } catch (_) {}
    }

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return { start: fmt(startDate), end: fmt(endDate) };
  }

  function _dashFmtEGP(v) {
    if (typeof window.fmtEGP === 'function') {
      try { return window.fmtEGP(v); } catch (_) {}
    }
    return Number(v || 0).toLocaleString('en-US');
  }

  async function _dashGetCurrentTeamIds() {
    if (!window.currentUser?.id || !_dashIsTL()) return null;

    if (typeof window.getManagerTeamIds === 'function') {
      try {
        const ids = await window.getManagerTeamIds();
        return Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
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

  function _dashSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function _dashSetHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function _dashToggleSalesVisibility(show) {
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

  function _dashGetEmployeesRef() {
    return Array.isArray(window.allEmployees) ? window.allEmployees : [];
  }

  async function loadAdminDashboard() {
    const loader = document.getElementById('dash-loader');
    const dashC = document.getElementById('dash-content');

    if (loader) loader.style.display = 'none';
    if (dashC) dashC.style.display = 'block';

    try {
      const today = _dashTodayStr();
      const pm = _dashGetPayrollMonth();
      const ar = window.currentLang === 'ar';
      const yestDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      const teamIds = await _dashGetCurrentTeamIds();
      const tlMode = _dashIsTL();
      const salesAllowed = _dashIsAdminLike();

      const [
        allEmpRaw,
        todayAttRaw,
        yestAttRaw,
        todaySalesRaw,
        monthSalesRaw,
        leavesRaw
      ] = await Promise.all([
        dbGet('employees', '?select=*').catch(() => []),
        dbGet('attendance', `?date=eq.${today}&select=*`).catch(() => []),
        dbGet('attendance', `?date=eq.${yestDate}&select=*`).catch(() => []),
        dbGet('sales', `?date=eq.${today}&select=total_amount,employee_id`).catch(() => []),
        dbGet('sales', `?date=gte.${pm.start}&date=lte.${pm.end}&select=total_amount,employee_id,product_name`).catch(() => []),
        dbGet('leave_requests', '?status=eq.pending&select=*').catch(() => [])
      ]);

      let employees = Array.isArray(allEmpRaw) ? allEmpRaw : [];
      let todayAtt = Array.isArray(todayAttRaw) ? todayAttRaw : [];
      let yestAtt = Array.isArray(yestAttRaw) ? yestAttRaw : [];
      let todaySales = Array.isArray(todaySalesRaw) ? todaySalesRaw : [];
      let monthSales = Array.isArray(monthSalesRaw) ? monthSalesRaw : [];
      let leaves = Array.isArray(leavesRaw) ? leavesRaw : [];

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

      _dashSetText('adm-present', String(present));
      _dashSetText('adm-absent', String(absent));
      _dashSetText('adm-present-yest', String(yPresent));
      _dashSetText('adm-absent-yest', String(yAbsent));

      _dashToggleSalesVisibility(salesAllowed);

      if (salesAllowed) {
        let todayTotal = 0;
        let monthTotal = 0;

        todaySales.forEach(s => { todayTotal += _dashN(s.total_amount); });
        monthSales.forEach(s => { monthTotal += _dashN(s.total_amount); });

        _dashSetText('adm-sales-today', 'EGP ' + _dashFmtEGP(todayTotal));
        _dashSetText('adm-sales-month', 'EGP ' + _dashFmtEGP(monthTotal));

        window._dashboardTodaySales = todaySales;
        window._dashboardMonthSales = monthSales;

        renderPerformanceRanking(monthSales);
      } else {
        _dashSetText('adm-sales-today', ar ? 'غير متاح' : 'N/A');
        _dashSetText('adm-sales-month', ar ? 'غير متاح' : 'N/A');
        _dashSetHTML(
          'adm-performance-list',
          `<div class="empty"><div class="empty-icon">🔒</div>${ar ? 'غير متاح للتيم ليدر' : 'Not available for team leader'}</div>`
        );
      }

      if (typeof window.applyLang === 'function') {
        try { window.applyLang(); } catch (_) {}
      }

      const empTodayEl = document.getElementById('adm-emp-today');
      if (empTodayEl) {
        if (!employees.length) {
          empTodayEl.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
        } else {
          empTodayEl.innerHTML = employees.map(emp => {
            const att = todayAtt.find(a => _dashSameId(a.employee_id, emp.id));
            const mapLink = att && att.location_lat
              ? `https://maps.google.com/?q=${att.location_lat},${att.location_lng}`
              : null;

            const avatar = emp.profile_photo
              ? `<img src="${_dashEscapeHtml(emp.profile_photo)}" style="width:100%;height:100%;object-fit:cover">`
              : _dashEscapeHtml(((emp.name || '?')[0] || '?').toUpperCase());

            const attLine = att
              ? `<div style="font-size:10px;color:var(--green);margin-top:2px">
                   ${ar ? 'دخول' : 'In'}: ${_dashEscapeHtml(att.check_in || '-')}
                   ${_dashN(att.late_minutes) > 0 ? (ar ? ` (تأخر ${_dashEscapeHtml(att.late_minutes)} د)` : ` (${_dashEscapeHtml(att.late_minutes)}m late)`) : ''}
                   ${att.check_out ? ((ar ? ' · خروج: ' : ' · Out: ') + _dashEscapeHtml(att.check_out)) : ''}
                 </div>`
              : '';

            const locationLine = mapLink
              ? `<a href="${_dashEscapeHtml(mapLink)}" target="_blank" style="font-size:10px;color:var(--blue);text-decoration:none">📍 ${ar ? 'عرض الموقع' : 'View Location'}</a>`
              : (att ? `<div style="font-size:10px;color:var(--muted)">📍 ${ar ? 'لا يوجد موقع' : 'No location'}</div>` : '');

            const badge = att
              ? (att.check_out
                  ? `<span class="badge badge-blue">${ar ? 'غادر' : 'Left'}</span>`
                  : `<span class="badge badge-green">${ar ? 'حاضر' : 'Present'}</span>`)
              : `<span class="badge badge-red">${ar ? 'غائب' : 'Absent'}</span>`;

            const selfie = att && att.selfie_in
              ? `<img src="${_dashEscapeHtml(att.selfie_in)}" class="selfie-preview" onclick="viewSelfie('${_dashEscapeJsStr(emp.name || '')}','${_dashEscapeJsStr(att.selfie_in)}','${_dashEscapeJsStr(att.selfie_out || '')}','${_dashEscapeJsStr(mapLink || '')}')">`
              : '';

            const warnBtn = `<button class="action-btn warn" onclick="openWarnModal(${Number(emp.id)},'${_dashEscapeJsStr(emp.name || '')}')">⚠️</button>`;

            return `
              <div class="emp-card">
                <div class="emp-avatar" style="overflow:hidden">${avatar}</div>
                <div class="emp-info">
                  <div class="emp-name">${_dashEscapeHtml(emp.name || '-')}</div>
                  <div class="emp-branch">${_dashEscapeHtml(emp.branch || '-')}</div>
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
                <div style="font-size:13px;font-weight:700">${_dashEscapeHtml(l.employee_name || '-')}</div>
                <span class="badge ${l.leave_type === 'vacation' ? 'badge-blue' : 'badge-yellow'}">
                  ${l.leave_type === 'vacation' ? (ar ? 'إجازة' : 'Vacation') : (ar ? 'إذن' : 'Permission')}
                </span>
              </div>
              <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${_dashEscapeHtml(l.reason || '-')}</div>
              <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
                ${
                  l.leave_type === 'vacation'
                    ? (ar ? 'تاريخ: ' : 'Date: ') + _dashEscapeHtml(l.leave_date || '')
                    : (ar ? 'المدة: ' : 'Duration: ') + _dashN(l.duration_minutes) + (ar ? ' د' : ' min')
                }
              </div>
              <div style="display:flex;gap:8px">
                <button class="perm-btn approve" onclick="respondLeave(${Number(l.id)},'approved')">✅ ${ar ? 'موافقة' : 'Approve'}</button>
                <button class="perm-btn reject" onclick="respondLeave(${Number(l.id)},'rejected')">❌ ${ar ? 'رفض' : 'Reject'}</button>
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
    const ar = window.currentLang === 'ar';
    const employees = _dashGetEmployeesRef();

    if (!el) return;

    if (_dashIsTL()) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">🔒</div>${ar ? 'غير متاح للتيم ليدر' : 'Not available for team leader'}</div>`;
      return;
    }

    if (!employees.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>${ar ? 'لا توجد بيانات' : 'No data'}</div>`;
      return;
    }

    const salesByEmp = {};
    (Array.isArray(monthSales) ? monthSales : []).forEach(s => {
      const empId = Number(s.employee_id);
      salesByEmp[empId] = (salesByEmp[empId] || 0) + _dashN(s.total_amount);
    });

    const ranked = employees
      .filter(e => {
        const r = _dashNormalizeRole(e.role || e.user_role || '');
        return !['team_leader', 'admin', 'super_admin'].includes(r);
      })
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
        <div class="perf-name">${_dashEscapeHtml(e.name || '-')}</div>
        <div class="perf-bar-bg">
          <div class="perf-bar-fill" style="width:${e.sales > 0 ? Math.max(4, Math.round((e.sales / maxSales) * 100)) : 0}%;background:${i === 0 ? 'var(--gold)' : i === 1 ? 'var(--silver)' : i === 2 ? 'var(--bronze)' : 'var(--green)'}"></div>
        </div>
        <div class="perf-val">EGP ${_dashFmtEGP(e.sales)}</div>
      </div>
    `).join('');
  }

  function showAttList(type, day) {
    const ar = window.currentLang === 'ar';
    const isToday = day === 'today';
    const attData = isToday ? (window._todayAtt || []) : (window._yestAtt || []);
    const presentIds = attData.map(a => Number(a.employee_id));
    const employees = _dashGetEmployeesRef();

    const empMap = {};
    employees.forEach(e => { empMap[Number(e.id)] = e; });

    const isPresent = type === 'present';
    const list = isPresent
      ? attData.map(a => ({ emp: empMap[Number(a.employee_id)] || { name: String(a.employee_id) }, att: a }))
      : employees.filter(e => !presentIds.includes(Number(e.id))).map(e => ({ emp: e, att: null }));

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
                ? `${ar ? 'دخول' : 'In'}: ${_dashEscapeHtml(a.check_in || '-')}${_dashN(a.late_minutes) > 0 ? ' · ⚠️' + _dashEscapeHtml(a.late_minutes) + (ar ? 'د' : 'm') : ''}${a.check_out ? (ar ? ' · خروج: ' : ' · Out: ') + _dashEscapeHtml(a.check_out) : ''}`
                : _dashEscapeHtml(e.branch || '-');

              const avatar = e.profile_photo
                ? `<img src="${_dashEscapeHtml(e.profile_photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
                : _dashEscapeHtml(((e.name || '?')[0] || '?').toUpperCase());

              return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
                  <div class="emp-avatar" style="width:36px;height:36px;font-size:13px;overflow:hidden">${avatar}</div>
                  <div style="flex:1">
                    <div style="font-size:13px;font-weight:700">${_dashEscapeHtml(e.name || '?')}</div>
                    <div style="font-size:11px;color:var(--muted)">${detail}</div>
                  </div>
                </div>
              `;
            }).join('')
        }

        <button id="dash-att-close-btn" style="width:100%;padding:13px;background:var(--card2);border:1px solid var(--border);border-radius:14px;color:var(--text);font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:14px">${ar ? 'إغلاق' : 'Close'}</button>
      </div>
    `;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('dash-att-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.remove(), { once: true });
    }
  }

  window.loadAdminDashboard = loadAdminDashboard;
  window.renderPerformanceRanking = renderPerformanceRanking;
  window.showAttList = showAttList;
})();
