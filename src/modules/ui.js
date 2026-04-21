// ═══════════════════════════════════════════════════════════
// modules/ui.js — CLEAN VERSION (Fixed Scroll + Overlays)
// ═══════════════════════════════════════════════════════════


// ── GLOBAL MODAL STATE ──
let modalCount = 0;


// ── SCROLL LOCK HELPERS ──
function lockScroll() {
    modalCount++;
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.touchAction = 'none';
}

function unlockScroll() {
    modalCount--;

    if (modalCount <= 0) {
        modalCount = 0;
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.body.style.touchAction = '';
    }
}


// ── REMOVE ALL DYNAMIC MODALS ──
function clearDynamicModals() {
    document.querySelectorAll('.dynamic-overlay').forEach(o => o.remove());
    modalCount = 0;
    unlockScroll();
}


// ── CLOSE MODAL ──
window.closeDynamicModal = function(el) {
    const overlay = el.closest('.dynamic-overlay');
    if (overlay) overlay.remove();
    unlockScroll();
};


// ── ESC CLOSE ──
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        clearDynamicModals();
    }
});


// ── CLICK OUTSIDE CLOSE ──
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
        unlockScroll();
    }
});


// ── BASE MODAL ──
function createOverlay(z = 8000) {
    clearDynamicModals();

    const overlay = document.createElement('div');
    overlay.className = 'dynamic-overlay';

    overlay.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.85);
        z-index:${z};
        display:flex;
        align-items:flex-end;
        backdrop-filter:blur(4px)
    `;

    lockScroll();
    return overlay;
}


// ── PRESENT / ABSENT ──
function showAbsentEmployees() {
    const ar = currentLang === 'ar';
    const presentIds = window._todayPresentIds || [];
    const absentList = allEmployees.filter(e => !presentIds.includes(e.id));

    const overlay = createOverlay();

    overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--red)">
        <div style="font-size:16px;font-weight:800;color:var(--red);margin-bottom:14px">
            😴 ${ar ? 'الغائبون' : 'Absent'} (${absentList.length})
        </div>

        ${absentList.length === 0 ? `
            <div style="text-align:center;color:var(--muted)">No data</div>
        ` :
        absentList.map(emp => `
            <div style="padding:10px;border-bottom:1px solid var(--border)">
                <b>${emp.name}</b><br>
                <span style="font-size:12px;color:var(--muted)">${emp.branch || '-'}</span>
            </div>
        `).join('')}

        <button onclick="closeDynamicModal(this)" class="btn-close">Close</button>
    </div>`;

    document.body.appendChild(overlay);
}


function showPresentEmployees(todayAtt) {
    const ar = currentLang === 'ar';
    const empMap = {};
    (allEmployees || []).forEach(e => empMap[e.id] = e);

    const overlay = createOverlay();

    overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:22px;width:100%;max-height:70vh;overflow-y:auto;border-top:2px solid var(--green)">
        <div style="font-size:16px;font-weight:800;color:var(--green);margin-bottom:14px">
            ✅ ${ar ? 'الحضور' : 'Present'} (${todayAtt.length})
        </div>

        ${todayAtt.map(a => {
            const emp = empMap[a.employee_id] || {};
            return `
            <div style="padding:10px;border-bottom:1px solid var(--border)">
                <b>${emp.name || 'Unknown'}</b><br>
                <span style="font-size:12px;color:var(--muted)">
                    ${emp.branch || ''} · ${a.check_in || '-'}
                </span>
            </div>`;
        }).join('')}

        <button onclick="closeDynamicModal(this)" class="btn-close">Close</button>
    </div>`;

    document.body.appendChild(overlay);
}


// ── PHOTO SOURCE ──
function showPhotoSourceModal(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const overlay = createOverlay(9000);

    overlay.innerHTML = `
    <div style="background:var(--card);border-radius:22px 22px 0 0;padding:24px;width:100%">
        <div style="text-align:center;margin-bottom:16px">Choose</div>

        <button onclick="
            document.getElementById('${inputId}').setAttribute('capture','environment');
            document.getElementById('${inputId}').click();
            closeDynamicModal(this)
        ">📷 Camera</button>

        <button onclick="
            document.getElementById('${inputId}').removeAttribute('capture');
            document.getElementById('${inputId}').click();
            closeDynamicModal(this)
        ">🖼️ Gallery</button>

        <button onclick="closeDynamicModal(this)">Cancel</button>
    </div>`;

    document.body.appendChild(overlay);
}


// ── NORMAL MODALS ──
function openModal(id) {
    document.getElementById(id).classList.add('open');
    lockScroll();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    unlockScroll();
}


// ── TOAST ──
function notify(msg, type = 'success') {
    const el = document.createElement('div');
    el.textContent = msg;

    el.style.cssText = `
        position:fixed;
        top:20px;
        left:50%;
        transform:translateX(-50%);
        background:${type === 'error' ? 'red' : 'green'};
        color:#fff;
        padding:10px 16px;
        border-radius:10px;
        z-index:9999;
    `;

    document.body.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 3000);
}


// ── NAV RESET SCROLL ──
function resetScroll() {
    window.scrollTo(0, 0);
}


// ── FIX IOS ──
(function () {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    if (isIOS) {
        document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom)');
    }
})();
