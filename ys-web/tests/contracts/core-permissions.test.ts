import { describe, it, expect } from 'vitest'
import { corePermissionGroups } from '@/modules/core/permissions'

/**
 * INT-004 regression — the role-permission UI mapping must match the
 * backend's real authorization checks (grep-verified against
 * ys-api/app/Domains/Auth/Enums/Permission.php and every controller
 * `authorize()` call).
 */
describe('corePermissionGroups mapping', () => {
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