// ─── App Config ──────────────────────────────────────────────
export const APP_NAME = 'Eventry'
export const APP_DESCRIPTION = 'Monitor. Alert. Autostart.'
export const APP_VERSION = '1.0.0'

// ─── Routes ──────────────────────────────────────────────────
export const ROUTES = {
  home: '/',
  login: '/auth/login',
  callback: '/auth/callback',
  dashboard: '/dashboard',
  keywords: '/dashboard/keywords',
  autostart: '/dashboard/autostart',
  notifications: '/dashboard/notifications',
  settings: '/dashboard/settings',
  admin: '/dashboard/admin',
  adminUsers: '/dashboard/admin/users',
  adminAdmins: '/dashboard/admin/admins',
  adminSettings: '/dashboard/admin/settings',
  adminImport: '/dashboard/admin/import',
} as const

// ─── Sidebar Navigation ─────────────────────────────────────
export const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: ROUTES.keywords, label: 'Keywords', icon: 'Tag' },
  { href: ROUTES.autostart, label: 'Autostart', icon: 'Zap' },
  { href: ROUTES.notifications, label: 'Notifications', icon: 'Bell' },
  { href: ROUTES.settings, label: 'Settings', icon: 'Settings2' },
] as const

// ─── Admin Navigation ────────────────────────────────────────
export const ADMIN_NAV_ITEM = {
  href: ROUTES.admin,
  label: 'Admin',
  icon: 'Shield',
} as const

export const ADMIN_NAV_ITEMS = [
  { href: ROUTES.admin, label: 'Overview', icon: 'BarChart3' },
  { href: ROUTES.adminUsers, label: 'Users', icon: 'Users' },
  { href: ROUTES.adminAdmins, label: 'Admins', icon: 'Crown' },
  { href: ROUTES.adminSettings, label: 'App Settings', icon: 'Wrench' },
  { href: ROUTES.adminImport, label: 'Import', icon: 'Upload' },
] as const
