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
      days.push({ ds: _salesFmtDate(current), day: current.getDate() });
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
    const products = getProducts();
    console.log('[sales] renderProducts — found', products.length, 'products from window.PRODUCTS');
    _salesState().filteredProducts = products;
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
    if (!el) {
      console.warn('[sales] product-list element not found in DOM');
      return;
    }

    const list = _salesState().filteredProducts || [];
    const ar = window.currentLang === 'ar';

    console.log('[sales] displayProducts — rendering', list.length, 'items');

    if (!list.length) {
      el.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted)">${ar ? 'لا توجد نتائج' : 'No results'}</div>`;
      return;
    }

    el.innerHTML = list.slice(0, 50).map(p => {
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
      wrap.classList.add('show');
      setTimeout(() => {
        wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
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
    if (wrap) wrap.classList.remove('show');
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

      // نحدث stats الصفحة الرئيسية في الخلفية بدون await
      // عشان نتجنب أي تعارض مع قائمة المبيعات الظاهرة حالياً
      if (typeof window.loadEmpData === 'function') {
        window.loadEmpData().catch(() => {});
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

  function showEmpSalesDetails(period = 'today') {
    const ar = window.currentLang === 'ar';
    const sales = period === 'month'
      ? (Array.isArray(window._empMonthSales) ? window._empMonthSales : [])
      : (Array.isArray(window._empTodaySales) ? window._empTodaySales
          : Array.isArray(window._todaySales) ? window._todaySales : []);

    if (!sales.length) {
      if (typeof window.notify === 'function') {
        window.notify(ar ? 'لا توجد مبيعات' : 'No sales', 'info');
      }
      return;
    }

    const total = sales.reduce((sum, s) => sum + safeNum(s.total_amount), 0);
    const title = period === 'month'
      ? (ar ? '📊 مبيعات الشهر' : '📊 Month Sales')
      : (ar ? '📊 مبيعات اليوم' : '📊 Today Sales');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.classList.add('open');
    overlay.innerHTML = `
      <div style="background:var(--card);border-radius:22px 22px 0 0;padding:20px 16px;width:100%;max-height:80vh;overflow-y:auto;border-top:2px solid var(--green)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:16px;font-weight:800;color:var(--green)">${title}</div>
          <button id="emp-sales-close-btn" style="width:38px;height:38px;border:none;border-radius:50%;background:var(--card2);color:var(--text);font-size:18px;cursor:pointer">✕</button>
        </div>
        <div class="card" style="margin-bottom:12px;background:rgba(0,200,83,.06);border-color:rgba(0,200,83,.2)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:12px;color:var(--muted)">${ar ? 'الإجمالي' : 'Total'}</div>
            <div style="font-size:18px;font-weight:800;color:var(--green)">EGP ${total.toLocaleString()}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${sales.map(s => `
            <div style="padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--card2)">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:700">${s.product_name || (ar ? 'منتج غير محدد' : 'Unknown product')}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:3px">
                    ${ar ? 'الكمية' : 'Qty'}: ${safeNum(s.quantity || 1)}
                    ${s.unit_price ? ` · ${ar ? 'سعر الوحدة' : 'Unit'}: EGP ${safeNum(s.unit_price).toLocaleString()}` : ''}
                    ${s.date ? ` · ${s.date}` : ''}
                  </div>
                </div>
                <div style="font-size:13px;font-weight:800;color:var(--green)">EGP ${safeNum(s.total_amount).toLocaleString()}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('emp-sales-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove(), { once: true });
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
    renderEmpPerfChart,
    showEmpSalesDetails
  });
})();
