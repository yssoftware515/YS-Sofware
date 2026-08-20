import { describe, it, expect } from 'vitest'
import { buildMenuSavePlan, flattenMenuItems, type MenuItemDraft } from '@/lib/admin/menuItems'

/**
 * INT-001 regression — the Admin Menu contract.
 *
 * The backend models menus and menu items as SEPARATE resources:
 *   - POST/PUT  /admin/menus        accepts { name, location } — a single
 *     `name` field, NOT localized name_en/name_ar,
 *   - POST/PUT/DELETE /admin/menu-items manage the items themselves.
 * The admin endpoints return raw models with a nested `rootItems` shape
 * (id, title_en/title_ar, url, icon, target, parent_id, sort_order,
 * is_active, children). These tests pin the save-plan logic the form is
 * built on so the contract can never drift silently again.
 */

const baseItem: MenuItemDraft = {
  title_en: 'Products',
  title_ar: 'المنتجات',
  url: '/products',
  icon: '',
  target: '_self',
  parent_id: null,
  sort_order: 0,
  is_active: true,
}

describe('buildMenuSavePlan', () => {
  it('create mode: every item becomes a create op bound to the menu id', () => {
    const plan = buildMenuSavePlan(undefined, 'Header', 'header', [baseItem], [])

    expect(plan.menu).toEqual({ name: 'Header', location: 'header' })
    expect(plan.creates).toHaveLength(1)
    expect(plan.creates[0]).toEqual({ ...baseItem, menu_id: '' })
    expect(plan.updates).toHaveLength(0)
    expect(plan.deletes).toHaveLength(0)
  })

  it('edit mode: kept items update, new items create, removed items delete', () => {
    const prev = [
      { ...baseItem, id: 'm1', title_en: 'Products' },
      { ...baseItem, id: 'm2', title_en: 'About' },
    ]
    const now = [
      { ...baseItem, id: 'm1', title_en: 'Products v2', url: '/products-2' },
      { ...baseItem, id: 'm3', title_en: 'Contact' },
    ]

    const plan = buildMenuSavePlan('menu-1', 'Header', 'header', now, prev)

    expect(plan.creates).toHaveLength(1)
    expect(plan.creates[0].title_en).toBe('Contact')
    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0].id).toBe('m1')
    expect(plan.updates[0].item).toEqual({
      ...baseItem,
      id: 'm1',
      title_en: 'Products v2',
      url: '/products-2',
    })
    expect(plan.deletes).toEqual(['m2'])
  })

  it('edit mode: item without id but identical content is still a create (no positional guessing)', () => {
    const prev = [{ ...baseItem, id: 'm1' }]
    const now = [{ ...baseItem, title_en: 'Products' }]

    const plan = buildMenuSavePlan('menu-1', 'Header', 'header', now, prev)

    expect(plan.creates).toHaveLength(1)
    expect(plan.updates).toHaveLength(0)
    expect(plan.deletes).toEqual(['m1'])
  })

  it('empty items delete everything previously loaded', () => {
    const prev = [
      { ...baseItem, id: 'm1' },
      { ...baseItem, id: 'm2' },
    ]

    const plan = buildMenuSavePlan('menu-1', 'Header', 'header', [], prev)

    expect(plan.creates).toHaveLength(0)
    expect(plan.deletes).toEqual(['m1', 'm2'])
  })
})

describe('flattenMenuItems', () => {
  it('maps the backend rootItems+children shape into the flat form list', () => {
    const raw = [
      {
        ...baseItem,
        id: 'root-1',
        title_en: 'Products',
        children: [{ ...baseItem, id: 'child-1', title_en: 'ERP' }],
      },
    ]

    const flat = flattenMenuItems(raw as Array<MenuItemDraft & { children?: MenuItemDraft[] }>)

    expect(flat).toHaveLength(2)
    expect(flat[0].id).toBe('root-1')
    expect(flat[1].id).toBe('child-1')
    expect(flat[1].parent_id).toBe('root-1')
  })

  it('handles undefined payloads defensively', () => {
    expect(flattenMenuItems(undefined as unknown as any)).toEqual([])
  })
})