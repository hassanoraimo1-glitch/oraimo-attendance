// Employee attendance / profile rendering (templates only).
(function initAttendanceUI(global) {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setShiftInfo(text) {
    const el = document.getElementById('emp-shift-info');
    if (el) el.textContent = String(text || '');
  }

  function setAttendStatus(opts) {
    const status = document.getElementById('attend-status');
    if (!status) return;
    const ar = opts.isArabic;
    const mode = opts.mode;
    if (mode === 'none') {
      status.textContent = ar ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';
      return;
    }
    if (mode === 'done') {
      const cin = opts.checkInLabel || '-';
      const cout = opts.checkOutLabel || '-';
      status.textContent = `${ar ? 'دخول' : 'In'}: ${cin} – ${ar ? 'خروج' : 'Out'}: ${cout}`;
      return;
    }
    if (mode === 'checked-in') {
      let t = `${ar ? 'دخل الساعة' : 'In at'} ${opts.checkInLabel || '-'}`;
      if (opts.lateMinutes > 0) t += ar ? ` (تأخر ${opts.lateMinutes} د)` : ` (${opts.lateMinutes}m late)`;
      if (opts.countdown) t += ar ? ` • المتبقي: ${opts.countdown}` : ` • Remaining: ${opts.countdown}`;
      status.textContent = t;
    }
  }

  function renderAttendHistory(records, isArabic, to12Hour) {
    const el = document.getElementById('emp-attend-history');
    if (!el) return;
    const list = records || [];
    if (!list.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div>${isArabic ? 'لا يوجد سجل' : 'No records'}</div>`;
      return;
    }
    el.innerHTML = list.map((r) => {
      const late = r.late_minutes > 0
        ? `<span class="badge badge-yellow" style="font-size:9px">⚠️ ${r.late_minutes}${isArabic ? 'د' : 'm'}</span>`
        : `<span class="badge badge-green" style="font-size:9px">${isArabic ? 'في الوقت' : 'On time'}</span>`;
      const out = r.check_out
        ? `<span style="color:var(--muted);font-size:11px">${isArabic ? 'خروج' : 'Out'} ${esc(to12Hour(r.check_out))}</span>`
        : `<span class="badge badge-green" style="font-size:9px">${isArabic ? 'لم يخرج' : 'Still in'}</span>`;
      return `<div class="history-item">
        <div class="hist-top">
          <div class="hist-name">${esc(r.date)}</div>
          ${late}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          <span style="color:var(--muted);font-size:11px">${isArabic ? 'دخول' : 'In'}: ${esc(to12Hour(r.check_in))}</span>
          ${out}
        </div>
      </div>`;
    }).join('');
  }

  function renderDailyLog(att, isArabic, to12Hour) {
    const el = document.getElementById('emp-daily-log');
    if (!el) return;
    const rows = att || [];
    if (!rows.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📅</div>${isArabic ? 'لا يوجد حضور' : 'No attendance'}</div>`;
      return;
    }
    el.innerHTML = rows.map((r) => `<div class="history-item">
      <div class="hist-top">
        <div class="hist-name">${esc(r.date)}</div>
        <div class="hist-amount" style="font-size:11px;color:var(--green)">${esc(to12Hour(r.check_in))}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between">
        <span>${isArabic ? 'خروج' : 'Out'}: ${r.check_out ? esc(to12Hour(r.check_out)) : '—'}</span>
        ${r.late_minutes > 0 ? `<span style="color:var(--yellow)">⚠️ ${r.late_minutes}${isArabic ? ' د' : 'm'}</span>` : ''}
      </div>
    </div>`).join('');
  }

  function renderMonthlyReport(opts) {
    const el = document.getElementById('monthly-report-emp');
    if (!el) return;
    const ar = opts.isArabic;
    const fmt = global.fmtEGP || ((n) => String(Math.round(Number(n) || 0)));
    el.innerHTML = `<div class="stats-grid" style="margin-bottom:0">
      <div class="stat-card"><div class="stat-label">${ar ? 'أيام الحضور' : 'Days present'}</div><div class="stat-val" style="color:var(--green)">${opts.attendanceCount}</div></div>
      <div class="stat-card"><div class="stat-label">${ar ? 'دقائق التأخير' : 'Late (min)'}</div><div class="stat-val" style="color:var(--yellow)">${opts.lateTotal}${ar ? ' د' : ''}</div></div>
      <div class="stat-card"><div class="stat-label">${ar ? 'مبيعات الشهر' : 'Month sales'}</div><div class="stat-val" style="color:var(--green);font-size:14px">EGP ${esc(fmt(opts.salesTotal))}</div></div>
      <div class="stat-card"><div class="stat-label">${ar ? 'عمليات البيع' : 'Sale txns'}</div><div class="stat-val">${opts.transactionsCount}</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:10px">${esc(opts.payrollLabel || '')}</div>`;
  }

  global.AttendanceUI = {
    setShiftInfo,
    setAttendStatus,
    renderAttendHistory,
    renderDailyLog,
    renderMonthlyReport,
  };
})(window);
