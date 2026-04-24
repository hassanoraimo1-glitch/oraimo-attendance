// Admin Reports UI layer
(function initAdminReportsUI(global) {
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setLoading(el) {
    if (!el) return;
    el.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  }

  function setEmpty(el, icon, text) {
    if (!el) return;
    el.innerHTML = `<div class="empty"><div class="empty-icon">${icon}</div>${esc(text)}</div>`;
  }

  function renderEmployeeReport(el, data) {
    if (!el) return;
    const {
      ar, pmLabel, empName, tlName, att, sales, pct, kpct, kmodel,
      salesTotal, lateTotal, target, chartDays, salesByDate,
    } = data;
    const maxV = Math.max(...chartDays.map(d => salesByDate[d.ds] || 0), 1);
    el.innerHTML = `<div class="card card-glow">
      <div style="font-size:15px;font-weight:800;margin-bottom:2px">${esc(empName || '')}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${esc(pmLabel || '')}</div>
      <div style="font-size:11px;margin-bottom:12px">👥 ${ar ? 'التيم ليدر' : 'Team Leader'}: <span style="color:var(--green);font-weight:700">${esc(tlName || '—')}</span></div>
      <div class="stats-grid" style="margin-bottom:10px">
        <div class="stat-card"><div class="stat-label">${ar ? 'أيام الحضور' : 'Attendance'}</div><div class="stat-val" style="color:var(--green)">${(att || []).length}</div></div>
        <div class="stat-card"><div class="stat-label">${ar ? 'إجمالي التأخير' : 'Late Total'}</div><div class="stat-val" style="color:var(--yellow)">${lateTotal}${ar ? 'د' : 'm'}</div></div>
        <div class="stat-card"><div class="stat-label">${ar ? 'إجمالي المبيعات' : 'Total Sales'}</div><div class="stat-val" style="color:var(--green);font-size:15px">EGP ${esc(global.fmtEGP ? global.fmtEGP(salesTotal) : salesTotal)}</div></div>
        <div class="stat-card"><div class="stat-label">${ar ? 'التارجت' : 'Target'}</div><div class="stat-val" style="font-size:15px">EGP ${esc(global.fmtEGP ? global.fmtEGP(target) : target)}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>${ar ? 'التقدم' : 'Progress'}</span><span style="color:var(--green);font-weight:700">${pct}%</span></div>
      <div class="target-bar"><div class="target-fill" style="width:${pct}%"></div></div>
      ${kmodel > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;margin:8px 0 4px"><span style="color:var(--purple)">K Model — EGP ${esc(global.fmtEGP ? global.fmtEGP(kmodel) : kmodel)}</span><span style="color:var(--purple);font-weight:700">${kpct}%</span></div><div class="target-bar"><div style="height:100%;width:${kpct}%;background:var(--purple);border-radius:4px;transition:width .6s"></div></div>` : ''}
    </div>
    <div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:10px">📈 ${ar ? 'مخطط المبيعات اليومي' : 'Daily Sales Chart'}</div>
      <div class="chart-wrap">${chartDays.slice(-14).map(d => {
        const v = salesByDate[d.ds] || 0;
        const h = Math.max(3, Math.round((v / maxV) * 120));
        return `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}px;background:${v > 0 ? 'var(--green)' : 'var(--border)'}"></div><div class="chart-label">${d.day}</div></div>`;
      }).join('')}</div>
    </div>
    <div style="font-size:13px;font-weight:700;margin:14px 0 8px">${ar ? 'سجل المبيعات' : 'Sales Records'}</div>
    ${(sales || []).length === 0 ? `<div class="empty"><div class="empty-icon">🛒</div>${ar ? 'لا توجد مبيعات' : 'No sales'}</div>` : (sales || []).map(s => `<div class="history-item"><div class="hist-top"><div class="hist-name">${esc(s.product_name)}</div><div class="hist-amount">${Number(s.total_amount || 0).toLocaleString()} EGP</div></div><div style="display:flex;justify-content:space-between"><div class="hist-meta">${esc(s.date)}</div><div class="hist-meta">${ar ? 'كمية' : 'Qty'}: ${s.quantity} × ${Number(s.unit_price || 0).toLocaleString()}</div></div></div>`).join('')}
    <div style="font-size:13px;font-weight:700;margin:14px 0 8px">${ar ? 'سجل الحضور' : 'Attendance Log'}</div>
    <div class="table-wrap"><table>
      <tr><th>${ar ? 'التاريخ' : 'Date'}</th><th>${ar ? 'دخول' : 'In'}</th><th>${ar ? 'خروج' : 'Out'}</th><th>${ar ? 'تأخير' : 'Late'}</th><th>📷</th></tr>
      ${(att || []).map(a => `<tr><td>${esc(a.date)}</td><td>${esc(a.check_in || '-')}</td><td>${esc(a.check_out || '-')}</td><td>${a.late_minutes > 0 ? `<span class="badge badge-yellow">${a.late_minutes}${ar ? 'د' : 'm'}</span>` : '<span class="badge badge-green">✓</span>'}</td><td>${a.selfie_in ? `<img src="${esc(a.selfie_in)}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;cursor:pointer" onclick="fullSelfie('${esc(a.selfie_in)}')">` : '-'}</td></tr>`).join('')}
    </table></div>`;
  }

  function renderProductsReport(el, data) {
    if (!el) return;
    const { ar, sorted } = data;
    const maxRev = sorted[0]?.[1]?.revenue || 1;
    el.innerHTML = `<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:12px">📦 ${ar ? 'اضغط على منتج لعرض تفاصيل الموظفين' : 'Tap a product for employee details'}</div>
      ${sorted.slice(0, 20).map(([name, d]) => `<div style="margin-bottom:10px;cursor:pointer" onclick="showProductEmployees('${String(name).replace(/'/g, "\\'")}')">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr">${esc(name)}</span>
          <span style="color:var(--green);font-weight:700;margin-right:8px">EGP ${esc(global.fmtEGP ? global.fmtEGP(d.revenue) : d.revenue)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="perf-bar-bg" style="flex:1"><div class="perf-bar-fill" style="width:${Math.max(3, Math.round(d.revenue / maxRev * 100))}%;background:var(--green)"></div></div>
          <span style="font-size:10px;color:var(--muted);min-width:40px">${d.qty} ${ar ? 'قطعة' : 'pcs'}</span>
        </div>
      </div>`).join('')}
    </div>`;
  }

  function renderBranchReport(el, data) {
    if (!el) return;
    const { ar, sorted } = data;
    const maxB = sorted[0]?.[1] || 1;
    el.innerHTML = `<div class="card"><div style="font-size:13px;font-weight:700;margin-bottom:12px">🏪 ${ar ? 'تقرير الفروع' : 'Branch Report'}</div>
      ${sorted.map(([branch, rev], i) => `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="font-weight:700">${esc(branch)}</span><span style="color:var(--green);font-weight:700">EGP ${esc(global.fmtEGP ? global.fmtEGP(rev) : rev)}</span></div>
        <div class="perf-bar-bg"><div class="perf-bar-fill" style="width:${Math.max(3, Math.round(rev / maxB * 100))}%;background:${i === 0 ? 'var(--gold)' : i === 1 ? 'var(--silver)' : i === 2 ? 'var(--bronze)' : 'var(--green)'}"></div></div>
      </div>`).join('')}
    </div>`;
  }

  function renderVisitsReport(el, data) {
    if (!el) return;
    const { byEmp, visits } = data;
    const totalPhotos = visits.reduce((s, v) => {
      let c = 0; if (v.photo1) c++; if (v.photo2) c++; if (v.photo3) c++;
      return s + c;
    }, 0);
    el.innerHTML = `<div class="stats-grid" style="margin-bottom:12px">
      <div class="stat-card"><div class="stat-label">إجمالي الزيارات</div><div class="stat-val" style="color:var(--green)">${visits.length}</div></div>
      <div class="stat-card"><div class="stat-label">الصور المرفوعة</div><div class="stat-val" style="color:var(--blue)">${totalPhotos}</div></div>
    </div>
    ${Object.entries(byEmp).map(([name, empVisits]) => {
      const pCount = empVisits.reduce((s, v) => {
        let c = 0; if (v.photo1) c++; if (v.photo2) c++; if (v.photo3) c++;
        return s + c;
      }, 0);
      const pct = Math.min(100, Math.round(empVisits.length / 150 * 100));
      return `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:14px;font-weight:800">👤 ${esc(name)}</div>
          <span class="badge ${pct >= 100 ? 'badge-green' : pct >= 50 ? 'badge-yellow' : 'badge-red'}">${empVisits.length}/150</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>التقدم</span><span style="color:var(--green);font-weight:700">${pct}%</span></div>
        <div class="target-bar" style="margin-bottom:12px"><div class="target-fill" style="width:${pct}%"></div></div>
        ${empVisits.map(v => {
          const photos = [v.photo1, v.photo2, v.photo3].filter(Boolean);
          return `<div class="visit-card" style="margin-bottom:8px">
            <div class="visit-header">
              <div><div class="visit-branch-name">🏪 ${esc(v.branch_name)}</div><div class="visit-meta">${esc(v.visit_date)}</div></div>
              <span class="badge badge-green">${photos.length} 📷</span>
            </div>
            ${v.note ? `<div class="visit-note">📝 ${esc(v.note)}</div>` : ''}
            ${photos.length > 0 ? `<div class="visit-photos-row">${photos.map(src => `<img class="visit-photo" src="${esc(src)}" onclick="fullSelfie('${esc(src)}')">`).join('')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}`;
  }

  function renderDisplayReport(el, data) {
    if (!el) return;
    const { byEmp, canDelete } = data;
    el.innerHTML = Object.entries(byEmp).map(([name, recs]) => `
      <div class="card" style="margin-bottom:10px">
        <div style="font-size:14px;font-weight:800;margin-bottom:10px">👤 ${esc(name)} <span class="badge badge-blue">${recs.length} يوم</span></div>
        ${recs.map(r => {
          const photos = [r.photo1, r.photo2, r.photo3].filter(Boolean);
          return `<div class="visit-card" style="margin-bottom:8px"><div class="visit-header"><div><div class="visit-branch-name">🗓️ ${esc(r.photo_date)}</div><div class="visit-meta">${esc(r.branch || '')}</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge badge-blue">${photos.length} 📷</span>${canDelete ? `<button onclick="deleteDisplayPhoto(${r.id})" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer;font-family:Cairo,sans-serif">🗑️</button>` : ''}</div></div>${r.note ? `<div class="visit-note">📝 ${esc(r.note)}</div>` : ''}<div class="visit-photos-row">${photos.map(src => `<img class="visit-photo" src="${esc(src)}" onclick="fullSelfie('${esc(src)}')">`).join('')}</div></div>`;
        }).join('')}
      </div>`).join('');
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

