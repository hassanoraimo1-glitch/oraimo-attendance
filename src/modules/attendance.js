// Attendance UI layer
// Responsible only for rendering/presentation.
(function initAttendanceUI(global) {
  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setShiftInfo(text) {
    const el = document.getElementById('emp-shift-info');
    if (!el) return;
    el.textContent = text || '';
  }

  function setAttendStatus(opts) {
    const el = document.getElementById('attend-status');
    if (!el) return;
    const { mode, isArabic, checkInLabel = '-', checkOutLabel = '-', lateMinutes = 0, countdown = '' } = opts || {};
    if (mode === 'checked-in') {
      el.textContent =
        `${isArabic ? 'دخل الساعة' : 'In at'} ${checkInLabel}` +
        `${lateMinutes > 0 ? (isArabic ? ` (تأخر ${lateMinutes} د)` : ` (${lateMinutes}m late)`) : ''}` +
        `${countdown ? (isArabic ? ` • المتبقي: ${countdown}` : ` • Remaining: ${countdown}`) : ''}`;
      return;
    }
    if (mode === 'done') {
      el.textContent = `${isArabic ? 'دخول' : 'In'}: ${checkInLabel} – ${isArabic ? 'خروج' : 'Out'}: ${checkOutLabel}`;
      return;
    }
    el.textContent = isArabic ? 'لم يتم تسجيل حضور اليوم' : 'No attendance recorded today';
  }

  function renderAttendHistory(records, isArabic, to12HourLabel) {
    const el = document.getElementById('emp-attend-history');
    if (!el) return;
    if (!records || records.length === 0) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div>${isArabic ? 'لا توجد سجلات' : 'No records'}</div>`;
      return;
    }
    el.innerHTML = records.map(r => `<div class="att-card-row">
      <div class="att-card-top">
        <div class="att-card-date">${escapeHtml(r.date)}</div>
        <span class="badge ${r.late_minutes > 0 ? 'badge-yellow' : 'badge-green'}">${r.late_minutes > 0 ? `${r.late_minutes}${isArabic ? ' د تأخير' : 'm late'}` : (isArabic ? 'في الوقت' : 'On time')}</span>
      </div>
      <div class="att-card-times">
        <div>${isArabic ? 'دخول' : 'In'}: <strong>${to12HourLabel(r.check_in)}</strong></div>
        <div>${isArabic ? 'خروج' : 'Out'}: <strong>${to12HourLabel(r.check_out)}</strong></div>
      </div>
    </div>`).join('');
  }

  function renderDailyLog(records, isArabic, to12HourLabel) {
    const el = document.getElementById('emp-daily-log');
    if (!el) return;
    if (!records || records.length === 0) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div>${isArabic ? 'لا توجد سجلات' : 'No records'}</div>`;
      return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
      <tr><th>${isArabic ? 'التاريخ' : 'Date'}</th><th>${isArabic ? 'دخول' : 'In'}</th><th>${isArabic ? 'خروج' : 'Out'}</th><th>${isArabic ? 'تأخير' : 'Late'}</th></tr>
      ${records.map(a => `<tr>
        <td>${escapeHtml(a.date)}</td>
        <td>${to12HourLabel(a.check_in)}</td>
        <td>${to12HourLabel(a.check_out)}</td>
        <td>${a.late_minutes > 0 ? `<span class="badge badge-yellow">${a.late_minutes}${isArabic ? 'د' : 'm'}</span>` : '<span class="badge badge-green">✓</span>'}</td>
      </tr>`).join('')}
    </table></div>`;
  }

  function renderMonthlyReport(opts) {
    const el = document.getElementById('monthly-report-emp');
    if (!el) return;
    const { isArabic, payrollLabel, attendanceCount, lateTotal, salesTotal, transactionsCount } = opts;
    const rows = isArabic
      ? [
          ['أيام الحضور', `${attendanceCount} أيام`, 'var(--green)'],
          ['دقائق التأخير', `${lateTotal} د`, 'var(--yellow)'],
          ['إجمالي المبيعات', `EGP ${Number(salesTotal || 0).toLocaleString()}`, 'var(--green)'],
          ['عدد المعاملات', String(transactionsCount), 'var(--text)'],
        ]
      : [
          ['Attendance', `${attendanceCount} days`, 'var(--green)'],
          ['Late', `${lateTotal}m`, 'var(--yellow)'],
          ['Total Sales', `EGP ${Number(salesTotal || 0).toLocaleString()}`, 'var(--green)'],
          ['Transactions', String(transactionsCount), 'var(--text)'],
        ];
    el.innerHTML = `<div class="att-month-label">${escapeHtml(payrollLabel || '')}</div>` +
      rows.map(([k, v, c]) => `<div class="att-month-row"><span>${k}</span><strong style="color:${c}">${v}</strong></div>`).join('');
  }

  global.AttendanceUI = {
    setShiftInfo,
    setAttendStatus,
    renderAttendHistory,
    renderDailyLog,
    renderMonthlyReport,
  };
})(window);

