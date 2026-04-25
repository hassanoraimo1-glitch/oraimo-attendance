// ═══════════════════════════════════════════════════════════
// core/fallbacks.js — Early boot shims (load order: before app.js)
//
// Classic scripts (auth, chat, ui, …) run before the deferred ES
// module entry assigns window.* from src/app.js. This file only
// defines globals when they are still missing — never overwrites
// real implementations from the app module.
// ═══════════════════════════════════════════════════════════

/** Same project URL/key as src/config.js (kept inline: this file is not an ES module). */
const _SUPABASE_URL = 'https://lmszelfnosejdemxhodm.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb';

if (typeof window.currentLang === 'undefined') {
  window.currentLang = localStorage.getItem('oraimo_lang') || 'ar';
}

if (typeof window.dbGet !== 'function') {
  const _hdr = {
    apikey: _SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + _SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  // ── Simple in-memory GET cache (30 sec) ──────────────────
  var _cache = {};
  var _CACHE_TTL = 30000; // 30 seconds — short enough that new data shows quickly

  function _cacheKey(table, q) { return table + '|' + (q || ''); }

  function _cacheGet(table, q) {
    var k = _cacheKey(table, q);
    var entry = _cache[k];
    if (!entry) return null;
    if (Date.now() - entry.t > _CACHE_TTL) { delete _cache[k]; return null; }
    return entry.v;
  }

  function _cacheSet(table, q, v) {
    _cache[_cacheKey(table, q)] = { v: v, t: Date.now() };
  }

  function _cacheInvalidate(table) {
    // Remove all entries for this table
    Object.keys(_cache).forEach(function(k) {
      if (k.indexOf(table + '|') === 0) delete _cache[k];
    });
    // Also invalidate the ES-module cache if available
    if (typeof window.invalidateCache === 'function') {
      try { window.invalidateCache(table); } catch(_) {}
    }
  }

  window.dbGet = async function (table, q) {
    q = q || '';
    var cached = _cacheGet(table, q);
    if (cached !== null) return cached;
    var res = await fetch(_SUPABASE_URL + '/rest/v1/' + table + q, { headers: _hdr });
    if (!res.ok) throw new Error('DB GET failed ' + res.status);
    var data = await res.json();
    _cacheSet(table, q, data);
    return data;
  };
  window.dbPost = async function (table, body) {
    var res = await fetch(_SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: { ..._hdr, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('DB POST failed ' + res.status);
    _cacheInvalidate(table);
    return res.json();
  };
  window.dbPatch = async function (table, body, query) {
    var res = await fetch(_SUPABASE_URL + '/rest/v1/' + table + (query || ''), {
      method: 'PATCH',
      headers: _hdr,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('DB PATCH failed ' + res.status);
    _cacheInvalidate(table);
    return res.status === 204 ? null : res.json();
  };
  window.dbDelete = async function (table, query) {
    var res = await fetch(_SUPABASE_URL + '/rest/v1/' + table + (query || ''), {
      method: 'DELETE',
      headers: _hdr,
    });
    if (!res.ok) throw new Error('DB DELETE failed ' + res.status);
    _cacheInvalidate(table);
    return null;
  };
}

// notify: defined in modules/ui.js → window (do not stub here).

if (typeof window.todayStr !== 'function') {
  window.todayStr = function () {
    return new Date().toISOString().split('T')[0];
  };
}
if (typeof window.fmtDate !== 'function') {
  window.fmtDate = function (d) {
    return new Date(d).toISOString().split('T')[0];
  };
}
if (typeof window.fmtEGP !== 'function') {
  window.fmtEGP = function (n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(Math.round(n));
  };
}
if (typeof window.fmtTime !== 'function') {
  window.fmtTime = function (iso) {
    try {
      return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };
}
if (typeof window.getPayrollMonth !== 'function') {
  window.getPayrollMonth = function () {
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth();
    const y = now.getFullYear();
    let s;
    let e;
    if (d >= 21) {
      s = new Date(y, m, 21);
      e = new Date(y, m + 1, 20);
    } else {
      s = new Date(y, m - 1, 21);
      e = new Date(y, m, 20);
    }
    return {
      start: s.toISOString().split('T')[0],
      end: e.toISOString().split('T')[0],
      label: s.toLocaleString('ar-EG', { month: 'long' }) + ' 21',
    };
  };
}
if (typeof window.applyLang !== 'function') {
  window.applyLang = function () {
    const isAr = window.currentLang === 'ar';
    document.documentElement.lang = window.currentLang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-ar],[data-en]').forEach((el) => {
      const ar = el.dataset.ar;
      const en = el.dataset.en;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = isAr ? el.dataset.arPh || el.placeholder : el.dataset.enPh || el.placeholder;
      } else if (ar && en) {
        el.textContent = isAr ? ar : en;
      }
    });
  };
}
if (typeof window.toggleLang !== 'function') {
  window.toggleLang = function () {
    window.currentLang = window.currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('oraimo_lang', window.currentLang);
    window.applyLang();
  };
}
if (typeof window.fixNavDirection !== 'function') {
  window.fixNavDirection = function () {};
}
if (typeof window.DAYS_AR === 'undefined') {
  window.DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  window.DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
}

// ── Shared globals for classic scripts (bare `DAYS_AR` etc.) ──
var allAdmins = [];
var allBranches = [];
var workSettings = { start: '09:00', end: '18:00' };
var videoStream = null;
var capturedPhoto = null;
var capturedLocation = null;
var attendMode = 'in';
var selectedProduct = null;
var selectedQty = 1;
var _isSubmitting = false;
var DAYS_AR = window.DAYS_AR;
var DAYS_EN = window.DAYS_EN;

if (typeof window.sendPushNotification !== 'function') {
  window.sendPushNotification = async function (title, message, targetUserId) {
    if (!title || !message) return;
    try {
      await fetch(_SUPABASE_URL + '/functions/v1/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + _SUPABASE_ANON_KEY,
          apikey: _SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          title: String(title).slice(0, 120),
          message: String(message).slice(0, 300),
          target_user_id: targetUserId ? String(targetUserId) : null,
        }),
      });
    } catch (e) {
      console.warn('[sendPushNotification shim]', e.message);
    }
  };
}

if (typeof window.resetPushRegistrationState !== 'function') {
  window.resetPushRegistrationState = function () {};
}
if (typeof window.registerOneSignalUser !== 'function') {
  window.registerOneSignalUser = async function () {
    const user = window.currentUser;
    if (!user || !user.id) return;
    for (let i = 0; i < 10; i++) {
      if (window.OneSignal && window.OneSignal.Notifications && window.OneSignal.User) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    const OS = window.OneSignal;
    if (!OS || !OS.Notifications || !OS.User) return;
    try {
      try {
        await OS.login(String(user.id));
      } catch (_) {}
      let ok = OS.Notifications.permission === true || OS.Notifications.permission === 'granted';
      if (!ok && typeof Notification !== 'undefined' && Notification.permission === 'granted') ok = true;
      if (!ok) {
        const asked = await OS.Notifications.requestPermission().catch(() => false);
        ok =
          asked === true ||
          asked === 'granted' ||
          (typeof Notification !== 'undefined' && Notification.permission === 'granted');
      }
      if (!ok) return;
      const sub = OS.User.PushSubscription;
      if (sub && typeof sub.optIn === 'function') await sub.optIn().catch(() => {});
      await OS.User.addTag('user_id', String(user.id));
      await OS.User.addTag('name', String(user.name || ''));
      await OS.User.addTag('role', String(user.role || 'employee'));
    } catch (e) {
      console.warn('[registerOneSignalUser shim]', e.message);
    }
  };
}

if (typeof window.chatSubscribeRealtime !== 'function') {
  window.chatSubscribeRealtime = async function (onNew) {
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
      const client = mod.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
      const channel = client
        .channel('messages-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (onNew) onNew(payload.new);
          }
        )
        .subscribe();
      return function unsub() {
        try {
          client.removeChannel(channel);
        } catch (_) {}
      };
    } catch (e) {
      console.warn('[chatSubscribeRealtime shim]', e.message);
      throw e;
    }
  };
}
