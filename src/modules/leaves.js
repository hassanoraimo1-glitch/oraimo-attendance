// ═══════════════════════════════════════════════════════════
// modules/leaves.js — Leave/permission requests + warnings
// Provides globals: sendLeaveRequest, respondLeave, toggleLeaveFields,
//   openWarnModal, setWarnTemplate, sendWarning
// ═══════════════════════════════════════════════════════════

let _leaveSending = false;

async function sendLeaveRequest(leaveType) {
  if (_leaveSending) return;

  if (!currentUser || !currentUser.id) {
    notify(currentLang === 'ar' ? 'لم يتم التعرف على المستخدم' : 'User not identified', 'error');
    return;
  }

  if (!leaveType) leaveType = 'permission';
  const ar = currentLang === 'ar';

  const reasonEl = leaveType === 'vacation'
    ? (document.getElementById('vacation-reason') || document.getElementById('leave-reason'))
    : (document.getElementById('leave-reason') || document.getElementById('vacation-reason'));

  const reason = (reasonEl?.value || '').trim();

  let duration = 0;
  if (leaveType !== 'vacation') {
    const durEl = document.getElementById('leave-duration');
    duration = parseInt(durEl?.value || '0', 10) || 0;

    const allowedDurations = [15, 30, 45, 60];
    if (!allowedDurations.includes(duration)) {
      notify(
        ar ? 'مدة الإذن يجب أن تكون: ربع ساعة أو نص ساعة أو ساعة إلا ربع أو ساعة'
           : 'Permission duration must be 15, 30, 45, or 60 minutes',
        'error'
      );
      return;
    }
  }

  let leaveDate = todayStr();
  if (leaveType === 'vacation') {
    const vdEl = document.getElementById('vacation-date');
    const vd = (vdEl?.value || '').trim();
    if (!vd) {
      notify(ar ? 'اختر تاريخ الإجازة أولاً' : 'Select vacation date first', 'error');
      return;
    }
    leaveDate = vd;
  }

  if (!reason) {
    notify(ar ? 'أدخل السبب' : 'Enter reason', 'error');
    return;
  }

  if (leaveType !== 'vacation' && duration <= 0) {
    notify(ar ? 'اختر مدة الإذن' : 'Select permission duration', 'error');
    return;
  }

  _leaveSending = true;

  const payload = {
    employee_id: currentUser.id,
    employee_name: currentUser.name || '',
    reason,
    duration_minutes: leaveType === 'vacation' ? 0 : duration,
    leave_type: leaveType,
    leave_date: leaveDate,
    status: 'pending',
    date: todayStr()
  };

  try {
    const res = await dbPost('leave_requests', payload);
    console.log('[leave-request] saved', res);

    notify(ar ? 'تم إرسال الطلب ✅' : 'Request sent ✅', 'success');

    if (leaveType === 'vacation') {
      const d = document.getElementById('vacation-date');
      if (d) d.value = '';
      const r = document.getElementById('vacation-reason');
      if (r) r.value = '';
    } else {
      const r = document.getElementById('leave-reason');
      if (r) r.value = '';
      const durEl = document.getElementById('leave-duration');
      if (durEl) durEl.value = '';
    }
  } catch (e) {
    console.error('[sendLeaveRequest] FAILED', e, 'payload:', payload);

    const msg = String(e.message || e);
    let userMsg = msg;

    if (/row-level security/i.test(msg)) {
      userMsg = ar
        ? 'فشل الحفظ: الصلاحيات في قاعدة البيانات تمنع الكتابة. راجع Admin.'
        : 'Save failed: DB permissions blocking insert. Contact Admin.';
    } else if (/schema|column|violates/i.test(msg)) {
      userMsg = ar
        ? 'خطأ في البيانات — تواصل مع الإدارة'
        : 'Data schema error — contact Admin';
    }

    notify((ar ? 'خطأ: ' : 'Error: ') + userMsg, 'error');
  } finally {
    _leaveSending = false;
  }
}

function toggleLeaveFields() {
  const type = document.getElementById('leave-type')?.value;
  const durGrp = document.getElementById('leave-duration-group');
  const dateGrp = document.getElementById('leave-date-group');

  if (durGrp) durGrp.style.display = type === 'vacation' ? 'none' : 'block';
  if (dateGrp) dateGrp.style.display = type === 'vacation' ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════════════
// ADMIN: APPROVE/REJECT LEAVE
// ═══════════════════════════════════════════════════════════
async function respondLeave(id, status) {
  const ar = currentLang === 'ar';

  try {
    const rows = await dbGet('leave_requests', `?id=eq.${id}&select=*`).catch(() => []) || [];
    const req = rows.length > 0 ? rows[0] : null;

    if (!req) {
      notify(ar ? 'الطلب غير موجود' : 'Request not found', 'error');
      return;
    }

    await dbPatch('leave_requests', { status }, `?id=eq.${id}`);

    notify(
      status === 'approved'
        ? (ar ? 'تمت الموافقة ✅' : 'Approved ✅')
        : (ar ? 'تم الرفض' : 'Rejected'),
      'success'
    );

    if (status === 'approved' && req.leave_type === 'permission') {
      console.log('[leave approved] late permission approved for employee:', req.employee_id, 'minutes:', req.duration_minutes);
    }

    if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
  } catch (e) {
    console.error('[respondLeave]', e);
    notify('Error: ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN: WARNINGS
// ═══════════════════════════════════════════════════════════
function openWarnModal(empId, empName) {
  const sel = document.getElementById('warn-emp-select');
  if (sel && typeof allEmployees !== 'undefined') {
    sel.innerHTML = allEmployees.map(e => `<option value="${e.id}" ${e.id == empId ? 'selected' : ''}>${e.name}</option>`).join('');
  }
  const t = document.getElementById('warn-text');
  if (t) t.value = '';
  openModal('warning-modal');
}

function setWarnTemplate(n) {
  const ar = currentLang === 'ar';
  const t = {
    1: ar ? '⚠️ تحذير: تأخرت اليوم. يرجى الالتزام بمواعيد العمل الرسمية.' : '⚠️ Warning: You were late today. Please commit to work hours.',
    2: ar ? '🔴 تحذير رسمي: تكرار التأخير. يرجى مراجعة الإدارة فوراً.' : '🔴 Official Warning: Repeated lateness. Contact management.',
    3: ar ? '📋 تذكير: الالتزام بالمواعيد أو سيتم احتساب غياب.' : '📋 Reminder: Commit to work hours or absence will be recorded.'
  };
  const ta = document.getElementById('warn-text');
  if (ta) ta.value = t[n] || '';
}

async function sendWarning() {
  const empId = document.getElementById('warn-emp-select')?.value;
  const msg = (document.getElementById('warn-text')?.value || '').trim();
  const ar = currentLang === 'ar';

  if (!msg) {
    notify(ar ? 'أدخل نص التحذير' : 'Enter warning message', 'error');
    return;
  }

  try {
    await dbPost('warnings', {
      employee_id: parseInt(empId, 10),
      message: msg,
      sent_by: currentUser?.name || 'Management'
    });

    notify(ar ? 'تم إرسال التحذير ✅' : 'Warning sent ✅', 'success');
    closeModal('warning-modal');
  } catch (e) {
    console.error('[sendWarning]', e);
    notify('Error: ' + e.message, 'error');
  }
}
