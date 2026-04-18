// ═══════════════════════════════════════════════════════════
// modules/sales.js — Product selection, sale submit, daily sales
// Provides globals: renderProducts, filterProducts, displayProducts,
//   selectProduct, changeQty, cancelSale, submitSale, loadTodaySales,
//   renderDailySalesGrid, renderEmpPerfChart
// Depends on: PRODUCTS (from data.js), currentUser, dbGet/dbPost, notify
// ═══════════════════════════════════════════════════════════

// ── SALE CHARTS (daily grid + perf chart; shared by home + profile) ──
function renderDailySalesGrid(monthSales,pm){
  const el=document.getElementById('daily-sales-grid');if(!el)return;
  const salesByDate={};(monthSales||[]).forEach(s=>{salesByDate[s.date]=(salesByDate[s.date]||0)+s.total_amount});
  const startD=new Date(pm.start),endD=new Date(pm.end),today=new Date();
  let html='';
  for(let d=new Date(startD);d<=endD;d.setDate(d.getDate()+1)){
    const ds=fmtDate(new Date(d)),isToday=ds===fmtDate(today),isDayOff=d.getDay()===currentUser.day_off,amt=salesByDate[ds]||0;
    let cls='day-cell';
    if(isToday)cls+=' today';
    if(isDayOff)cls+=' day-off';
    else if(amt>0)cls+=' has-sale';
    else if(d<today)cls+=' absent';
    html+=`<div class="${cls}"><span class="day-num">${d.getDate()}</span>${amt>0?`<span class="day-amt">${fmtEGP(amt)}</span>`:''}</div>`;
  }
  el.innerHTML=html;
}

function renderEmpPerfChart(monthSales,pm){
  const el=document.getElementById('emp-perf-chart');if(!el)return;
  const salesByDate={};(monthSales||[]).forEach(s=>{salesByDate[s.date]=(salesByDate[s.date]||0)+s.total_amount});
  const days=[];const startD=new Date(pm.start),endD=new Date(pm.end),today=new Date();
  for(let d=new Date(startD);d<=endD&&d<=today;d.setDate(d.getDate()+1)){
    if(d.getDay()!==currentUser.day_off)days.push({ds:fmtDate(new Date(d)),day:d.getDate()});
  }
  const vals=days.map(d=>salesByDate[d.ds]||0);const max=Math.max(...vals,1);
  el.innerHTML=days.slice(-14).map(d=>{const v=salesByDate[d.ds]||0;const h=Math.max(4,Math.round((v/max)*120));
    return`<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}px;background:${v>0?'var(--green)':'var(--border)'}"></div><div class="chart-label">${d.day}</div></div>`;
  }).join('');
}


// ── PRODUCT LIST, SEARCH, SELECTION ──
let filteredProducts=[...PRODUCTS];
function renderProducts(){filteredProducts=[...PRODUCTS];displayProducts()}
const _filterProductsDebounced=(function(){
  let t;return function(){clearTimeout(t);t=setTimeout(()=>{
    const q=(document.getElementById('product-search')||{}).value||'';
    filteredProducts=PRODUCTS.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));
    displayProducts();
  },150);};
})();
function filterProducts(){_filterProductsDebounced();}
function displayProducts(){
  const el=document.getElementById('product-list');if(!el)return;
  const ar=currentLang==='ar';
  if(filteredProducts.length===0){el.innerHTML=`<div style="padding:16px;text-align:center;color:var(--muted)">${ar?'لا توجد نتائج':'No results'}</div>`;return}
  el.innerHTML=filteredProducts.slice(0,30).map(p=>`<div class="product-item" onclick="selectProduct('${p.name.replace(/'/g,"\'")}',${p.price})"><div class="product-name">${p.name}</div><div class="product-price">${p.price.toLocaleString()} EGP</div></div>`).join('');
}
function selectProduct(name,price){
  selectedProduct={name,price};selectedQty=1;
  document.getElementById('selected-product-name').textContent=name;
  document.getElementById('selected-product-price').textContent=price.toLocaleString();
  document.getElementById('qty-val').textContent=1;
  document.getElementById('sale-total').textContent=price.toLocaleString()+' EGP';
  const w=document.getElementById('sale-form-wrap');
  w.style.display='flex';
  w.style.position='fixed';
  w.style.bottom='0';
  w.style.left='0';
  w.style.right='0';
  w.style.top='0';
  w.style.zIndex='5000';
  w.style.background='rgba(0,0,0,.75)';
  w.style.alignItems='flex-end';
  w.style.backdropFilter='blur(4px)';
}
function changeQty(d){selectedQty=Math.max(1,selectedQty+d);document.getElementById('qty-val').textContent=selectedQty;document.getElementById('sale-total').textContent=(selectedProduct.price*selectedQty).toLocaleString()+' EGP'}
function cancelSale(){
  selectedProduct=null;
  const w=document.getElementById('sale-form-wrap');
  if(w){w.style.display='none';w.style.position='';w.style.bottom='';w.style.left='';w.style.right='';w.style.zIndex='';w.style.background='';w.style.alignItems='';}
  renderProducts();
}
let _saleSending=false;
async function submitSale(){
  if(_saleSending||!selectedProduct)return;
  const total=selectedProduct.price*selectedQty;const ar=currentLang==='ar';
  _saleSending=true;
  try{
    await dbPost('sales',{employee_id:currentUser.id,date:todayStr(),product_name:selectedProduct.name,unit_price:selectedProduct.price,quantity:selectedQty,total_amount:total});
    notify(ar?'تم تسجيل البيع ✅':'Sale recorded ✅','success');
    cancelSale();loadTodaySales();loadEmpData();
  }catch(e){notify((ar?'خطأ: ':'Error: ')+e.message,'error');}
  finally{_saleSending=false;}
}
async function loadTodaySales(){
  const sales=await dbGet('sales',`?employee_id=eq.${currentUser.id}&date=eq.${todayStr()}&order=created_at.desc&select=*`);
  const el=document.getElementById('emp-sales-list');let total=0;const ar=currentLang==='ar';
  if(!sales||sales.length===0){if(el)el.innerHTML=`<div class="empty"><div class="empty-icon">🛒</div>${ar?'لا توجد مبيعات اليوم':'No sales today'}</div>`;}
  else{
    sales.forEach(s=>total+=s.total_amount);
    if(el)el.innerHTML=sales.map(s=>`<div class="history-item"><div class="hist-top"><div class="hist-name">${s.product_name}</div><div class="hist-amount">${s.total_amount.toLocaleString()} EGP</div></div><div style="display:flex;justify-content:space-between"><div class="hist-meta">${ar?'الكمية':'Qty'}: ${s.quantity}</div><div class="hist-meta">${s.unit_price.toLocaleString()} EGP</div></div></div>`).join('');
  }
  const tel=document.getElementById('emp-today-total');
  if(tel)tel.textContent=(ar?'اليوم: ':'Today: ')+'EGP '+total.toLocaleString();
}
// _leaveSending moved to modules/leaves.js
