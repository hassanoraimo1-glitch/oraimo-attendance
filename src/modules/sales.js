// ═══════════════════════════════════════════════════════════
// modules/sales.js — Product selection, sale submit, daily sales
// ═══════════════════════════════════════════════════════════

(() => {
  window.__salesState = window.__salesState || {
    selectedProduct: null,
    selectedQty: 1,
    filteredProducts: [],
    sending: false
  };

  function _salesState() {
    return window.__salesState;
  }

  function _salesNotify(msg, type = 'error') {
    if (typeof window.notify === 'function') {
      window.notify(msg, type);
    } else {
      console[type === 'error' ? 'error' : 'log'](msg);
    }
  }

  function _salesTodayStr() {
    if (typeof window.todayStr === 'function') {
      try { return window.todayStr(); } catch (_) {}
    }
    return new Date().toISOString().slice(0, 10);
  }

  function _salesFmtDate(d) {
    if (typeof window.fmtDate === 'function') {
      try { return window.fmtDate(d); } catch (_) {}
    }
    return new Date(d).toISOString().slice(0, 10);
  }

  // ─── NORMALIZE: يدعم {name,price} و {n,p} ───
  function getProducts() {
    const raw = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
    return raw.map(p => ({
      name:  p.name  !== undefined ? String(p.name)  : (p.n  !== undefined ? String(p.n)  : ''),
      price: p.price !== undefined ? Number(p.price) : (p.p  !== undefined ? Number(p.p)  : 0)
    })).filter(p => p.name);
  }

  function getDayOff() {
    const v = Number(window.currentUser?.day_off);
    return Number.isFinite(v) ? v : -1;
  }

  function safeNum(v) {
    return Number(v || 0);
  }

  // ─────────────────────────────
  // SALE CHARTS
  // ─────────────────────────────
  function renderDailySalesGrid(monthSales = [], pm = {}) {
    const el = document.getElementById('daily-sales-grid');
    if (!el || !pm.start || !pm.end) return;

    const salesByDate = {};
    (Array.isArray(monthSales) ? monthSales : []).forEach(s => {
      const ds = s?.date;
      if (!ds) return;
      salesByDate[ds] = (salesByDate[ds] || 0) + safeNum(s.total_amount);
    });

    const startD = new Date(pm.start);
    const endD = new Date(pm.end);
    const today = new Date();
    const dayOff = getDayOff();

    let html = '';
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const current = new Date(d);
      const ds = _salesFmtDate(current);
      const amt = salesByDate[ds] || 0;
      const isToday = ds === _salesFmtDate(today);
      const isPast = current < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isDayOff = current.getDay() === dayOff;

      let cls = 'day-cell';
      if (isToday) cls += ' today';
      if (isDayOff) cls += ' day-off';
      else if (amt > 0) cls += ' has-sale';
      else if (isPast) cls += ' absent';

      html += `
        <div class="${cls}">
          <span class="day-num">${current.getDate()}</span>
          ${amt > 0 ? `<span class="day-amt">${window.fmtEGP ? window.fmtEGP(amt) : amt}</span>` : ''}
        </div>
      `;
    }

    el.innerHTML = html;
  }
