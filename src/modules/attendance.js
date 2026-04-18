// ═══════════════════════════════════════════════════════════
// modules/attendance.js — Attendance, selfie, camera, daily log
// Provides globals: loadEmpData, updateAttendBtn, handleAttendClick,
//   confirmAttendance, openCamera, closeCamera, capturePhoto,
//   renderAttendHistory, loadEmpWarnings, loadEmpDailyLog, loadEmpMonthlyReport
// Uses module-level state: videoStream, capturedPhoto, capturedLocation, attendMode
// (all declared as let in fallbacks.js globals block)
// ═══════════════════════════════════════════════════════════

async function loadEmpData(){
  try{
    const today=todayStr(),pm=getPayrollMonth();
    const todayAtt=await dbGet('attendance',`?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`);
    updateAttendBtn(todayAtt&&todayAtt.length>0?todayAtt[0]:null);
    const monthAtt=await dbGet('attendance',`?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`);
    document.getElementById('emp-attend-count').textContent=monthAtt?monthAtt.length:0;
    let lateTotal=0;(monthAtt||[]).forEach(a=>{lateTotal+=(a.late_minutes||0)});
    document.getElementById('emp-late-total').textContent=lateTotal+(currentLang==='ar'?' د':'m');
    const monthSales=await dbGet('sales',`?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`);
    let salesTotal=0;(monthSales||[]).forEach(s=>{salesTotal+=s.total_amount});
    document.getElementById('emp-sales-total').textContent='EGP '+fmtEGP(salesTotal);
    const mon=pm.start.substring(0,7);
    const targetRes=await dbGet('targets',`?employee_id=eq.${currentUser.id}&month=eq.${mon}&select=*`);
    const target=targetRes&&targetRes.length>0?targetRes[0].amount:0;
    const kmodel=targetRes&&targetRes.length>0?targetRes[0].kmodel_amount:0;
    document.getElementById('target-achieved').textContent='EGP '+fmtEGP(salesTotal);
    document.getElementById('target-goal').textContent=(currentLang==='ar'?'التارجت: ':'Target: ')+'EGP '+fmtEGP(target);
    const pct=target>0?Math.min(100,Math.round(salesTotal/target*100)):0;
    document.getElementById('target-fill').style.width=pct+'%';
    document.getElementById('target-pct').textContent=pct+'%';
    // K Model
    const kr=document.getElementById('kmodel-row');
    if(kmodel>0&&kr){
      kr.style.display='block';
      const kpct=Math.min(100,Math.round(salesTotal/kmodel*100));
      document.getElementById('kmodel-fill').style.width=kpct+'%';
      document.getElementById('kmodel-pct').textContent=kpct+'%';
    }else if(kr)kr.style.display='none';
    // Absent
    const startD=new Date(pm.start),endD=new Date(Math.min(new Date(pm.end),new Date()));
    let absent=0;
    for(let d=new Date(startD);d<=endD;d.setDate(d.getDate()+1)){
      if(d.getDay()===currentUser.day_off)continue;
      const ds=fmtDate(new Date(d));
      if(!(monthAtt||[]).find(a=>a.date===ds))absent++;
    }
    document.getElementById('emp-absent-count').textContent=absent;
    renderDailySalesGrid(monthSales,pm);renderEmpPerfChart(monthSales,pm);
    const recent=await dbGet('attendance',`?employee_id=eq.${currentUser.id}&order=date.desc&limit=7&select=*`);
    renderAttendHistory(recent);loadEmpWarnings();loadTodaySales();
    // Show shift label on home
    const shiftInfoEl=document.getElementById('emp-shift-info');
    if(shiftInfoEl&&currentUser){
      const ar=currentLang==='ar';
      const today=new Date();const dow=today.getDay();
      const isThurFri=(dow===4||dow===5);
      let label;
      if(currentUser.shift==='evening'){
        label=isThurFri
          ?(ar?'🌙 مسائي: 3م – 11م':'🌙 Evening: 3PM–11PM')
          :(ar?'🌙 مسائي: 2م – 10م':'🌙 Evening: 2PM–10PM');
      } else {
        label=ar?'🌅 صباحي: 10ص – 6م':'🌅 Morning: 10AM–6PM';
      }
      shiftInfoEl.textContent=label;
    }
  }catch(e){console.error(e)}
}

function updateAttendBtn(record){
  const btn=document.getElementById('attend-btn'),status=document.getElementById('attend-status');if(!btn)return;
  const ar=currentLang==='ar';
  if(record&&record.check_in&&!record.check_out){
    btn.classList.add('checked-in');btn.querySelector('.attend-icon').textContent='🔴';
    btn.querySelector('.attend-label').textContent=ar?'تسجيل خروج':'Check Out';
    status.textContent=`${ar?'دخل الساعة':'In at'} ${record.check_in}${record.late_minutes>0?(ar?' (تأخر '+record.late_minutes+' د)':' ('+record.late_minutes+'m late)'):''}`;
  }else if(record&&record.check_out){
    btn.classList.remove('checked-in');btn.querySelector('.attend-icon').textContent='✅';
    btn.querySelector('.attend-label').textContent=ar?'تم':'Done';btn.onclick=null;
    status.textContent=`${ar?'دخول':'In'}: ${record.check_in} – ${ar?'خروج':'Out'}: ${record.check_out}`;
  }else{
    btn.classList.remove('checked-in');btn.querySelector('.attend-icon').textContent='🟢';
    btn.querySelector('.attend-label').textContent=ar?'تسجيل دخول':'Check In';
    status.textContent=ar?'لم يتم تسجيل حضور اليوم':'No attendance recorded today';
  }
}
function handleAttendClick(){
  const btn=document.getElementById('attend-btn');if(btn.querySelector('.attend-icon').textContent==='✅')return;
  attendMode=btn.classList.contains('checked-in')?'out':'in';
  const ar=currentLang==='ar';
  document.getElementById('selfie-modal-title').textContent=attendMode==='in'?(ar?'تأكيد تسجيل الدخول':'Confirm Check In'):(ar?'تأكيد تسجيل الخروج':'Confirm Check Out');
  document.getElementById('camera-label').textContent=attendMode==='in'?(ar?'📸 التقط سيلفي للدخول':'📸 Take selfie to check in'):(ar?'📸 التقط سيلفي للخروج':'📸 Take selfie to check out');
  // FIX: Location must be confirmed BEFORE camera opens
  if(!navigator.geolocation){notify(ar?'⚠️ جهازك لا يدعم تحديد الموقع':'⚠️ Geolocation not supported','error');return;}
  notify(ar?'📍 جاري تحديد موقعك...':'📍 Getting your location...','info');
  btn.style.pointerEvents='none';
  navigator.geolocation.getCurrentPosition(
    pos=>{
      capturedLocation={lat:pos.coords.latitude,lng:pos.coords.longitude};
      btn.style.pointerEvents='';
      openCamera();
    },
    (err)=>{
      // iOS: if denied permanently show guide
      capturedLocation=null;
      btn.style.pointerEvents='';
      if(err.code===1){
        notify(ar?'❌ افتح الإعدادات ← Safari ← الموقع وافعّله':'❌ Settings → Safari → Location → Allow','error');
      } else {
        notify(ar?'❌ تعذر تحديد الموقع، حاول مرة أخرى':'❌ Location failed, try again','error');
      }
    },
    {enableHighAccuracy:true,timeout:15000,maximumAge:0}
  );
}

function renderAttendHistory(records){
  const el=document.getElementById('emp-attend-history');if(!el)return;
  const ar=currentLang==='ar';
  if(!records||records.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">📭</div>${ar?'لا توجد سجلات':'No records'}</div>`;return}
  el.innerHTML=records.map(r=>`<div class="history-item">
    <div class="hist-top"><div class="hist-name">${r.date}</div>
    <span class="badge ${r.late_minutes>0?'badge-yellow':'badge-green'}">${r.late_minutes>0?r.late_minutes+(ar?' د تأخير':'m late'):(ar?'في الوقت':'On time')}</span></div>
    <div style="display:flex;justify-content:space-between">
      <div class="hist-meta">${ar?'دخول':'In'}: ${r.check_in||'-'}</div>
      <div class="hist-meta">${ar?'خروج':'Out'}: ${r.check_out||'-'}</div>
    </div></div>`).join('');
}

// ── renderDailySalesGrid + renderEmpPerfChart moved to modules/sales.js ──
// (both are sale-chart helpers; kept there as single source of truth)

async function loadEmpWarnings(){
  try{
    const warns=await dbGet('warnings',`?employee_id=eq.${currentUser.id}&order=created_at.desc&limit=5&select=*`);
    const card=document.getElementById('emp-warnings-card'),list=document.getElementById('emp-warnings-list');
    if(!warns||warns.length===0){if(card)card.style.display='none';return}
    if(card)card.style.display='block';
    if(list)list.innerHTML=warns.map(w=>`<div class="perm-card" style="border-color:var(--yellow)">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span class="badge badge-yellow">${currentLang==='ar'?'تحذير':'Warning'}</span>
        <span style="font-size:10px;color:var(--muted)">${(w.created_at||'').substring(0,10)}</span>
      </div><div style="font-size:12px">${w.message}</div></div>`).join('');
  }catch(e){}
}

async function loadEmpDailyLog(){
  const pm=getPayrollMonth();const ar=currentLang==='ar';
  const att=await dbGet('attendance',`?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*&order=date.desc`)||[];
  const el=document.getElementById('emp-daily-log');if(!el)return;
  if(att.length===0){el.innerHTML=`<div class="empty"><div class="empty-icon">📋</div>${ar?'لا توجد سجلات':'No records'}</div>`;return}
  el.innerHTML=`<div class="table-wrap"><table>
    <tr><th>${ar?'التاريخ':'Date'}</th><th>${ar?'دخول':'In'}</th><th>${ar?'خروج':'Out'}</th><th>${ar?'تأخير':'Late'}</th></tr>
    ${att.map(a=>`<tr><td>${a.date}</td><td>${a.check_in||'-'}</td><td>${a.check_out||'-'}</td>
      <td>${a.late_minutes>0?`<span class="badge badge-yellow">${a.late_minutes}${ar?'د':'m'}</span>`:'<span class="badge badge-green">✓</span>'}</td></tr>`).join('')}
  </table></div>`;
}

async function loadEmpMonthlyReport(){
  const pm=getPayrollMonth();const ar=currentLang==='ar';
  const[att,sales]=await Promise.all([
    dbGet('attendance',`?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`),
    dbGet('sales',`?employee_id=eq.${currentUser.id}&date=gte.${pm.start}&date=lte.${pm.end}&select=*`)
  ]);
  let salesTotal=0;(sales||[]).forEach(s=>salesTotal+=s.total_amount);
  let lateTotal=0;(att||[]).forEach(a=>lateTotal+=(a.late_minutes||0));
  const el=document.getElementById('monthly-report-emp');if(!el)return;
  const rows=ar?[['أيام الحضور',(att||[]).length+' أيام','var(--green)'],['دقائق التأخير',lateTotal+' د','var(--yellow)'],['إجمالي المبيعات','EGP '+salesTotal.toLocaleString(),'var(--green)'],['عدد المعاملات',(sales||[]).length,'var(--text)']]
    :[['Attendance',(att||[]).length+' days','var(--green)'],['Late',lateTotal+'m','var(--yellow)'],['Total Sales','EGP '+salesTotal.toLocaleString(),'var(--green)'],['Transactions',(sales||[]).length,'var(--text)']];
  el.innerHTML=`<div style="font-size:11px;color:var(--muted);margin-bottom:10px">${pm.label}</div>`+rows.map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--muted)">${l}</span><span style="font-size:13px;font-weight:700;color:${c}">${v}</span></div>`).join('');
}

// ── CAMERA ──
async function openCamera(){
  try{
    // iOS Safari requires specific constraints
    const constraints={
      video:{
        facingMode:{ideal:'user'},
        width:{ideal:1280},
        height:{ideal:720}
      },
      audio:false
    };
    videoStream=await navigator.mediaDevices.getUserMedia(constraints);
    const video=document.getElementById('video');
    video.srcObject=videoStream;
    // iOS requires playsinline + explicit play()
    video.setAttribute('playsinline','');
    video.setAttribute('autoplay','');
    video.muted=true;
    await video.play().catch(()=>{});
    document.getElementById('camera-modal').classList.add('open');
  }catch(e){
    // iOS fallback: try without ideal constraints
    try{
      videoStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      const video=document.getElementById('video');
      video.srcObject=videoStream;
      video.setAttribute('playsinline','');
      video.muted=true;
      await video.play().catch(()=>{});
      document.getElementById('camera-modal').classList.add('open');
    }catch(e2){
      notify((currentLang==='ar'?'❌ خطأ في الكاميرا: ':'❌ Camera error: ')+e2.message,'error');
    }
  }
}
function closeCamera(){if(videoStream){videoStream.getTracks().forEach(t=>t.stop());videoStream=null}document.getElementById('camera-modal').classList.remove('open')}
function capturePhoto(){
  const video=document.getElementById('video'),canvas=document.getElementById('canvas');
  canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const ctx=canvas.getContext('2d');ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0);
  capturedPhoto=canvas.toDataURL('image/jpeg',0.65);closeCamera();
  document.getElementById('selfie-preview-img').src=capturedPhoto;
  document.getElementById('selfie-modal').classList.add('open');
  document.getElementById('confirm-attend-btn').disabled=false;
  const ar=currentLang==='ar';
  // Location already captured before camera opened
  const locStatusEl=document.getElementById('location-status');
  if(capturedLocation){
    locStatusEl.innerHTML=`✅ ${ar?'تم تحديد الموقع':'Location found'} — <a href="https://maps.google.com/?q=${capturedLocation.lat},${capturedLocation.lng}" target="_blank" style="color:var(--green)">${ar?'عرض':'View'}</a>`;
  } else {
    locStatusEl.textContent=ar?'⚠️ لم يتم تحديد الموقع':'⚠️ Location unavailable';
  }
}
async function confirmAttendance(){
  const today=todayStr(),now=new Date(),timeStr=now.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'});
  const ar=currentLang==='ar';
  try{
    const todayAtt=await dbGet('attendance',`?employee_id=eq.${currentUser.id}&date=eq.${today}&select=*`);
    if(attendMode==='in'){
      // Determine shift start based on employee shift & day
      const dayOfWeek=now.getDay(); // 0=Sun,4=Thu,5=Fri
      const isThurFri=(dayOfWeek===4||dayOfWeek===5);
      let shiftStart;
      if(currentUser.shift==='evening'){
        shiftStart=isThurFri?'15:00':'14:00'; // Thu/Fri: 3pm-11pm, else 2pm-10pm
      } else {
        shiftStart='10:00'; // Morning: 10am-6pm
      }
      const[wh,wm]=shiftStart.split(':').map(Number),[ah,am]=timeStr.split(':').map(Number);
      const lateMin=Math.max(0,(ah*60+am)-(wh*60+wm));
      await dbPost('attendance',{employee_id:currentUser.id,date:today,check_in:timeStr,late_minutes:lateMin,selfie_in:capturedPhoto,location_lat:capturedLocation?.lat,location_lng:capturedLocation?.lng});
      notify(ar?'تم تسجيل الدخول ✅':'Checked in ✅','success');
    }else{
      if(todayAtt&&todayAtt.length>0){await dbPatch('attendance',{check_out:timeStr,selfie_out:capturedPhoto},`?employee_id=eq.${currentUser.id}&date=eq.${today}`);notify(ar?'تم تسجيل الخروج ✅':'Checked out ✅','success');}
    }
    closeModal('selfie-modal');loadEmpData();
  }catch(e){notify((ar?'خطأ: ':'Error: ')+e.message,'error')}
}

// ── SALES ──
