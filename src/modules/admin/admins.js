// ═══════════════════════════════════════════════════════════
// modules/admin/admins.js — Admins list CRUD (superadmin)
// Provides globals: loadAdminsList, openAddAdmin, openEditAdmin, saveAdmin, deleteAdmin
// Depends on: AdminUI in admin.ui.js, dbGet/dbPost/dbPatch/dbDelete, notify
// ═══════════════════════════════════════════════════════════

async function loadAdminsList() {
  const el = document.getElementById('admins-list');
  if (!el) return;
  const ar = currentLang === 'ar';
  el.innerHTML = `<div class="full-loader"><div class="loader"></div></div>`;
  try {
    allAdmins = await dbGet('admins', '?select=id,name,username,role&order=name.asc').catch(() => []) || [];
    if (!allAdmins.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">👑</div>${ar ? 'لا يوجد مسؤولون' : 'No admins yet'}</div>`;
      return;
    }
    const roleLabel = (r) => {
      if (r === 'manager') return ar ? 'تيم ليدر' : 'Team Leader';
      if (r === 'viewer') return 'Viewer';
      return 'Admin';
    };
    el.innerHTML = allAdmins.map((a) => `<div class="emp-card">
      <div class="emp-avatar" style="background:linear-gradient(135deg,#FFD600,#ff9800)">👑</div>
      <div class="emp-info">
        <div class="emp-name">${escAdmin(a.name)}</div>
        <div class="emp-branch">${escAdmin(a.username)} · ${roleLabel(a.role)}</div>
      </div>
      <div class="emp-actions">
        <button class="action-btn edit" onclick="openEditAdmin(${a.id})">✏️</button>
        ${currentUser.id != null && Number(a.id) === Number(currentUser.id) ? '' : `<button class="action-btn del" onclick="deleteAdmin(${a.id})">🗑️</button>`}
      </div>
    </div>`).join('');
  } catch (e) {
    el.innerHTML = `<div style="color:var(--red);font-size:12px;padding:12px">${escAdmin(e.message || 'Error')}</div>`;
  }
}

function escAdmin(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openAddAdmin() {
  const ar = currentLang === 'ar';
  document.getElementById('admin-modal-title').textContent = ar ? 'إضافة مسؤول' : 'Add Admin';
  document.getElementById('edit-admin-id').value = '';
  document.getElementById('admin-form-name').value = '';
  document.getElementById('admin-form-username').value = '';
  document.getElementById('admin-form-pass').value = '';
  document.getElementById('admin-pass-group').style.display = 'block';
  document.getElementById('admin-form-role').value = 'admin';
  openModal('add-admin-modal');
}

function openEditAdmin(id) {
  const a = (allAdmins || []).find((x) => x.id === id);
  if (!a) return;
  const ar = currentLang === 'ar';
  document.getElementById('admin-modal-title').textContent = ar ? 'تعديل مسؤول' : 'Edit Admin';
  document.getElementById('edit-admin-id').value = id;
  document.getElementById('admin-form-name').value = a.name || '';
  document.getElementById('admin-form-username').value = a.username || '';
  document.getElementById('admin-form-pass').value = '';
  document.getElementById('admin-pass-group').style.display = 'block';
  document.getElementById('admin-form-role').value = a.role || 'admin';
  openModal('add-admin-modal');
}

async function saveAdmin() {
  const id = document.getElementById('edit-admin-id').value;
  const name = document.getElementById('admin-form-name').value.trim();
  const username = document.getElementById('admin-form-username').value.trim();
  const pass = document.getElementById('admin-form-pass').value;
  const role = document.getElementById('admin-form-role').value || 'admin';
  const ar = currentLang === 'ar';
  if (!name || !username) {
    notify(ar ? 'أدخل الاسم واسم المستخدم' : 'Enter name and username', 'error');
    return;
  }
  if (!id && !pass) {
    notify(ar ? 'أدخل كلمة المرور' : 'Enter password', 'error');
    return;
  }
  try {
    if (!id) {
      const existing = await dbGet('admins', `?username=eq.${encodeURIComponent(username)}&select=id`).catch(() => []);
      if (existing && existing.length) {
        notify(ar ? 'اسم المستخدم مستخدم' : 'Username already taken', 'error');
        return;
      }
      await dbPost('admins', { name, username, password: pass, role });
      notify(ar ? 'تم الحفظ ✅' : 'Saved ✅', 'success');
    } else {
      const existing = await dbGet('admins', `?username=eq.${encodeURIComponent(username)}&select=id`).catch(() => []);
      if (existing && existing.some((r) => r.id !== Number(id))) {
        notify(ar ? 'اسم المستخدم مستخدم' : 'Username already taken', 'error');
        return;
      }
      const body = { name, username, role };
      if (pass) body.password = pass;
      await dbPatch('admins', body, `?id=eq.${id}`);
      notify(ar ? 'تم التحديث ✅' : 'Updated ✅', 'success');
    }
    closeModal('add-admin-modal');
    await loadAdminsList();
  } catch (e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  }
}

async function deleteAdmin(id) {
  const ar = currentLang === 'ar';
  if (Number(id) === Number(currentUser.id)) return;
  if (!confirm(ar ? 'حذف هذا المسؤول؟' : 'Delete this admin?')) return;
  try {
    await dbDelete('admins', `?id=eq.${id}`);
    notify(ar ? 'تم الحذف ✅' : 'Deleted ✅', 'success');
    await loadAdminsList();
  } catch (e) {
    notify((ar ? 'خطأ: ' : 'Error: ') + (e.message || ''), 'error');
  }
}
