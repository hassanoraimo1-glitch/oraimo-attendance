// ────────────────────────────────────────────────────────────
// THEME UTIL  (v3) — smooth transition between modes
// ────────────────────────────────────────────────────────────

import { state } from '../state.js';

const DARK = {
  '--black': '#060608',
  '--dark': '#0e0e12',
  '--card': '#14171d',
  '--card2': '#1b1f27',
  '--border': '#2a3040',
  '--border-g': 'rgba(0,200,83,.24)',
  '--text': '#f0f0f5',
  '--text2': '#a7b0c2',
  '--muted': '#7f8aa1',
};

const LIGHT = {
  '--black': '#eef2f8',
  '--dark': '#f8fbff',
  '--card': '#ffffff',
  '--card2': '#f3f6fc',
  '--border': '#dce3ef',
  '--border-g': 'rgba(0,168,67,.28)',
  '--text': '#101114',
  '--text2': '#4f5b70',
  '--muted': '#6b7382',
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
