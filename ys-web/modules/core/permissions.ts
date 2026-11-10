export interface CorePermissionGroup {
  group: string
  permissions: string[]
}

/**
 * Every string below was verified against the backend's actual
 * `authorize()` calls (grep, not memory) — see Permission.php in ys-api
 * for the canonical enum this mirrors.
 *
 * Keep this file in sync with Permission.php whenever either one changes.
 */
export const corePermissionGroups: CorePermissionGroup[] = [
  { group: 'Services',          permissions: ['manage_services', 'view_services'] },
  { group: 'Contact Requests',  permissions: ['manage_contact_requests'] },
  { group: 'Customers',         permissions: ['view_customers', 'manage_customers'] },
  { group: 'Projects',          permissions: ['view_projects', 'manage_projects'] },
  { group: 'Settings',          permissions: ['manage_settings'] },
  { group: 'Audit Logs',        permissions: ['view_audit_logs'] },
  { group: 'Users & Admins',    permissions: ['manage_users', 'manage_admins'] },
  { group: 'Financials',        permissions: ['view_financials'] },
]
