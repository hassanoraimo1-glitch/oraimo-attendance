// ═══════════════════════════════════════════════════════════
// modules/admin/admins.js — Admin users CRUD + manager team mgmt
// Provides globals: loadAdminsList, renderAdminsList, openAddAdmin,
//   saveAdmin, deleteAdmin, openManagerTeam, saveManagerTeam,
//   getManagerTeamIds, filterEmployeesForManager
// ═══════════════════════════════════════════════════════════

// ── ADMINS CRUD ──
// ── ADMINS ──
async function loadAdminsList(){
  try{
    allAdmins=await dbGet('admins','?select=*&order=name').catch(()=>[])||[];
    renderAdminsList();
  }catch(e){console.warn('loadAdminsList:',e);}
}
function renderAdminsList(){
  const el=document.getElementById('admins-list');if(!el)return;
  if(allAdmins.length===0){el.innerHTML=`<div style="color:var(--muted);font-size:12px">${currentLang==='ar'?'لا يوجد مسؤولون':'No admins'}</div>`;return}
  el.innerHTML=allAdmins.map(a=>`<div class="emp-card"><div class="emp-avatar" style="background:var(--blue)">👑</div><div class="emp-info"><div class="emp-name">${a.name}</div><div class="emp-branch">${a.username}</div></div><span class="badge ${a.role==='admin'?'badge-blue':a.role==='manager'?'badge-purple':'badge-yellow'}">${a.role==='manager'?'Team Leader':a.role}</span><div class="emp-actions">${a.role==='manager'?`<button class="action-btn view" onclick="openManagerTeam(${a.id},'${a.name}')">👥 فريق</button>`:''}<button class="action-btn del" onclick="deleteAdmin(${a.id})">🗑️</button></div></div>`).join('');
}
function openAddAdmin(){document.getElementById('admin-modal-title').textContent=currentLang==='ar'?'إضافة مسؤول':'Add Admin';document.getElementById('edit-admin-id').value='';document.getElementById('admin-form-name').value='';document.getElementById('admin-form-username').value='';document.getElementById('admin-form-pass').value='';document.getElementById('admin-pass-group').style.display='block';openModal('add-admin-modal')}
async function saveAdmin(){const name=document.getElementById('admin-form-name').value.trim(),username=document.getElementById('admin-form-username').value.trim(),pass=document.getElementById('admin-form-pass').value.trim(),role=document.getElementById('admin-form-role').value;const ar=currentLang==='ar';if(!name||!username||!pass)return notify(ar?'أكمل جميع الحقول':'Fill all fields','error');try{await dbPost('admins',{name,username,password:pass,role});notify(ar?'تمت الإضافة ✅':'Added ✅','success');closeModal('add-admin-modal');loadAdminsList()}catch(e){notify('Error','error')}}
async function deleteAdmin(id){
  const ar=currentLang==='ar';
  // Prevent deleting the hardcoded superadmin
  if(String(id)==='superadmin'||!id){notify(ar?'لا يمكن حذف المسؤول الرئيسي':'Cannot delete main admin','error');return;}
  if(!confirm(ar?'حذف المسؤول؟':'Delete admin?'))return;
  try{await dbDelete('admins',`?id=eq.${id}`);notify(ar?'تم الحذف':'Deleted','success');loadAdminsList();}
  catch(e){notify('Error: '+e.message,'error');}
}

// ── WARNINGS ──

// ── MANAGER TEAM MANAGEMENT ──
// Module state (was in legacy.js lines 1820-1821)
let editingManagerId = null;
let managerTeamData = {}; // cache: managerId -> [empId,...]

async function openManagerTeam(managerId, managerName) {
  editingManagerId = managerId;
  document.getElementById('manager-team-title').textContent = '👥 فريق: ' + managerName;
  document.getElementById('manager-team-subtitle').textContent = 'اختر الموظفين التابعين لهذا التيم ليدر';
  // load existing team
  const existing = await dbGet('manager_teams', `?manager_id=eq.${managerId}&select=employee_id`).catch(()=>[]) || [];
  const assignedIds = existing.map(r => r.employee_id);
  const el = document.getElementById('manager-team-list');
  if (!allEmployees.length) { el.innerHTML = '<div class="empty">لا يوجد موظفون</div>'; }
  else {
    el.innerHTML = allEmployees.map(emp => `
      <div class="team-emp-row">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="emp-avatar" style="width:32px;height:32px;font-size:12px">${emp.name[0].toUpperCase()}</div>
          <div>
            <div style="font-size:13px;font-weight:700">${emp.name}</div>
            <div style="font-size:11px;color:var(--muted)">${emp.branch||'-'}</div>
          </div>
        </div>
        <input type="checkbox" class="team-check" data-emp-id="${emp.id}" ${assignedIds.includes(emp.id)?'checked':''}>
      </div>
    `).join('');
  }
  openModal('manager-team-modal');
}

async function saveManagerTeam() {
  if (!editingManagerId) return;
  const ar = currentLang === 'ar';
  const checks = document.querySelectorAll('#manager-team-list .team-check');
  const selectedIds = Array.from(checks).filter(c=>c.checked).map(c=>parseInt(c.dataset.empId));
  try {
    // delete existing
    await dbDelete('manager_teams', `?manager_id=eq.${editingManagerId}`);
    // insert new
    for (const empId of selectedIds) {
      await dbPost('manager_teams', {manager_id: editingManagerId, employee_id: empId});
    }
    managerTeamData[editingManagerId] = selectedIds;
    notify(ar ? 'تم حفظ الفريق ✅' : 'Team saved ✅', 'success');
    closeModal('manager-team-modal');
  } catch(e) { notify('Error: ' + e.message, 'error'); }
}

async function getManagerTeamIds() {
  // returns employee IDs managed by current user (if team leader)
  if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'team_leader')) return null;
  if (managerTeamData[currentUser.id]) return managerTeamData[currentUser.id];
  const res = await dbGet('manager_teams', `?manager_id=eq.${currentUser.id}&select=employee_id`).catch(()=>[]) || [];
  const ids = res.map(r => r.employee_id);
  managerTeamData[currentUser.id] = ids;
  return ids;
}

// Filter employees list for team leader - only show their team
async function filterEmployeesForManager() {
  if (!currentUser || (currentUser.role !== 'manager' && currentUser.role !== 'team_leader')) return;
  const teamIds = await getManagerTeamIds();
  if (!teamIds) return;
  // filter allEmployees to only team members
  allEmployees = allEmployees.filter(e => teamIds.includes(e.id));
  renderEmployeesList();
  populateReportSelect();
}

// displayPhotos moved to modules/admin/display.js
