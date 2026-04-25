// ────────────────────────────────────────────────────────────
// THEME — data-theme on <html> (full token system in main.css)
// ────────────────────────────────────────────────────────────

import { state } from '../state.js';

const THEME_KEY = 'oraimo_theme';

function _setMetaThemeColor(hex) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', hex);
}

function _syncDarkModeFromStorage() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light') state.darkMode = false;
    else if (v === 'dark') state.darkMode = true;
  } catch (_) {}
}

export function applyTheme() {
  _syncDarkModeFromStorage();
  const dark = state.darkMode;
  const mode = dark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', mode);
  if (document.body) document.body.setAttribute('data-theme', mode);
  _setMetaThemeColor(dark ? '#0b0d12' : '#eef2f9');
}

export function toggleTheme() {
  _syncDarkModeFromStorage();
  state.darkMode = !state.darkMode;
  try {
    localStorage.setItem(THEME_KEY, state.darkMode ? 'dark' : 'light');
  } catch (_) {}
  const root = document.documentElement;
  const prev = root.style.transition;
  root.style.transition = 'background-color .22s ease, color .22s ease';
  applyTheme();
  requestAnimationFrame(() => {
    setTimeout(() => { root.style.transition = prev; }, 260);
  });
}
