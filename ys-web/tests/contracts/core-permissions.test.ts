import { describe, it, expect } from 'vitest'
import { corePermissionGroups } from '@/modules/core/permissions'

/**
 * INT-004 regression — the role-permission UI mapping must match the
 * backend's real authorization checks (grep-verified against
 * ys-api/app/Domains/Auth/Enums/Permission.php and every controller
 * `authorize()` call).
 *
 * Timeline is guarded by manage_timeline (TimelineController) and Feature
 * Flags by manage_feature_flags (FeatureFlagController) — never by
 * manage_settings, which only guards the settings resource. A role built
 * with the wrong mapping silently grants nothing.
 */
describe('corePermissionGroups mapping', () => {
  it('maps Timeline to manage_timeline, never manage_settings', () => {
    const group = corePermissionGroups.find(g => g.group === 'Timeline')
    expect(group?.permissions).toEqual(['manage_timeline'])
    expect(group?.permissions).not.toContain('manage_settings')
  })

  it('maps Feature Flags to manage_feature_flags, never manage_settings', () => {
    const group = corePermissionGroups.find(g => g.group === 'Feature Flags')
    expect(group?.permissions).toEqual(['manage_feature_flags'])
    expect(group?.permissions).not.toContain('manage_settings')
  })

  it('keeps Settings on manage_settings', () => {
    const group = corePermissionGroups.find(g => g.group === 'Settings')
    expect(group?.permissions).toContain('manage_settings')
  })

  it('every group has at least one real permission', () => {
    expect(corePermissionGroups.length).toBeGreaterThan(0)
    for (const g of corePermissionGroups) {
      expect(g.permissions.length).toBeGreaterThan(0)
    }
  })
})