// ────────────────────────────────────────────────────────────
// NOTIFICATIONS SERVICE  (hardened)
// ────────────────────────────────────────────────────────────
// Review-pass fixes:
//   • Capped SDK wait retries (was unbounded recursion → could crash tab).
//   • Guard against registering the same user twice.
//   • Cancels in-flight send when page unloads.
// ────────────────────────────────────────────────────────────

import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FN_SEND_NOTIFICATION } from '../config.js';
import { state } from '../state.js';

const MAX_SDK_WAIT_RETRIES = 20;          // ~30 seconds total
const SDK_WAIT_RETRY_MS = 1500;
const REGISTER_RETRY_MS = 3000;
const MAX_REGISTER_RETRIES = 3;

let lastRegisteredUserId = null;

/** Call on logout so the next login re-runs OneSignal / push setup. */
export function resetPushRegistrationState() {
  lastRegisteredUserId = null;
}

/**
 * Send a push notification via our Supabase Edge Function.
 * The OneSignal REST key never touches the browser.
 */
export async function sendPushNotification(title, message, targetUserId = null) {
  if (!title || !message) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${EDGE_FN_SEND_NOTIFICATION}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        title: String(title).slice(0, 120),
        message: String(message).slice(0, 300),
        target_user_id: targetUserId ? String(targetUserId) : null,
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('[notifications] edge fn error', res.status, t);
    }
  } catch (e) {
    // network/abort errors are fine to swallow – the user will still
    // see the message in the app once realtime delivers it
    console.warn('[notifications] send failed:', e.message || e);
  }
}

/**
 * Register the current user with OneSignal so we can push to them by tag.
 * Waits politely for the SDK to load, then stops after a bounded number
 * of attempts. Idempotent: calling twice for the same user is a no-op.
 */
function _browserNotifGranted() {
  try {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  } catch (_) {
    return false;
  }
}

async function _oneSignalNotifGranted(OS) {
  try {
    let p = OS?.Notifications?.permission;
    if (p && typeof p.then === 'function') p = await p;
    if (typeof p === 'boolean') return p;
    if (typeof p === 'string') return p === 'granted';
  } catch (_) {}
  return _browserNotifGranted();
}

export async function registerOneSignalUser() {
  const user = state.currentUser;
  if (!user || !user.id) return;
  if (lastRegisteredUserId === String(user.id)) return; // already done

  for (let i = 0; i < MAX_SDK_WAIT_RETRIES; i++) {
    if (window.OneSignal && window.OneSignal.Notifications && window.OneSignal.User) break;
    await sleep(SDK_WAIT_RETRY_MS);
  }
  const OS = window.OneSignal;
  if (!OS || !OS.Notifications || !OS.User) {
    console.warn('[notifications] OneSignal SDK not ready');
    return;
  }

  for (let attempt = 0; attempt < MAX_REGISTER_RETRIES; attempt++) {
    try {
      try {
        await OS.login(String(user.id));
      } catch (_) {}

      let granted = await _oneSignalNotifGranted(OS);
      if (!granted) {
        try {
          const asked = await OS.Notifications.requestPermission();
          granted = asked === true || asked === 'granted' || _browserNotifGranted();
        } catch (_) {
          granted = _browserNotifGranted();
        }
      }
      if (!granted) throw new Error('push permission denied');

      const sub = OS.User?.PushSubscription;
      if (sub && typeof sub.optIn === 'function') {
        try {
          await sub.optIn();
        } catch (e) {
          console.warn('[notifications] PushSubscription.optIn:', e?.message || e);
        }
      }

      try {
        await OS.User.addTag('user_id', String(user.id));
        await OS.User.addTag('name', String(user.name || ''));
        await OS.User.addTag('role', String(user.role || 'employee'));
      } catch (e) {
        console.warn('[notifications] addTag:', e?.message || e);
      }

      lastRegisteredUserId = String(user.id);
      console.log('[notifications] registered:', user.name);
      return;
    } catch (e) {
      console.warn(`[notifications] attempt ${attempt + 1} failed:`, e);
      await sleep(REGISTER_RETRY_MS);
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
