// ────────────────────────────────────────────────────────────
// AUTH SERVICE  (v3 — secure)
// ────────────────────────────────────────────────────────────
import { db, safeFilterValue, clearAllCache, teardownRealtime } from './supabase.js';
import { state, persistUser } from '../state.js';
import { ROLES } from '../config.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const THROTTLE = { attempts: 0, lockedUntil: 0, windowStart: 0 };
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const LOCKOUT_MS = 30_000;

function timingSafeEqual(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const len = Math.max(sa.length, sb.length, 1);
  let diff = sa.length ^ sb.length;
  for (let i = 0; i < len; i++) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function checkThrottle() {
  const now = Date.now();
  if (now < THROTTLE.lockedUntil) {
    const err = new Error('RATE_LIMITED');
    err.retryAfterSec = Math.ceil((THROTTLE.lockedUntil - now) / 1000);
    throw err;
  }
  if (now - THROTTLE.windowStart > WINDOW_MS) {
    THROTTLE.windowStart = now;
    THROTTLE.attempts = 0;
  }
}

function recordFailure() {
  THROTTLE.attempts++;
  if (THROTTLE.attempts >= MAX_ATTEMPTS) {
    THROTTLE.lockedUntil = Date.now() + LOCKOUT_MS;
  }
}

function resetThrottle() {
  THROTTLE.attempts = 0;
  THROTTLE.lockedUntil = 0;
  THROTTLE.windowStart = 0;
}

function stripSecrets(user) {
  const copy = { ...user };
  delete copy.password;
  delete copy.password_hash;
  return copy;
}

export async function login(username, password) {
  if (!username || !password) throw new Error('MISSING_CREDENTIALS');
  checkThrottle();

  // ── Super admin check via Edge Function (no credentials in frontend)
  let superUser = null;
  try {
    const _res = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    if (_res && _res.ok) superUser = await _res.json();
  } catch (_) {}

  if (superUser && superUser.role === 'superadmin') {
    persistUser(superUser);
    resetThrottle();
    return superUser;
  }

  // ── DB lookup for admins + employees
  let adminRows = [], empRows = [];
  try {
    const uname = safeFilterValue(username);
    [adminRows, empRows] = await Promise.all([
      db.get('admins',    `?username=eq.${uname}&select=*`).catch(() => []),
      db.get('employees', `?username=eq.${uname}&select=*`).catch(() => []),
    ]);
  } catch (e) {
    recordFailure();
    throw e;
  }

  const adminMatch = (adminRows || []).find(r => timingSafeEqual(r.password || '', password));
  if (adminMatch) {
    const user = stripSecrets({ ...adminMatch, role: adminMatch.role || ROLES.ADMIN });
    persistUser(user);
    resetThrottle();
    return user;
  }

  const empMatch = (empRows || []).find(r => timingSafeEqual(r.password || '', password));
  if (empMatch) {
    const user = stripSecrets({ ...empMatch, role: empMatch.role || ROLES.EMPLOYEE });
    persistUser(user);
    resetThrottle();
    return user;
  }

  recordFailure();
  throw new Error('INVALID_CREDENTIALS');
}

export function logout() {
  persistUser(null);
  state.allEmployees = [];
  state.branches = [];
  state.admins = [];
  state.currentChat = null;
  if (state.chatRealtimeChannel) {
    const ch = state.chatRealtimeChannel;
    if (ch.type === 'realtime' && ch.channel) {
      try { ch.channel.unsubscribe(); } catch (_) {}
    } else if (ch.type === 'polling' && ch.handle) {
      try { clearInterval(ch.handle); } catch (_) {}
    }
    state.chatRealtimeChannel = null;
  }
  teardownRealtime();
  clearAllCache();
}
