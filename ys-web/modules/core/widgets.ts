import { ScrollText, Wrench, Mail, Users, FolderKanban } from 'lucide-react'
import type { WidgetDefinition } from '@/lib/platform/registries/WidgetRegistry'

export const coreWidgets: WidgetDefinition[] = [
  { id: 'services',      moduleId: 'core', title: 'Services',     icon: Wrench,       permission: 'manage_services',          order: 0, value: 0, color: '#0EA5E9' },
  { id: 'inquiries',     moduleId: 'core', title: 'Inquiries',    icon: Mail,         permission: 'manage_contact_requests',  order: 1, value: 0, color: '#EC4899' },
  { id: 'customers',     moduleId: 'core', title: 'Customers',    icon: Users,        permission: 'view_customers',           order: 2, value: 0, color: '#14B8A6' },
  { id: 'projects',      moduleId: 'core', title: 'Projects',     icon: FolderKanban, permission: 'view_projects',            order: 3, value: 0, color: '#6366F1' },
  { id: 'audit-logs',    moduleId: 'core', title: 'Audit Logs',   icon: ScrollText,   permission: 'view_audit_logs',          order: 4, value: 0, color: '#8B5CF6' },
]
