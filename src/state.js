// ────────────────────────────────────────────────────────────
// APPLICATION STATE
// ────────────────────────────────────────────────────────────
// Centralised reactive state. Modules import and mutate from
// here so we don't pollute window globals.
// ────────────────────────────────────────────────────────────

export const state = {
  currentUser: null,
  currentLang: localStorage.getItem('oraimo_lang') || 'ar',
  darkMode: localStorage.getItem('oraimo_theme') !== 'light',

  // Caches
  allEmployees: [],
  branches: [],
  admins: [],

  // Chat
  currentChat: null,
  chatRealtimeChannel: null,
};

export function persistUser(user) {
  state.currentUser = user;
  if (user) localStorage.setItem('oraimo_user', JSON.stringify(user));
  else localStorage.removeItem('oraimo_user');
}

export function loadUserFromStorage() {
  try {
    const raw = localStorage.getItem('oraimo_user');
    if (raw) state.currentUser = JSON.parse(raw);
  } catch (e) {
    state.currentUser = null;
  }
  return state.currentUser;
}

export function setLang(lang) {
  state.currentLang = lang;
  localStorage.setItem('oraimo_lang', lang);
}
