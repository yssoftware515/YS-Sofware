import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  labelEn: string
  labelAr: string
  icon: LucideIcon
  permission?: string
  moduleId: string
}

export interface NavGroup {
  id: string
  labelEn: string
  labelAr: string
  moduleId: string
  order: number
  items: NavItem[]
}

export class NavigationRegistry {
  private groups: NavGroup[] = []

  registerGroup(group: NavGroup): void {
    const existing = this.groups.findIndex(g => g.id === group.id)
    if (existing >= 0) {
      this.groups[existing] = group
      return
    }
    this.groups.push(group)
    this.groups.sort((a, b) => a.order - b.order)
  }

  getGroups(): NavGroup[] {
    return [...this.groups]
  }

  getFilteredGroups(hasPermission: (perm: string) => boolean): NavGroup[] {
    return this.groups
      .map(group => ({
        ...group,
        items: group.items.filter(item => !item.permission || hasPermission(item.permission)),
      }))
      .filter(group => group.items.length > 0)
  }

  findItem(href: string): NavItem | undefined {
    for (const group of this.groups) {
      const found = group.items.find(item => item.href === href)
      if (found) return found
    }
    return undefined
  }

  findGroupLabel(href: string): { en: string; ar: string } | undefined {
    for (const group of this.groups) {
      if (group.items.some(item => item.href === href)) {
        return { en: group.labelEn, ar: group.labelAr }
      }
    }
    return undefined
  }

  clear(): void {
    this.groups = []
  }
}
