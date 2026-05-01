// ═══════════════════════════════════════════════════════════
// modules/admin/dashboard.js — Admin dashboard (home) + perf ranking + attendance tab + sales details
// Globals: loadAdminDashboard, renderPerformanceRanking, showAttList, showSalesDetails, loadAdminAttendance
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

  function _dashDayOffOf(emp) {
    const v = Number(emp?.day_off);
    return Number.isFinite(v) ? v : -1;
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
    if (el) el.textContent = String(value ?? '');
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

  function _dashGetEmpName(empId) {
    const emp = _dashGetEmployeesRef().find(e => Number(e.id) === Number(empId));
    return emp?.name || `#${empId}`;
  }

  function _dashBindSalesCards() {
    const todayEl = document.getElementById('adm-sales-today');
    const monthEl = document.getElementById('adm-sales-month');

    if (todayEl) {
      const todayCard = todayEl.closest('.stat-card') || todayEl;
      if (!todayCard.dataset.boundSalesDetails) {
        todayCard.style.cursor = 'pointer';
        todayCard.onclick = () => showSalesDetails('today');
        todayCard.dataset.boundSalesDetails = '1';
      }
    }

    if (monthEl) {
      const monthCard = monthEl.closest('.stat-card') || monthEl;
      if (!monthCard.dataset.boundSalesDetails) {
        monthCard.style.cursor = 'pointer';
        monthCard.onclick = () => showSalesDetails('month');
        monthCard.dataset.boundSalesDetails = '1';
      }
    }
  }

  function _dashBindAttendanceRefresh() {
    if (window.__dashAttendanceRefreshBound) return;
    window.__dashAttendanceRefreshBound = true;

    document.addEventListener('click', e => {
      const target = e.target?.closest?.('.nav-item,[onclick*="attendance"]');
      if (!target) return;

      const txt = (target.textContent || '').trim();
      const onclickText = String(target.getAttribute?.('onclick') || '');

      if (
        txt.includes('الحضور') ||
        txt.toLowerCase().includes('attendance') ||
        onclickText.includes("adminTab('attendance'") ||
        onclickText.includes('adminTab("attendance"')
      ) {
        setTimeout(() => {
          if (typeof window.loadAdminAttendance === 'function') {
            window.loadAdminAttendance();
          }
        }, 120);
      }
    });
  }

  function _dashRenderEmpTodayList(employees, todayAtt, ar) {
    const empTodayEl = document.getElementById('adm-emp-today');
    if (!empTodayEl) return;

    if (!employees.length) {
      empTodayEl.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${ar ? 'لا يوجد موظفون' : 'No employees'}</div>`;
      return;
    }

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
        ? `<img src="${_dashEscapeHtml(att.selfie_in)}" class="selfie-preview" onclick="viewSelfie && viewSelfie('${_dashEscapeJsStr(emp.name || '')}','${_dashEscapeJsStr(att.selfie_in)}','${_dashEscapeJsStr(att.selfie_out || '')}','${_dashEscapeJsStr(mapLink || '')}')">`
        : '';

      const warnBtn = typeof window.openWarnModal === 'function'
        ? `<button class="action-btn warn" onclick="openWarnModal(${Number(emp.id)},'${_dashEscapeJsStr(emp.name || '')}')">⚠️</button>`
        : '';

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

  function _dashRenderPendingLeaves(leaves, ar) {
    const leaveEl = document.getElementById('adm-leave-requests');
    if (!leaveEl) return;

    if (!leaves.length) {
      leaveEl.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:8px">${ar ? 'لا توجد طلبات معلقة' : 'No pending requests'}</div>`;
      return;
    }

    leaveEl.innerHTML = leaves.map(l => `
      <div class="perm-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:13px;font-weight:700">${_dashEscapeHtml(l.employee_name || '-')}</div>
          <span class="badge ${l.leave_type === 'vacation' ? 'badge-blue' : 'badge-yellow'}">
            ${l.leave_type === 'vacation' ? (window.currentLang === 'ar' ? 'إجازة' : 'Vacation') : (window.currentLang === 'ar' ? 'إذن' : 'Permission')}
          </span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${_dashEscapeHtml(l.reason || '-')}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px">
          ${
            l.leave_type === 'vacation'
              ? ((window.currentLang === 'ar' ? 'تاريخ: ' : 'Date: ') + _dashEscapeHtml(l.leave_date || ''))
              : ((window.currentLang === 'ar' ? 'المدة: ' : 'Duration: ') + _dashN(l.duration_minutes) + (window.currentLang === 'ar' ? ' د' : ' min'))
          }
        </div>
        <div style="display:flex;gap:8px">
          <button class="perm-btn approve" onclick="respondLeave && respondLeave(${Number(l.id)},'approved')">✅ ${window.currentLang === 'ar' ? 'موافقة' : 'Approve'}</button>
          <button class="perm-btn reject" onclick="respondLeave && respondLeave(${Number(l.id)},'rejected')">❌ ${window.currentLang === 'ar' ? 'رفض' : 'Reject'}</button>
        </div>
      </div>
    `).join('');
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
        dbGet('sales', `?date=eq.${today}&select=id,employee_id,product_name,quantity,unit_price,total_amount,date,created_at&order=created_at.desc`).catch(() => []),
        dbGet('sales', `?date=gte.${pm.start}&date=lte.${pm.end}&select=id,employee_id,product_name,quantity,unit_price,total_amount,date,created_at&order=date.desc,created_at.desc`).catch(() => []),
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
      window._dashboardTodaySales = todaySales;
      window._dashboardMonthSales = monthSales;

      const todayWeekDay = new Date().getDay();
      const yestWeekDay = new Date(yestDate).getDay();

      const activeTodayEmployees = employees.filter(e => _dashDayOffOf(e) !== todayWeekDay);
      const activeYestEmployees = employees.filter(e => _dashDayOffOf(e) !== yestWeekDay);

      const present = todayAtt.length;
      const absent = Math.max(0, activeTodayEmployees.length - present);
      const yPresent = yestAtt.length;
      const yAbsent = Math.max(0, activeYestEmployees.length - yPresent);

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

        renderPerformanceRanking(monthSales);
      } else {
        _dashSetText('adm-sales-today', ar ? 'غير متاح' : 'N/A');
        _dashSetText('adm-sales-month', ar ? 'غير متاح' : 'N/A');
        _dashSetHTML(
          'adm-performance-list',
          `<div class="empty"><div class="empty-icon">🔒</div>${ar ? 'غير متاح للتيم ليدر' : 'Not available for team leader'}</div>`
        );
      }

      _dashBindSalesCards();
      _dashBindAttendanceRefresh();
      _dashRenderEmpTodayList(employees, todayAtt, ar);
      _dashRenderPendingLeaves(leaves, ar);

      _dashSetText('att-tab-present', String(present));
      _dashSetText('att-tab-left', String(todayAtt.filter(a => !!a.check_out).length));
      _dashSetText('att-tab-inside', String(todayAtt.filter(a => !!a.check_in && !a.check_out).length));
      _dashSetText('att-tab-absent', String(absent));

      await loadAdminAttendance();

      if (typeof window.applyLang === 'function') {
        try { window.applyLang(); } catch (_) {}
      }
    } catch (e) {
      console.error('[dashboard]', e);
    }
  }

  async function loadAdminAttendance() {
    const ar = window.currentLang === 'ar';
    const today = _dashTodayStr();
    const listEl = document.getElementById('admin-attendance-list');

    try {
      let employees = _dashGetEmployeesRef();

      if (!employees.length) {
        employees = await dbGet('employees', '?select=*').catch(() => []) || [];
        if (_dashIsTL()) {
          const teamIds = await _dashGetCurrentTeamIds();
          const ids = Array.isArray(teamIds) ? teamIds : [];
          employees = employees.filter(e => ids.includes(Number(e.id)));
        }
        window.allEmployees = employees;
      }

      let attendance = await dbGet(
        'attendance',
        `?date=eq.${today}&select=*&order=check_in.asc`
      ).catch(() => []) || [];

      if (_dashIsTL()) {
        const teamIds = await _dashGetCurrentTeamIds();
        const ids = Array.isArray(teamIds) ? teamIds : [];
        attendance = attendance.filter(a => ids.includes(Number(a.employee_id)));
      }

      window._todayAtt = attendance;

      const empMap = {};
      employees.forEach(e => { empMap[Number(e.id)] = e; });

      const presentCount = attendance.length;
      const leftCount = attendance.filter(a => !!a.check_out).length;
      const insideCount = attendance.filter(a => !!a.check_in && !a.check_out).length;

      const todayWeekDay = new Date().getDay();
      const activeEmployees = employees.filter(e => _dashDayOffOf(e) !== todayWeekDay);
      const absentCount = Math.max(0, activeEmployees.length - presentCount);

      _dashSetText('att-tab-present', String(presentCount));
      _dashSetText('att-tab-left', String(leftCount));
      _dashSetText('att-tab-inside', String(insideCount));
      _dashSetText('att-tab-absent', String(absentCount));

      if (!listEl) return;

      if (!attendance.length) {
        listEl.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${ar ? 'لا يوجد حضور اليوم' : 'No attendance today'}</div>`;
        return;
      }

      const sorted = [...attendance].sort((a, b) => {
        const an = String(a.check_in || '');
        const bn = String(b.check_in || '');
        return an.localeCompare(bn);
      });

      listEl.innerHTML = sorted.map(a => {
        const emp = empMap[Number(a.employee_id)] || {};
        const status = a.check_out
          ? `<span class="badge badge-blue">${ar ? 'انصرف' : 'Checked Out'}</span>`
          : `<span class="badge badge-green">${ar ? 'داخل الشيفت' : 'In Shift'}</span>`;

        const mapLink = a.location_lat
          ? `https://maps.google.com/?q=${a.location_lat},${a.location_lng}`
          : '';

        const avatar = emp.profile_photo
          ? `<img src="${_dashEscapeHtml(emp.profile_photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
          : _dashEscapeHtml(((emp.name || '?')[0] || '?').toUpperCase());

        return `
          <div class="emp-card">
            <div class="emp-avatar" style="overflow:hidden">${avatar}</div>
            <div class="emp-info">
              <div class="emp-name">${_dashEscapeHtml(emp.name || `#${a.employee_id}`)}</div>
              <div class="emp-branch">${_dashEscapeHtml(emp.branch || '-')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:3px">
                ${ar ? 'دخول' : 'In'}: ${_dashEscapeHtml(a.check_in || '-')}
                ${a.check_out ? ` · ${ar ? 'خروج' : 'Out'}: ${_dashEscapeHtml(a.check_out)}` : ''}
              </div>
              <div style="font-size:10px;color:${_dashN(a.late_minutes) > 0 ? 'var(--yellow)' : 'var(--muted)'};margin-top:3px">
                ${_dashN(a.late_minutes) > 0 ? (ar ? `تأخير ${_dashN(a.late_minutes)} د` : `${_dashN(a.late_minutes)}m late`) : (ar ? 'في الميعاد' : 'On time')}
              </div>
              ${mapLink ? `<a href="${_dashEscapeHtml(mapLink)}" target="_blank" style="font-size:10px;color:var(--blue);text-decoration:none">📍 ${ar ? 'عرض الموقع' : 'View Location'}</a>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              ${status}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('[loadAdminAttendance]', e);
      if (listEl) {
        listEl.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>${ar ? 'تعذر تحميل الحضور' : 'Failed to load attendance'}</div>`;
      }
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

  function showSalesDetails(period = 'today') {
    const ar = window.currentLang === 'ar';
    const sales = period === 'month'
      ? (Array.isArray(window._dashboardMonthSales) ? window._dashboardMonthSales : [])
      : (Array.isArray(window._dashboardTodaySales) ? window._dashboardTodaySales : []);

    if (!sales.length) {
      if (typeof window.notify === 'function') {
        window.notify(ar ? 'لا توجد مبيعات' : 'No sales', 'info');
      }
      return;
    }

    const total = sales.reduce((sum, s) => sum + _dashN(s.total_amount), 0);
    const byEmp = {};

    sales.forEach(s => {
      const empId = Number(s.employee_id);
      if (!byEmp[empId]) {
        byEmp[empId] = {
          employee_id: empId,
          employee_name: _dashGetEmpName(empId),
          total: 0,
          items: []
        };
      }
      byEmp[empId].total += _dashN(s.total_amount);
      byEmp[empId].items.push(s);
    });

    const groups = Object.values(byEmp).sort((a, b) => b.total - a.total);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9500;display:flex;align-items:flex-end;backdrop-filter:blur(4px)';

    overlay.innerHTML = `
      <div style="background:var(--card);border-radius:22px 22px 0 0;padding:20px 16px;width:100%;max-height:80vh;overflow-y:auto;border-top:2px solid var(--green)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:16px;font-weight:800;color:var(--green)">
            ${period === 'month' ? (ar ? '📊 تفاصيل مبيعات الشهر' : '📊 Month Sales Details') : (ar ? '📊 تفاصيل مبيعات اليوم' : '📊 Today Sales Details')}
          </div>
          <button id="dash-sales-close-btn" style="width:38px;height:38px;border:none;border-radius:50%;background:var(--card2);color:var(--text);font-size:18px;cursor:pointer">✕</button>
        </div>

        <div class="card" style="margin-bottom:12px;background:rgba(0,200,83,.06);border-color:rgba(0,200,83,.2)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:12px;color:var(--muted)">${ar ? 'إجمالي المبيعات' : 'Total Sales'}</div>
            <div style="font-size:18px;font-weight:800;color:var(--green)">EGP ${_dashFmtEGP(total)}</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          ${groups.map((g, gi) => `
            <div class="card" style="padding:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div style="font-size:14px;font-weight:800">${gi + 1}. ${_dashEscapeHtml(g.employee_name)}</div>
                <span class="badge badge-green">EGP ${_dashFmtEGP(g.total)}</span>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px">
                ${g.items.map(item => `
                  <div style="padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--card2)">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                      <div style="flex:1">
                        <div style="font-size:13px;font-weight:700">${_dashEscapeHtml(item.product_name || (ar ? 'منتج غير محدد' : 'Unknown product'))}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:3px">
                          ${ar ? 'الكمية' : 'Qty'}: ${_dashN(item.quantity || 1)}
                          ${item.unit_price ? ` · ${ar ? 'سعر الوحدة' : 'Unit Price'}: EGP ${_dashFmtEGP(item.unit_price)}` : ''}
                          ${item.date ? ` · ${_dashEscapeHtml(item.date)}` : ''}
                        </div>
                      </div>
                      <div style="font-size:13px;font-weight:800;color:var(--green)">EGP ${_dashFmtEGP(item.total_amount)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
    overlay.classList.add('open');

    const closeBtn = document.getElementById('dash-sales-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.remove(), { once: true });
    }
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
    const titleAr = isPresent ? (isToday ? 'الحاضرون اليوم' : 'حاضرون أمس') : (isToday ? 'الغائبون اليوم' : 'غائبون أمس');
    const titleEn = isPresent ? (isToday ? 'Present Today' : 'Present Yesterday') : (isToday ? 'Absent Today' : 'Absent Yesterday');

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
    overlay.classList.add('open');

    const closeBtn = document.getElementById('dash-att-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.remove(), { once: true });
    }
  }

  window.loadAdminDashboard = loadAdminDashboard;
  window.renderPerformanceRanking = renderPerformanceRanking;
  window.showAttList = showAttList;
  window.showSalesDetails = showSalesDetails;
  window.loadAdminAttendance = loadAdminAttendance;
})();
