// ────────────────────────────────────────────────────────────
// FORMAT UTILS  (v3)
// ────────────────────────────────────────────────────────────
// Validates ISO strings so "Invalid Date" never leaks to the UI.
// ────────────────────────────────────────────────────────────

import { state } from '../state.js';

function safeDate(iso) {
  if (iso instanceof Date) return isNaN(iso.getTime()) ? null : iso;
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(d) {
  const safe = safeDate(d);
  return safe ? safe.toISOString().split('T')[0] : '';
}

export function todayStr() {
  return fmtDate(new Date());
}

export function fmtEGP(n) {
  const num = Number(n);
  if (!isFinite(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(Math.round(num));
}

export function getPayrollMonth(date = new Date()) {
  const ref = safeDate(date) || new Date();
  const d = ref.getDate();
  const m = ref.getMonth();
  const y = ref.getFullYear();
  let s, e;
  if (d >= 21) {
    s = new Date(y, m, 21);
    e = new Date(y, m + 1, 20);
  } else {
    s = new Date(y, m - 1, 21);
    e = new Date(y, m, 20);
  }
  const fmt = state.currentLang === 'ar' ? 'ar-EG' : 'en-US';
  return {
    start: fmtDate(s),
    end: fmtDate(e),
    label: `${s.toLocaleString(fmt, { month: 'long' })} 21 – ${e.toLocaleString(fmt, { month: 'long' })} 20`,
  };
}

export function fmtTime(iso) {
  const d = safeDate(iso);
  if (!d) return '';
  const loc = state.currentLang === 'ar' ? 'ar-EG' : 'en-US';
  return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
}

export function fmtRelativeDay(iso) {
  const d = safeDate(iso);
  if (!d) return '';
  const today = new Date();
  const diffDays = Math.floor((today - d) / 86_400_000);
  const ar = state.currentLang === 'ar';
  if (diffDays === 0) return ar ? 'اليوم' : 'Today';
  if (diffDays === 1) return ar ? 'أمس' : 'Yesterday';
  if (diffDays < 7) {
    const days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    return ar ? days[d.getDay()] : d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return d.toLocaleDateString(ar ? 'ar-EG' : 'en-US');
}
