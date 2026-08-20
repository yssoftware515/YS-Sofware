import type { LucideIcon } from 'lucide-react'

export interface WidgetDefinition {
  id: string
  moduleId: string
  title: string
  /** Backend admin API resource path (e.g. 'products', 'faqs'). Defaults to `id` when omitted. */
  apiPath?: string
  permission?: string
  order: number
  icon: LucideIcon
  value: number | string
  color?: string
}

export class WidgetRegistry {
  private widgets: WidgetDefinition[] = []

  registerWidget(widget: WidgetDefinition): void {
    const existing = this.widgets.findIndex(w => w.id === widget.id)
    if (existing >= 0) {
      this.widgets[existing] = widget
      return
    }
    this.widgets.push(widget)
    this.widgets.sort((a, b) => a.order - b.order)
  }

  getWidgets(): WidgetDefinition[] {
    return [...this.widgets]
  }

  getFilteredWidgets(hasPermission: (perm: string) => boolean): WidgetDefinition[] {
    return this.widgets.filter(w => !w.permission || hasPermission(w.permission))
  }

  clear(): void {
    this.widgets = []
  }
}
