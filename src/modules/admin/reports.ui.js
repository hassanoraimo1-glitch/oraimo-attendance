// Admin reports UI — HTML templates for reports.js.
(function initAdminReportsUI(global) {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setLoading(container) {
    if (!container) return;
    container.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  }

  function setEmpty(container, icon, message) {
    if (!container) return;
    container.innerHTML = `<div class="empty"><div class="empty-icon">${esc(icon)}</div>${esc(message)}</div>`;
  }

  function renderEmployeeReport(container, data) {
    if (!container) return;
    const ar = data.ar;
    const fmt = global.fmtEGP || ((n) => String(Math.round(Number(n) || 0)));
    const { empName, tlName, pmLabel, att, sales, pct, kpct, kmodel, salesTotal, lateTotal, target, chartDays, salesByDate } = data;
    const days = (chartDays || []).slice(-14);
    const vals = days.map((d) => Number((salesByDate || {})[d.ds]) || 0);
    const max = Math.max(...vals, 1);
    const chartHtml = days.length
      ? `<div class="chart-wrap" style="margin-top:8px">${days.map((d) => {
        const v = Number((salesByDate || {})[d.ds]) || 0;
        const h = Math.max(4, Math.round((v / max) * 120));
        return `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}px;background:${v > 0 ? 'var(--green)' : 'var(--border)'}"></div><div class="chart-label">${d.day}</div></div>`;
      }).join('')}</div>`
      : '';

    const attRows = (att || []).slice(0, 12).map((r) => `<div class="history-item">
      <div class="hist-top"><div class="hist-name">${esc(r.date)}</div></div>
      <div style="font-size:11px;color:var(--muted)">${ar ? 'دخول' : 'In'}: ${esc(r.check_in || '')}${r.check_out ? ` · ${ar ? 'خروج' : 'Out'}: ${esc(r.check_out)}` : ''}</div>
    </div>`).join('');

    const saleRows = (sales || []).slice(0, 15).map((s) => `<div class="history-item">
      <div class="hist-top"><div class="hist-name">${esc(s.product_name)}</div><div class="hist-amount">${fmt(s.total_amount)}</div></div>
      <div class="hist-meta">${esc(s.date)} · ${ar ? 'الكمية' : 'Qty'}: ${s.quantity}</div>
    </div>`).join('');

    container.innerHTML = `
      <div class="card card-glow" style="margin-bottom:10px">
        <div style="font-size:15px;font-weight:800;margin-bottom:4px">${esc(empName)}</div>
        <div style="font-size:12px;color:var(--muted)">${ar ? 'تيم ليدر' : 'Team leader'}: ${esc(tlName)} · ${esc(pmLabel)}</div>
        <div class="stats-grid" style="margin-top:12px">
          <div class="stat-card"><div class="stat-label">${ar ? 'مبيعات الشهر' : 'Month sales'}</div><div class="stat-val" style="color:var(--green)">EGP ${esc(fmt(salesTotal))}</div></div>
          <div class="stat-card"><div class="stat-label">${ar ? 'التارجت' : 'Target'}</div><div class="stat-val">EGP ${esc(fmt(target))}</div></div>
          <div class="stat-card"><div class="stat-label">${ar ? 'الإنجاز' : 'Achieved'}</div><div class="stat-val" style="color:var(--green)">${pct}%</div></div>
          <div class="stat-card"><div class="stat-label">${ar ? 'تأخير' : 'Late'}</div><div class="stat-val" style="color:var(--yellow)">${lateTotal}${ar ? ' د' : 'm'}</div></div>
        </div>
        ${kmodel > 0 ? `<div style="margin-top:10px;font-size:11px;color:var(--purple)">K Model: ${kpct}% <span style="color:var(--muted)">(EGP ${esc(fmt(kmodel))})</span></div>` : ''}
      </div>
      <div class="sh"><div class="sh-title">${ar ? 'مبيعات حسب اليوم' : 'Sales by day'}</div></div>
      <div class="card">${chartHtml || `<div class="empty"><div class="empty-icon">📊</div>${ar ? 'لا بيانات' : 'No data'}</div>`}</div>
      <div class="sh" style="margin-top:10px"><div class="sh-title">${ar ? 'آخر الحضور' : 'Recent attendance'}</div></div>
      <div class="card">${attRows || `<div class="empty"><div class="empty-icon">📋</div>${ar ? 'لا سجل' : 'No rows'}</div>`}</div>
      <div class="sh" style="margin-top:10px"><div class="sh-title">${ar ? 'آخر المبيعات' : 'Recent sales'}</div></div>
      <div class="card">${saleRows || `<div class="empty"><div class="empty-icon">🛒</div>${ar ? 'لا مبيعات' : 'No sales'}</div>`}</div>`;
  }

  function renderProductsReport(container, opts) {
    if (!container) return;
    const ar = opts.ar;
    const sorted = opts.sorted || [];
    const fmt = global.fmtEGP || ((n) => String(Math.round(Number(n) || 0)));
    container.innerHTML = `<div class="card">${sorted.map(([name, v], i) => `<div class="history-item" style="cursor:pointer" onclick="showProductEmployees(${JSON.stringify(String(name))})">
      <div class="hist-top">
        <div class="hist-name"><span style="color:var(--muted);margin-left:6px">${i + 1}.</span> ${esc(name)}</div>
        <div class="hist-amount" style="color:var(--green)">${esc(fmt(v.revenue))}</div>
      </div>
      <div class="hist-meta">${ar ? 'الكمية' : 'Qty'}: ${v.qty} ${ar ? 'قطعة' : 'pcs'}</div>
    </div>`).join('')}</div>`;
  }

  function renderBranchReport(container, opts) {
    if (!container) return;
    const ar = opts.ar;
    const sorted = opts.sorted || [];
    const fmt = global.fmtEGP || ((n) => String(Math.round(Number(n) || 0)));
    container.innerHTML = `<div class="card">${sorted.map(([branch, rev], i) => `<div class="history-item">
      <div class="hist-top">
        <div class="hist-name">${i + 1}. ${esc(branch)}</div>
        <div class="hist-amount" style="color:var(--green)">EGP ${esc(fmt(rev))}</div>
      </div>
    </div>`).join('')}</div>`;
  }

  function renderVisitsReport(container, opts) {
    if (!container) return;
    const byEmp = opts.byEmp || {};
    const blocks = Object.keys(byEmp).map((name) => {
      const visits = byEmp[name] || [];
      const cards = visits.map((v) => {
        const photos = [v.photo1, v.photo2, v.photo3].filter(Boolean);
        const ph = photos.length
          ? `<div class="visit-photos-row">${photos.map((src) => `<img class="visit-photo" src="${esc(src)}" alt="" onclick="fullSelfie(${JSON.stringify(String(src))})">`).join('')}</div>`
          : '';
        return `<div class="visit-card" style="margin-bottom:8px">
          <div class="visit-header">
            <div><div class="visit-branch-name">🏪 ${esc(v.branch_name || '')}</div><div class="visit-meta">${esc(v.visit_date || '')}</div></div>
            <span class="badge badge-green">${photos.length} 📷</span>
          </div>
          ${v.note ? `<div class="visit-note">📝 ${esc(v.note)}</div>` : ''}
          ${ph}
        </div>`;
      }).join('');
      return `<div class="sh" style="margin-top:8px"><div class="sh-title">${esc(name)}</div></div>${cards}`;
    }).join('');
    container.innerHTML = blocks || '<div class="empty"><div class="empty-icon">📸</div></div>';
  }

  function renderDisplayReport(container, opts) {
    if (!container) return;
    const byEmp = opts.byEmp || {};
    const canDelete = !!opts.canDelete;
    const blocks = Object.keys(byEmp).map((name) => {
      const rows = byEmp[name] || [];
      const cards = rows.map((r) => {
        const photos = [r.photo1, r.photo2, r.photo3].filter(Boolean);
        const ph = photos.length
          ? `<div class="visit-photos-row">${photos.map((src) => `<img class="visit-photo" src="${esc(src)}" alt="" onclick="fullSelfie(${JSON.stringify(String(src))})">`).join('')}</div>`
          : '';
        const del = canDelete && r.id ? `<button type="button" class="btn btn-outline" style="margin-top:8px;padding:6px 12px;font-size:11px;border-color:var(--red);color:var(--red)" onclick="deleteDisplayPhoto(${r.id})">🗑️ حذف</button>` : '';
        return `<div class="visit-card" style="margin-bottom:8px">
          <div class="visit-header">
            <div><div class="visit-branch-name">🗓️ ${esc(r.photo_date || '')}</div><div class="visit-meta">${esc(r.branch || '')}</div></div>
            <span class="badge badge-blue">${photos.length} 📷</span>
          </div>
          ${r.note ? `<div class="visit-note">📝 ${esc(r.note)}</div>` : ''}
          ${ph}
          ${del}
        </div>`;
      }).join('');
      return `<div class="sh" style="margin-top:8px"><div class="sh-title">${esc(name)}</div></div>${cards}`;
    }).join('');
    container.innerHTML = blocks || '<div class="empty"><div class="empty-icon">🖼️</div></div>';
  }

  global.AdminReportsUI = {
    setLoading,
    setEmpty,
    renderEmployeeReport,
    renderProductsReport,
    renderBranchReport,
    renderVisitsReport,
    renderDisplayReport,
  };
})(window);
