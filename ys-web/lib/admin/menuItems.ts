export interface MenuItemDraft {
  id?: string
  title_en: string
  title_ar: string
  url: string
  icon: string
  target: '_self' | '_blank'
  parent_id: string | null
  sort_order: number
  is_active: boolean
}

export interface MenuSavePlan {
  menu: { name: string; location: string }
  creates: Array<MenuItemDraft & { menu_id: string }>
  updates: Array<{ id: string; item: MenuItemDraft }>
  deletes: string[]
}

/**
 * Compute the menu item operations needed to persist the form's item list.
 *
 * The backend models menus and menu items as separate resources (POST/PUT/
 * DELETE /admin/menu-items), so a save is a multi-step lifecycle:
 *   1. upsert the menu itself ({ name, location } — the backend contract
 *      has a single `name`, not localized name fields),
 *   2. create new items (no id), update existing items (kept id),
 *      delete previously-loaded items that were removed from the form.
 *
 * `prevItems` must be the items that were loaded from the backend when the
 * form was opened, so removal is detected by id comparison, never by
 * positional guessing.
 */
export function buildMenuSavePlan(
  menuId: string | undefined,
  name: string,
  location: string,
  items: MenuItemDraft[],
  prevItems: MenuItemDraft[],
): MenuSavePlan {
  const prev = new Map(prevItems.filter(i => i.id).map(i => [i.id as string, i]))
  const kept = new Set<string>()

  const creates: MenuSavePlan['creates'] = []
  const updates: MenuSavePlan['updates'] = []

  for (const item of items) {
    if (item.id && prev.has(item.id)) {
      kept.add(item.id)
      updates.push({ id: item.id, item })
    } else {
      creates.push({ ...item, menu_id: menuId ?? '' })
    }
  }

  const deletes = [...prev.keys()].filter(id => !kept.has(id))

  return { menu: { name, location }, creates, updates, deletes }
}

/**
 * Flatten the backend's nested `rootItems` (+ `children`) payload into the
 * flat list the form edits. Child items keep their `parent_id`, so saving
 * preserves existing hierarchies even though the form has no parent picker.
 */
export function flattenMenuItems(rows: Array<MenuItemDraft & { children?: MenuItemDraft[] }>): MenuItemDraft[] {
  return (rows ?? []).flatMap(row => [
    row,
    ...(row.children ?? []).map(child => ({ ...child, parent_id: child.parent_id ?? row.id ?? null })),
  ])
}