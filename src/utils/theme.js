// ────────────────────────────────────────────────────────────
// THEME UTIL  (v3) — smooth transition between modes
// ────────────────────────────────────────────────────────────

import { state } from '../state.js';

const DARK = {
  '--black': '#060608',
  '--dark': '#0e0e12',
  '--card': '#141418',
  '--card2': '#1c1c22',
  '--border': '#252530',
  '--text': '#f0f0f5',
  '--muted': '#666',
};

const LIGHT = {
  '--black': '#f6f7fb',
  '--dark': '#ffffff',
  '--card': '#ffffff',
  '--card2': '#f0f2f7',
  '--border': '#e4e7ee',
  '--text': '#101114',
  '--muted': '#6b7280',
};

const TRANSITION_MS = 220;

export function applyTheme() {
  const root = document.documentElement;
  const palette = state.darkMode ? DARK : LIGHT;
  for (const [k, v] of Object.entries(palette)) root.style.setProperty(k, v);
  document.body.dataset.theme = state.darkMode ? 'dark' : 'light';
}

export function toggleTheme() {
  // Short global transition for color-ish properties only.
  const root = document.documentElement;
  const prev = root.style.transition;
  root.style.transition = `background-color ${TRANSITION_MS}ms ease, color ${TRANSITION_MS}ms ease`;
  state.darkMode = !state.darkMode;
  localStorage.setItem('oraimo_theme', state.darkMode ? 'dark' : 'light');
  applyTheme();
  setTimeout(() => { root.style.transition = prev; }, TRANSITION_MS + 40);
}
