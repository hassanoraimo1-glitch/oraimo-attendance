// ═══════════════════════════════════════════════════════════
// attendance_patch_loader.js
// يحل مشكلة visibilitychange اللي كانت بتعمل reset للـ session
// ضعه في: src/core/attendance_patch_loader.js
// وأضفه في index.html قبل سطر attendance.js
// ═══════════════════════════════════════════════════════════

(function fixVisibilityChangeBug() {
  // المشكلة: app.js كان في visibilitychange بيعمل:
  //   window.__SESSION_RESTORED__ = false
  // وده بيخلي auth.js يعمل restoreSavedSession من أول
  // وبيعمل reset للـ attendance button قبل ما DB يرد
  
  // الحل: override الـ visibilitychange listener بعد ما app.js يتحمل
  // عشان نمنع الـ reset لو currentUser موجود

  function applyFix() {
    // override الـ __SESSION_RESTORED__ property عشان ميتغيرش لـ false
    // لو currentUser موجود
    let _sessionRestored = false;

    try {
      Object.defineProperty(window, '__SESSION_RESTORED__', {
        get() { return _sessionRestored; },
        set(v) {
          // لو حد بيحاول يعمله false وعندنا currentUser — امنعه
          if (v === false && window.currentUser) {
            console.log('[patch] __SESSION_RESTORED__ reset blocked — user active');
            return; // لا تعمل reset
          }
          _sessionRestored = v;
        },
        configurable: true
      });

      console.log('[patch] ✅ __SESSION_RESTORED__ protected');
    } catch (e) {
      // لو defineProperty فشل (مثلاً لو اتعرف قبل كده)، مش مشكلة
      console.warn('[patch] could not protect __SESSION_RESTORED__:', e.message);
    }
  }

  // طبق الـ fix بعد ما app.js يتحمل
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFix, { once: true });
  } else {
    applyFix();
  }

  // كمان: بعد كل visibilitychange، لو currentUser موجود — حدث الزرار من الـ DB
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.currentUser) {
      // تأكد إن الـ session مش هتتعمل reset
      window.__SESSION_RESTORED__ = true;
      
      // حدث الـ attendance button من الـ DB
      setTimeout(function() {
        if (typeof window.loadEmpData === 'function' && window.currentUser) {
          window.loadEmpData().catch(function() {});
        }
      }, 300);
    }
  });

})();
