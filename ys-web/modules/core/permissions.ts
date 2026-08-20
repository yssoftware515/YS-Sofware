export interface CorePermissionGroup {
  group: string
  permissions: string[]
}

/**
 * Every string below was verified against the backend's actual
 * `authorize()` calls (grep, not memory) — see Permission.php in ys-api
 * for the canonical enum this mirrors.
 *
 * INT-004: Timeline and Feature Flags map to their own dedicated backend
 * checks (`manage_timeline` in TimelineController, `manage_feature_flags`
 * in FeatureFlagController) — they must never be folded into
 * `manage_settings`, which only guards the settings resource itself.
 * Keep this file in sync with Permission.php whenever either one changes.
 */
export const corePermissionGroups: CorePermissionGroup[] = [
  { group: 'Products',          permissions: ['manage_products'] },
  { group: 'Services',          permissions: ['manage_services', 'view_services'] },
  { group: 'Releases',          permissions: ['manage_products'] },
  { group: 'Documentation',     permissions: ['manage_documentation'] },
  { group: 'Static Pages',      permissions: ['manage_static_pages'] },
  { group: 'FAQ',               permissions: ['manage_faqs'] },
  { group: 'Menus',             permissions: ['manage_menus'] },
  { group: 'Homepage',          permissions: ['manage_homepage'] },
  { group: 'Careers',           permissions: ['manage_careers'] },
  { group: 'Roadmap',           permissions: ['manage_roadmap'] },
  { group: 'Updates',           permissions: ['manage_updates'] },
  { group: 'Timeline',          permissions: ['manage_timeline'] },
  { group: 'Feature Flags',     permissions: ['manage_feature_flags'] },
  { group: 'Media',             permissions: ['manage_media'] },
  { group: 'Contact Requests',  permissions: ['manage_contact_requests'] },
  { group: 'Customers',         permissions: ['view_customers', 'manage_customers'] },
  { group: 'Projects',          permissions: ['view_projects', 'manage_projects'] },
  { group: 'Settings',          permissions: ['manage_settings'] },
  { group: 'Audit Logs',        permissions: ['view_audit_logs'] },
  { group: 'Users & Admins',    permissions: ['manage_users', 'manage_admins'] },
  { group: 'Subscriptions & Billing', permissions: ['manage_subscriptions', 'view_financials'] },
]
