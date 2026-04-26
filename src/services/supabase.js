// ────────────────────────────────────────────────────────────
// SUPABASE SERVICE  (v3 — race-free cache + LRU)
// ✅ FIXED: PATCH يرجع return=representation + تقليل TTL للحضور
// ────────────────────────────────────────────────────────────

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;
const GET_CACHE_TTL_MS = 30_000;          // 30 sec default
const GET_CACHE_MAX_ENTRIES = 150;

// Tables that change frequently get a shorter TTL
const SHORT_TTL_TABLES = new Set(['attendance', 'sales', 'leave_requests', 'warnings']);
function _ttlForTable(table) {
  return SHORT_TTL_TABLES.has(table) ? 15_000 : GET_CACHE_TTL_MS;
}

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const inflight = new Map();

const getCache = new Map();

const tableGen = new Map();
function getGen(table) { return tableGen.get(table) || 0; }
function bumpGen(table) { tableGen.set(table, getGen(table) + 1); }

function lruSet(key, value) {
  if (getCache.has(key)) getCache.delete(key);
  getCache.set(key, value);
  while (getCache.size > GET_CACHE_MAX_ENTRIES) {
    const firstKey = getCache.keys().next().value;
    getCache.delete(firstKey);
  }
}

function lruGet(key) {
  const hit = getCache.get(key);
  if (!hit) return undefined;
  getCache.delete(key);
  getCache.set(key, hit);
  return hit;
}

export function safeFilterValue(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[\u0000-\u001f]/.test(s)) throw new Error('invalid filter value');
  return encodeURIComponent(s)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

async function requestOnce(method, table, query, body, signal) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query || ''}`;
  // ✅ FIX: POST و PATCH كلهم يرجعوا return=representation
  // بدون ده، PATCH بيرجع 204 No Content وده بيسبب مشاكل
  const needsRepresentation = (method === 'POST' || method === 'PATCH');
  const res = await fetch(url, {
    method,
    headers: {
      ...baseHeaders,
      Prefer: needsRepresentation ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`DB ${method} ${table} failed (${res.status})`);
    err.status = res.status;
    err.detail = text;
    throw err;
  }
  if (res.status === 204) return null;
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function request(method, table, query = '', body = null, opts = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES } = opts;
  const isGet = method === 'GET';
  const cacheKey = isGet ? `${method}|${table}|${query}` : null;

  if (cacheKey) {
    const hit = lruGet(cacheKey);
    if (hit && Date.now() - hit.t < _ttlForTable(table)) return hit.v;
    if (inflight.has(cacheKey)) return inflight.get(cacheKey);
  }

  const genAtStart = isGet ? getGen(table) : -1;

  const attempt = async () => {
    let lastErr;
    for (let i = 0; i <= retries; i++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const result = await requestOnce(method, table, query, body, ctrl.signal);
        clearTimeout(timer);
        return result;
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
        if (e.status && e.status >= 400 && e.status < 500) break;
        if (e.name === 'AbortError' && i >= retries) break;
        if (i < retries) {
          await new Promise(r => setTimeout(r, 250 * 2 ** i + Math.random() * 200));
        }
      }
    }
    throw lastErr;
  };

  const p = attempt();
  if (cacheKey) {
    inflight.set(cacheKey, p);
    p.then(v => {
       if (getGen(table) === genAtStart) lruSet(cacheKey, { v, t: Date.now() });
     })
     .catch(() => {})
     .finally(() => { inflight.delete(cacheKey); });
  }
  return p;
}

export function invalidateCache(table) {
  if (!table || typeof table !== 'string') return;
  bumpGen(table);
  for (const k of Array.from(getCache.keys())) {
    if (k.startsWith(`GET|${table}|`)) getCache.delete(k);
  }
  for (const k of Array.from(inflight.keys())) {
    if (k.startsWith(`GET|${table}|`)) inflight.delete(k);
  }
}

export function clearAllCache() {
  getCache.clear();
  inflight.clear();
  tableGen.clear();
}

export const db = {
  get: (table, query = '') => request('GET', table, query),
  post: async (table, body) => {
    // ✅ FIX: invalidate BEFORE the request too, not just after
    invalidateCache(table);
    const r = await request('POST', table, '', body);
    invalidateCache(table);
    return r;
  },
  patch: async (table, query, body) => {
    // ✅ FIX: invalidate BEFORE the request too
    invalidateCache(table);
    const r = await request('PATCH', table, query, body);
    invalidateCache(table);
    return r;
  },
  delete: async (table, query) => {
    invalidateCache(table);
    const r = await request('DELETE', table, query);
    invalidateCache(table);
    return r;
  },
};

// ────────────────────────────────────────────────────────────
// Realtime client (singleton + reconnect awareness)
// ────────────────────────────────────────────────────────────
let _realtimeClient = null;
let _realtimeLoading = null;

export async function getRealtimeClient() {
  if (_realtimeClient) return _realtimeClient;
  if (_realtimeLoading) return _realtimeLoading;
  _realtimeLoading = (async () => {
    const mod = await import('https://esm.sh/@supabase/supabase-js@2?bundle');
    _realtimeClient = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
    });
    return _realtimeClient;
  })();
  return _realtimeLoading;
}

export function teardownRealtime() {
  if (_realtimeClient) {
    try { _realtimeClient.removeAllChannels(); } catch (_) {}
  }
  _realtimeClient = null;
  _realtimeLoading = null;
}
