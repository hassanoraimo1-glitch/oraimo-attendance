// ────────────────────────────────────────────────────────────
// LANGUAGE UTIL
// ────────────────────────────────────────────────────────────

import { state, setLang } from '../state.js';
import { $$ } from './dom.js';

export function applyLang() {
  const isAr = state.currentLang === 'ar';
  document.documentElement.lang = state.currentLang;
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  document.body.style.direction = isAr ? 'rtl' : 'ltr';

  $$('[data-ar],[data-en]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = isAr ? (el.dataset.arPh || el.placeholder) : (el.dataset.enPh || el.placeholder);
    } else {
      const ar = el.dataset.ar;
      const en = el.dataset.en;
      if (ar && en) el.textContent = isAr ? ar : en;
    }
  });

  ['lang-toggle-label', 'lang-label-emp', 'lang-label-adm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = isAr ? 'EN' : 'ع';
  });

  const ant = document.getElementById('admin-name-top');
  if (ant && !ant.dataset.custom) ant.textContent = isAr ? 'لوحة الإدارة' : 'Dashboard';

  const ss = document.getElementById('splash-sub');
  if (ss) ss.textContent = isAr ? 'نظام الحضور والمبيعات' : 'Attendance & Sales System';

  // Bottom nav direction follows language
  fixNavDirection();
}

export function fixNavDirection() {
  const dir = state.currentLang === 'ar' ? 'rtl' : 'ltr';
  $$('.bottom-nav').forEach(nav => {
    nav.style.direction = dir;
    nav.style.flexDirection = 'row';
  });
}

export function toggleLang() {
  setLang(state.currentLang === 'ar' ? 'en' : 'ar');
  applyLang();
}
