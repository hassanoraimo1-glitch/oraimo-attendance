// ────────────────────────────────────────────────────────────
// APP CONFIG
// ────────────────────────────────────────────────────────────
// This file contains public configuration. The anon key is safe
// to expose in frontend code — Supabase Row Level Security is
// what protects the data (see /supabase/rls-policies.sql).
// OneSignal's SECRET REST API Key is NOT here — it lives only
// in the send-notification Edge Function's secrets.
// ────────────────────────────────────────────────────────────

export const SUPABASE_URL = 'https://lmszelfnosejdemxhodm.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_HCOQxXf5sEyulaPkqlSEzg_IK7elCQb';

export const ONESIGNAL_APP_ID = 'f3330b43-2859-4fe3-9236-0d9dd40fddb7';
export const EDGE_FN_SEND_NOTIFICATION = 'send-notification';

// Storage bucket names (create these in Supabase Storage)
export const STORAGE = {
  profiles: 'profiles',
  selfies: 'selfies',
  display: 'display-photos',
  visits: 'visit-photos',
};

// Feature flags
export const FEATURES = {
  realtimeChat: true,
  darkModeToggle: true,
  exportReports: true,
};

// Roles
export const ROLES = {
  SUPER_ADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEADER: 'team_leader',
  VIEWER: 'viewer',
  EMPLOYEE: 'employee',
};

export const ROLES_WITH_ADMIN_UI = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.TEAM_LEADER,
  ROLES.VIEWER,
];

// Days off mapping
export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
