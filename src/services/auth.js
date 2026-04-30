// ────────────────────────────────────────────────────────────
// AUTH SERVICE  (v3)
// ────────────────────────────────────────────────────────────

import { db, safeFilterValue, clearAllCache, teardownRealtime } from './supabase.js';
import { state, persistUser } from '../state.js';
import { ROLES } from '../config.js';

const SUPER_USERNAME = 'admin';
const SUPER_PASSWORD = 'Oraimo@Admin2026';

// Client-side throttle
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

function normalizeRole(role, fallback = '') {
  const r = String(role || fallback || '').trim().toLowerCase();

  if (r === 'superadmin') return 'super_admin';
  if (r === 'super_admin') return 'super_admin';
  if (r === 'teamleader') return 'team_leader';
  if (r === 'team_leader') return 'team_leader';
  if (r === 'manager') return 'admin';

  return r;
}

/**
 * Authenticate a user.
 */
export async function login(username, password) {
  if (!username || !password) throw new Error('MISSING_CREDENTIALS');

  checkThrottle();

  let adminRows = [];
  let empRows = [];

  try {
    const uname = safeFilterValue(username);

    [adminRows, empRows] = await Promise.all([
      db.get('admins', `?username=eq.${uname}&select=*`).catch(() => []),
      db.get('employees', `?username=eq.${uname}&select=*`).catch(() => []),
    ]);
  } catch (e) {
    recordFailure();
    throw e;
  }

  const superMatch =
    timingSafeEqual(username, SUPER_USERNAME) &&
    timingSafeEqual(password, SUPER_PASSWORD);

  if (superMatch) {
    const user = {
      id: 'super_admin',
      username: SUPER_USERNAME,
      name: 'Super Admin',
      role: normalizeRole(ROLES.SUPER_ADMIN, 'super_admin'),
      branch: null
    };

    state.currentUser = user;
    persistUser(user);
    resetThrottle();
    return user;
  }

  const adminMatch = (adminRows || []).find(r =>
    timingSafeEqual(r.password || '', password)
  );

  if (adminMatch) {
    const user = stripSecrets({
      ...adminMatch,
      role: normalizeRole(adminMatch.role, ROLES.ADMIN)
    });

    state.currentUser = user;
    persistUser(user);
    resetThrottle();
    return user;
  }

  const empMatch = (empRows || []).find(r =>
    timingSafeEqual(r.password || '', password)
  );

  if (empMatch) {
    const user = stripSecrets({
      ...empMatch,
      role: normalizeRole(empMatch.role, ROLES.EMPLOYEE)
    });

    state.currentUser = user;
    persistUser(user);
    resetThrottle();
    return user;
  }

  recordFailure();
  throw new Error('INVALID_CREDENTIALS');
}

export function logout() {
  state.currentUser = null;
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
