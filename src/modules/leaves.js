// ═══════════════════════════════════════════════════════════
// modules/leaves.js — Leave/permission requests + warnings
// Provides globals: sendLeaveRequest, respondLeave, toggleLeaveFields,
//   openWarnModal, setWarnTemplate, sendWarning
// ═══════════════════════════════════════════════════════════

// ── EMPLOYEE: SEND LEAVE / PERMISSION REQUEST ──
let _leaveSending=false;
async function sendLeaveRequest(leaveType){
  if(_leaveSending)return;
  if(!leaveType) leaveType='permission';
  const ar=currentLang==='ar';
  const reason=(leaveType==='vacation'?document.getElementById('vacation-reason'):document.getElementById('leave-reason'))?.value?.trim()||'';
  const duration=leaveType==='vacation'?0:parseInt(document.getElementById('leave-duration')?.value||'0');
  if(leaveType==='vacation'){
    const vd=document.getElementById('vacation-date')?.value||'';
    if(!vd) return notify(ar?'اختر تاريخ الإجازة أولاً':'Select vacation date first','error');
  }
  if(!reason) return notify(ar?'أدخل السبب':'Enter reason','error');
  const leaveDate=leaveType==='vacation'?(document.getElementById('vacation-date')?.value||todayStr()):todayStr();
  _leaveSending=true;
  try{
    await dbPost('leave_requests',{
      employee_id:currentUser.id,
      employee_name:currentUser.name,
      reason,
      duration_minutes:duration,
      leave_type:leaveType,
      leave_date:leaveDate,
      status:'pending',
      date:todayStr()
    });
    notify(ar?'تم إرسال الطلب ✅':'Request sent ✅','success');
    if(leaveType==='vacation'){
      const d=document.getElementById('vacation-date');if(d)d.value='';
      const r=document.getElementById('vacation-reason');if(r)r.value='';
    } else {
      const r=document.getElementById('leave-reason');if(r)r.value='';
    }
  }
  catch(e){notify('Error: '+e.message,'error');}
  finally{_leaveSending=false;}
}


// ── EMPLOYEE: TOGGLE BETWEEN LEAVE & PERMISSION FIELDS ──
function toggleLeaveFields(){
  const type=document.getElementById('leave-type')?.value;
  const durGrp=document.getElementById('leave-duration-group');
  const dateGrp=document.getElementById('leave-date-group');
  if(durGrp) durGrp.style.display=type==='vacation'?'none':'block';
  if(dateGrp) dateGrp.style.display=type==='vacation'?'block':'none';
}

// currentChat + chatSubscription moved to modules/chat.js

// ── ADMIN: APPROVE/REJECT LEAVE ──
async function respondLeave(id,status){try{await dbPatch('leave_requests',{status},`?id=eq.${id}`);notify(status==='approved'?(currentLang==='ar'?'تمت الموافقة ✅':'Approved ✅'):(currentLang==='ar'?'تم الرفض':'Rejected'),'success');loadAdminDashboard()}catch(e){}}

// ── ADMIN: WARNINGS ──
function openWarnModal(empId,empName){document.getElementById('warn-emp-select').innerHTML=allEmployees.map(e=>`<option value="${e.id}" ${e.id==empId?'selected':''}>${e.name}</option>`).join('');document.getElementById('warn-text').value='';openModal('warning-modal')}
function setWarnTemplate(n){const t={1:(currentLang==='ar'?'⚠️ تحذير: تأخرت اليوم. يرجى الالتزام بمواعيد العمل الرسمية.':'⚠️ Warning: You were late today. Please commit to work hours.'),2:(currentLang==='ar'?'🔴 تحذير رسمي: تكرار التأخير. يرجى مراجعة الإدارة فوراً.':'🔴 Official Warning: Repeated lateness. Contact management.'),3:(currentLang==='ar'?'📋 تذكير: الالتزام بالمواعيد أو سيتم احتساب غياب.':'📋 Reminder: Commit to work hours or absence will be recorded.')};document.getElementById('warn-text').value=t[n]}
async function sendWarning(){const empId=document.getElementById('warn-emp-select').value,msg=document.getElementById('warn-text').value.trim();const ar=currentLang==='ar';if(!msg)return notify(ar?'أدخل نص التحذير':'Enter warning message','error');try{await dbPost('warnings',{employee_id:parseInt(empId),message:msg,sent_by:currentUser.name||'Management'});notify(ar?'تم إرسال التحذير ✅':'Warning sent ✅','success');closeModal('warning-modal')}catch(e){}}
