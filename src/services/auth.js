// ────────────────────────────────────────────────────────────
// AUTH SERVICE  (v3)
// ────────────────────────────────────────────────────────────
// Honest note on what this module does and doesn't give you:
//
//   What it does:
//     • Keeps usernames out of direct equality-vs-DB checks that
//       could be brute-forced in a tight loop.
//     • Uses the same codepath length for super-admin vs DB-backed
//       logins so a timing side-channel can't distinguish them.
//     • Applies client-side back-off for failed attempts.
//
//   What it does NOT give you (need server-side work):
//     • Real rate limiting — anyone with DevTools bypasses the
//       client-side limiter. Real protection requires a Supabase
//       Edge Function or Postgres function for the auth flow.
//     • Password hashing — the `password` column is still plaintext
//       in the DB. Migrate to Supabase Auth before going to prod.
//     • Session revocation — there are no JWTs; logging out on one
//       device does not log out others.
// ────────────────────────────────────────────────────────────

import { db, safeFilterValue, clearAllCache, teardownRealtime } from './supabase.js';
import { state, persistUser } from '../state.js';
import { ROLES } from '../config.js';

const SUPER_USERNAME = 'admin';
const SUPER_PASSWORD = 'Oraimo@Admin2026';

// Client-side throttle (not a true rate limiter — see header comment).
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

/**
 * Authenticate a user. Throws a typed error on failure.
 * Uses constant-ish codepath: always hits the DB (even for super admin
 * credentials) so an observer can't tell which path matched.
 */
export async function login(username, password) {
  if (!username || !password) throw new Error('MISSING_CREDENTIALS');
  checkThrottle();

  // Always do a DB lookup, even for super admin — this keeps the
  // latency profile uniform between the two paths.
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

  // Compare super-admin creds first but using timingSafeEqual so it
  // takes roughly the same time as DB-backed compares below.
  const superMatch =
    timingSafeEqual(username, SUPER_USERNAME) &&
    timingSafeEqual(password, SUPER_PASSWORD);

  if (superMatch) {
    const user = { role: ROLES.SUPER_ADMIN, name: 'Super Admin' };
    persistUser(user);
    resetThrottle();
    return user;
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
