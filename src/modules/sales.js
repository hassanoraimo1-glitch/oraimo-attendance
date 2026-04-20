// modules/sales.js
let filteredProducts = [];
let selectedProduct = null;
let selectedQty = 1;

async function renderProducts() {
    try {
        const data = await dbGet('products', '?select=*&order=name');
        if (data && data.length > 0) {
            window.allProducts = data;
        } else {
            window.allProducts = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
        }
    } catch (e) {
        window.allProducts = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
    }
    filteredProducts = [...(window.allProducts || [])];
    displayProducts();
}

function displayProducts() {
    const el = document.getElementById('product-list'); 
    if (!el) return;
    const ar = (window.currentLang === 'ar');
    if (!filteredProducts || filteredProducts.length === 0) {
        el.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted)">${ar ? 'لا توجد نتائج' : 'No results'}</div>`;
        return;
    }
    el.innerHTML = filteredProducts.slice(0, 30).map(p => `
        <div class="product-item" onclick="selectProduct('${p.name.replace(/'/g, "\\'")}', ${p.price})">
            <div class="product-name">${p.name}</div>
            <div class="product-price">${Number(p.price).toLocaleString()} EGP</div>
        </div>
    `).join('');
}

function filterProducts() {
    const q = (document.getElementById('product-search') || {}).value || '';
    const source = window.allProducts || [];
    filteredProducts = source.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    displayProducts();
}

function selectProduct(name, price) {
    selectedProduct = { name, price }; selectedQty = 1;
    document.getElementById('selected-product-name').textContent = name;
    document.getElementById('selected-product-price').textContent = price.toLocaleString();
    document.getElementById('qty-val').textContent = 1;
    document.getElementById('sale-total').textContent = price.toLocaleString() + ' EGP';
    const w = document.getElementById('sale-form-wrap');
    if (w) { w.style.display = 'flex'; w.style.alignItems = 'flex-end'; }
}

function changeQty(d) {
    selectedQty = Math.max(1, selectedQty + d);
    document.getElementById('qty-val').textContent = selectedQty;
    document.getElementById('sale-total').textContent = (selectedProduct.price * selectedQty).toLocaleString() + ' EGP';
}

function cancelSale() {
    selectedProduct = null;
    const w = document.getElementById('sale-form-wrap');
    if (w) w.style.display = 'none';
}

async function submitSale() {
    if (!selectedProduct) return;
    try {
        await dbPost('sales', {
            employee_id: currentUser.id,
            date: todayStr(),
            product_name: selectedProduct.name,
            unit_price: selectedProduct.price,
            quantity: selectedQty,
            total_amount: selectedProduct.price * selectedQty
        });
        notify(currentLang === 'ar' ? 'تم تسجيل البيع ✅' : 'Sale recorded ✅', 'success');
        cancelSale();
        loadTodaySales();
    } catch (e) { notify(e.message, 'error'); }
}

async function loadTodaySales() {
    const sales = await dbGet('sales', `?employee_id=eq.${currentUser.id}&date=eq.${todayStr()}&order=created_at.desc`);
    const el = document.getElementById('emp-sales-list');
    let total = 0;
    if (el) {
        if (!sales || sales.length === 0) {
            el.innerHTML = '<div class="empty">🛒 لا مبيعات اليوم</div>';
        } else {
            sales.forEach(s => total += s.total_amount);
            el.innerHTML = sales.map(s => `<div class="history-item"><b>${s.product_name}</b> <span>${s.total_amount} EGP</span></div>`).join('');
        }
    }
    const tel = document.getElementById('emp-today-total');
    if (tel) tel.textContent = 'EGP ' + total.toLocaleString();
}

// Global Export
window.renderProducts = renderProducts;
window.filterProducts = filterProducts;
window.selectProduct = selectProduct;
window.changeQty = changeQty;
window.cancelSale = cancelSale;
window.submitSale = submitSale;
window.loadTodaySales = loadTodaySales;
