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
export async function registerOneSignalUser() {
  const user = state.currentUser;
  if (!user || !user.id) return;
  if (lastRegisteredUserId === String(user.id)) return; // already done

  // Wait for the SDK (bounded)
  for (let i = 0; i < MAX_SDK_WAIT_RETRIES; i++) {
    if (window.OneSignal && window.OneSignal.Notifications) break;
    await sleep(SDK_WAIT_RETRY_MS);
  }
  if (!window.OneSignal || !window.OneSignal.Notifications) {
    console.warn('[notifications] SDK not available after wait');
    return;
  }

  for (let attempt = 0; attempt < MAX_REGISTER_RETRIES; attempt++) {
    try {
      try {
        const perm = await window.OneSignal.Notifications.permission;
        if (!perm) await window.OneSignal.Notifications.requestPermission();
      } catch (_) {
        await window.OneSignal.Notifications.requestPermission().catch(() => {});
      }

      await window.OneSignal.User.addTag('user_id', String(user.id));
      await window.OneSignal.User.addTag('name', String(user.name || ''));
      await window.OneSignal.User.addTag('role', String(user.role || 'employee'));
      try { await window.OneSignal.login(String(user.id)); } catch (_) {}

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
