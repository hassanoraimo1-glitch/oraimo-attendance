// ═══════════════════════════════════════════════════════════
// modules/admin/employees.js — Employee list CRUD + report helpers
// Provides globals: loadAllEmployees, renderEmployeesList,
//   populateReportSelect, populateTargetSelect, openAddEmp, openEditEmp,
//   selectDay, toggleEmpBranchField, saveEmployee, deleteEmp
// Module state: allEmployees (shared across admin modules)
// ═══════════════════════════════════════════════════════════

async function loadAllEmployees(){
  try{
    allEmployees=await dbGet('employees','?select=*&order=name')||[];
    renderEmployeesList();populateReportSelect();
    if(currentUser&&(currentUser.role==='manager'||currentUser.role==='team_leader')) await filterEmployeesForManager();
  }catch(e){}
}
function renderEmployeesList(){
  const el=document.getElementById('adm-emp-list');if(!el)return;const ar=currentLang==='ar';
  if(allEmployees.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">👥</div>${ar?'لا يوجد موظفون بعد':'No employees yet'}</div>`;return}
  const isViewer=currentUser?.role==='viewer';
  const shiftLabel=s=>s==='evening'?(ar?'🌙 مسائي':'🌙 Eve'):(ar?'🌅 صباحي':'🌅 Mor');
  el.innerHTML=allEmployees.map(emp=>`<div class="emp-card">
    <div class="emp-avatar" style="${emp.role==='team_leader'?'background:linear-gradient(135deg,#9c27b0,#6a0080)':''};overflow:hidden">${emp.profile_photo?`<img src="${emp.profile_photo}" style="width:100%;height:100%;object-fit:cover">`:((emp.name||'?')[0]||'?').toUpperCase()}</div>
    <div class="emp-info">
      <div class="emp-name">${emp.name} ${emp.role==='team_leader'?'<span class="badge badge-purple" style="font-size:9px">Team Leader</span>':''}</div>
      <div class="emp-branch">${emp.branch||'-'} · ${ar?'إجازة:':'Off:'} ${ar?DAYS_AR[emp.day_off]:DAYS_EN[emp.day_off]||'-'}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">${shiftLabel(emp.shift)} ${emp.job_title?'· '+emp.job_title:emp.role==='employee'?'· '+(ar?'بروموتر':'Promoter'):''}</div>
    </div>
    ${!isViewer?`<div class="emp-actions">${emp.role==='team_leader'?`<button class="action-btn view" onclick="openManagerTeam(${emp.id},'${emp.name}')">👥 فريق</button>`:''}<button class="action-btn edit" onclick="openEditEmp(${emp.id})">✏️</button><button class="action-btn del" onclick="deleteEmp(${emp.id})">🗑️</button><button class="action-btn warn" onclick="openWarnModal(${emp.id},'${emp.name}')">⚠️</button></div>`:''}
  </div>`).join('');
}
function populateReportSelect(){const sel=document.getElementById('report-emp-select');if(!sel)return;sel.innerHTML=`<option value="">${currentLang==='ar'?'-- اختر موظف --':'-- Select Employee --'}</option>`+allEmployees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}
function populateTargetSelect(){const sel=document.getElementById('target-emp-select');if(!sel)return;sel.innerHTML=allEmployees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}
function openAddEmp(){
  document.getElementById('emp-modal-title').textContent=currentLang==='ar'?'إضافة موظف':'Add Employee';
  document.getElementById('edit-emp-id').value='';document.getElementById('emp-form-name').value='';
  document.getElementById('emp-form-username').value='';document.getElementById('emp-form-pass').value='';
  document.getElementById('emp-pass-group').style.display='block';
  const roleEl=document.getElementById('emp-form-role');if(roleEl)roleEl.value='employee';
  toggleEmpBranchField();
  selectedDayOff=-1;document.querySelectorAll('.day-chip').forEach(c=>c.classList.remove('selected'));
  populateBranchSelects();openModal('add-emp-modal');
}
function openEditEmp(id){
  const emp=allEmployees.find(e=>e.id===id);if(!emp)return;
  document.getElementById('emp-modal-title').textContent=currentLang==='ar'?'تعديل الموظف':'Edit Employee';
  document.getElementById('edit-emp-id').value=id;document.getElementById('emp-form-name').value=emp.name;
  document.getElementById('emp-form-username').value=emp.username;document.getElementById('emp-pass-group').style.display='none';
  const roleEl=document.getElementById('emp-form-role');if(roleEl)roleEl.value=emp.role||'employee';
  const shiftEl=document.getElementById('emp-form-shift');if(shiftEl)shiftEl.value=emp.shift||'morning';
  toggleEmpBranchField();
  selectedDayOff=emp.day_off;populateBranchSelects();
  if(emp.branch)document.getElementById('emp-form-branch').value=emp.branch;
  document.querySelectorAll('.day-chip').forEach(c=>c.classList.toggle('selected',parseInt(c.dataset.day)===emp.day_off));
  openModal('add-emp-modal');
}
function selectDay(day){selectedDayOff=day;document.querySelectorAll('.day-chip').forEach(c=>c.classList.toggle('selected',parseInt(c.dataset.day)===day))}
function toggleEmpBranchField(){
  const role=document.getElementById('emp-form-role')?.value;
  const branchGrp=document.getElementById('emp-branch-group');
  // team leader doesn't need a branch
  if(branchGrp) branchGrp.style.display=role==='team_leader'?'none':'block';
}

async function saveEmployee(){
  const id=document.getElementById('edit-emp-id').value;
  const name=document.getElementById('emp-form-name').value.trim();
  const username=document.getElementById('emp-form-username').value.trim();
  const pass=document.getElementById('emp-form-pass').value.trim();
  const branch=document.getElementById('emp-form-branch')?.value||'';
  const role=document.getElementById('emp-form-role')?.value||'employee';
  const shiftVal=document.getElementById('emp-form-shift')?.value||'morning';
  const ar=currentLang==='ar';
  if(!name||!username)return notify(ar?'أدخل الاسم واسم المستخدم':'Enter name and username','error');
  if(!id&&!pass)return notify(ar?'أدخل كلمة المرور':'Enter password','error');
  if(selectedDayOff<0)return notify(ar?'اختر يوم الإجازة':'Select day off','error');
  try{
    // Check if username already taken by another employee
    if(!id){
      const existing=await dbGet('employees',`?username=eq.${encodeURIComponent(username)}&select=id`).catch(()=>[]);
      if(existing&&existing.length>0)return notify(ar?'اسم المستخدم مستخدم بالفعل، اختر آخر':'Username already taken','error');
    }
    const data={name,username,day_off:selectedDayOff,role,shift:shiftVal};
    if(role==='employee') data.branch=branch;
    if(id) await dbPatch('employees',data,`?id=eq.${id}`);
    else await dbPost('employees',{...data,password:pass});
    notify(ar?'تم الحفظ ✅':'Saved ✅','success');closeModal('add-emp-modal');loadAllEmployees();
  }catch(e){
    const msg=e.message||'';
    const ar2=currentLang==='ar';
    if(msg.includes('409')||msg.includes('conflict')||msg.includes('duplicate')){
      notify(ar2?'اسم المستخدم مستخدم بالفعل، اختر اسم آخر':'Username already taken, choose another','error');
    } else {
      notify((ar2?'خطأ: ':'Error: ')+msg,'error');
    }
  }
}
async function deleteEmp(id){const ar=currentLang==='ar';if(!confirm(ar?'حذف الموظف؟ سيتم حذف جميع البيانات!':'Delete employee? All data will be removed!'))return;await dbDelete('employees',`?id=eq.${id}`);loadAllEmployees()}
