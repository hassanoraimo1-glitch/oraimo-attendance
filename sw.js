// ═══════════════════════════════════════════════════════════
// modules/sales.js — Product selection, sale submit, daily sales
// Globals:
// renderProducts, filterProducts, displayProducts,
// selectProduct, changeQty, cancelSale, submitSale, loadTodaySales,
// renderDailySalesGrid, renderEmpPerfChart
// Safe version to avoid global redeclare conflicts
// ═══════════════════════════════════════════════════════════

(() => {
  window.__salesState = window.__salesState || {
    selectedProduct: null,
    selectedQty: 1,
    filteredProducts: Array.isArray(window.PRODUCTS) ? [...window.PRODUCTS] : [],
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

  function getProducts() {
    return Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
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

  function renderEmpPerfChart(monthSales = [], pm = {}) {
    const el = document.getElementById('emp-perf-chart');
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
    const days = [];

    for (let d = new Date(startD); d <= endD && d <= today; d.setDate(d.getDate() + 1)) {
      const current = new Date(d);
      if (current.getDay() === dayOff) continue;
      days.push({
        ds: _salesFmtDate(current),
        day: current.getDate()
      });
    }

    const lastDays = days.slice(-14);
    const vals = lastDays.map(d => salesByDate[d.ds] || 0);
    const max = Math.max(...vals, 1);

    el.innerHTML = lastDays.map(d => {
      const v = salesByDate[d.ds] || 0;
      const h = Math.max(4, Math.round((v / max) * 120));
      return `
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${h}px;background:${v > 0 ? 'var(--green)' : 'var(--border)'}"></div>
          <div class="chart-label">${d.day}</div>
        </div>
      `;
    }).join('');
  }

  // ─────────────────────────────
  // PRODUCT LIST / SEARCH / SELECT
  // ─────────────────────────────
  function renderProducts() {
    _salesState().filteredProducts = [...getProducts()];
    displayProducts();
  }

  const _filterProductsDebounced = (() => {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = ((document.getElementById('product-search') || {}).value || '').trim().toLowerCase();
        _salesState().filteredProducts = getProducts().filter(p =>
          String(p.name || '').toLowerCase().includes(q)
        );
        displayProducts();
      }, 150);
    };
  })();

  function filterProducts() {
    _filterProductsDebounced();
  }

  function displayProducts() {
    const el = document.getElementById('product-list');
    if (!el) return;

    const list = _salesState().filteredProducts || [];
    const ar = window.currentLang === 'ar';

    if (!list.length) {
      el.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted)">${ar ? 'لا توجد نتائج' : 'No results'}</div>`;
      return;
    }

    el.innerHTML = list.slice(0, 30).map(p => {
      const name = String(p.name || '');
      const price = safeNum(p.price);
      const safeName = encodeURIComponent(name);
      return `
        <div class="product-item" onclick="selectProduct(decodeURIComponent('${safeName}'), ${price})">
          <div class="product-name">${name}</div>
          <div class="product-price">${price.toLocaleString()} EGP</div>
        </div>
      `;
    }).join('');
  }

  function selectProduct(name, price) {
    const state = _salesState();
    state.selectedProduct = { name, price: safeNum(price) };
    state.selectedQty = 1;

    const nameEl = document.getElementById('selected-product-name');
    const priceEl = document.getElementById('selected-product-price');
    const qtyEl = document.getElementById('qty-val');
    const totalEl = document.getElementById('sale-total');
    const wrap = document.getElementById('sale-form-wrap');

    if (nameEl) nameEl.textContent = name || '-';
    if (priceEl) priceEl.textContent = state.selectedProduct.price.toLocaleString();
    if (qtyEl) qtyEl.textContent = '1';
    if (totalEl) totalEl.textContent = state.selectedProduct.price.toLocaleString() + ' EGP';

    if (wrap) {
      wrap.style.display = 'flex';
      wrap.style.position = 'fixed';
      wrap.style.inset = '0';
      wrap.style.zIndex = '5000';
      wrap.style.background = 'rgba(0,0,0,.75)';
      wrap.style.alignItems = 'flex-end';
      wrap.style.backdropFilter = 'blur(4px)';
    }
  }

  function changeQty(delta) {
    const state = _salesState();
    if (!state.selectedProduct) return;

    state.selectedQty = Math.max(1, safeNum(state.selectedQty) + safeNum(delta));

    const qtyEl = document.getElementById('qty-val');
    const totalEl = document.getElementById('sale-total');

    if (qtyEl) qtyEl.textContent = String(state.selectedQty);
    if (totalEl) totalEl.textContent = (state.selectedProduct.price * state.selectedQty).toLocaleString() + ' EGP';
  }

  function cancelSale() {
    const state = _salesState();
    state.selectedProduct = null;
    state.selectedQty = 1;

    const wrap = document.getElementById('sale-form-wrap');
    if (wrap) {
      wrap.style.display = 'none';
      wrap.style.position = '';
      wrap.style.inset = '';
      wrap.style.zIndex = '';
      wrap.style.background = '';
      wrap.style.alignItems = '';
      wrap.style.backdropFilter = '';
    }
  }

  async function submitSale() {
    const state = _salesState();
    if (state.sending || !state.selectedProduct || !window.currentUser?.id) return;

    const ar = window.currentLang === 'ar';
    const total = safeNum(state.selectedProduct.price) * safeNum(state.selectedQty);

    state.sending = true;
    try {
      await window.dbPost('sales', {
        employee_id: window.currentUser.id,
        date: _salesTodayStr(),
        product_name: state.selectedProduct.name,
        unit_price: state.selectedProduct.price,
        quantity: state.selectedQty,
        total_amount: total
      });

      _salesNotify(ar ? 'تم تسجيل البيع ✅' : 'Sale recorded ✅', 'success');
      cancelSale();
      await loadTodaySales();

      if (typeof window.loadEmpData === 'function') {
        try { await window.loadEmpData(); } catch (_) {}
      }
    } catch (e) {
      _salesNotify((ar ? 'خطأ: ' : 'Error: ') + (e?.message || e), 'error');
    } finally {
      state.sending = false;
    }
  }

  async function loadTodaySales() {
    const el = document.getElementById('emp-sales-list');
    const tel = document.getElementById('emp-today-total');
    const ar = window.currentLang === 'ar';

    if (!window.currentUser?.id) {
      if (el) el.innerHTML = '';
      if (tel) tel.textContent = (ar ? 'اليوم: ' : 'Today: ') + 'EGP 0';
      return [];
    }

    try {
      const sales = await window.dbGet(
        'sales',
        `?employee_id=eq.${window.currentUser.id}&date=eq.${_salesTodayStr()}&order=created_at.desc&select=*`
      ) || [];

      let total = 0;
      sales.forEach(s => { total += safeNum(s.total_amount); });

      if (!sales.length) {
        if (el) {
          el.innerHTML = `<div class="empty"><div class="empty-icon">🛒</div>${ar ? 'لا توجد مبيعات اليوم' : 'No sales today'}</div>`;
        }
      } else if (el) {
        el.innerHTML = sales.map(s => `
          <div class="history-item">
            <div class="hist-top">
              <div class="hist-name">${s.product_name || '-'}</div>
              <div class="hist-amount">${safeNum(s.total_amount).toLocaleString()} EGP</div>
            </div>
            <div style="display:flex;justify-content:space-between">
              <div class="hist-meta">${ar ? 'الكمية' : 'Qty'}: ${safeNum(s.quantity)}</div>
              <div class="hist-meta">${safeNum(s.unit_price).toLocaleString()} EGP</div>
            </div>
          </div>
        `).join('');
      }

      if (tel) tel.textContent = (ar ? 'اليوم: ' : 'Today: ') + 'EGP ' + total.toLocaleString();

      window._todaySales = sales;
      window._todaySalesTotal = total;
      return sales;
    } catch (e) {
      if (el) {
        el.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>${ar ? 'تعذر تحميل المبيعات' : 'Failed to load sales'}</div>`;
      }
      if (tel) tel.textContent = (ar ? 'اليوم: ' : 'Today: ') + 'EGP 0';
      return [];
    }
  }

  Object.assign(window, {
    renderProducts,
    filterProducts,
    displayProducts,
    selectProduct,
    changeQty,
    cancelSale,
    submitSale,
    loadTodaySales,
    renderDailySalesGrid,
    renderEmpPerfChart
  });
})();
