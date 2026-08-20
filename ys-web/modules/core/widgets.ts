import { Package, TrendingUp, Briefcase, ScrollText, FileText, HelpCircle, Home, Menu, Wrench, Mail, Users, FolderKanban } from 'lucide-react'
import type { WidgetDefinition } from '@/lib/platform/registries/WidgetRegistry'

export const coreWidgets: WidgetDefinition[] = [
  { id: 'products',      moduleId: 'core', title: 'Products',     icon: Package,      permission: 'manage_products',          order: 0, value: 0, color: 'var(--color-accent)' },
  { id: 'releases',      moduleId: 'core', title: 'Releases',     icon: TrendingUp,   permission: 'manage_products',          order: 1, value: 0, color: '#10B981' },
  { id: 'services',      moduleId: 'core', title: 'Services',     icon: Wrench,       permission: 'manage_services',          order: 2, value: 0, color: '#0EA5E9' },
  { id: 'careers',       moduleId: 'core', title: 'Careers',      icon: Briefcase,    permission: 'manage_careers',           order: 3, value: 0, color: '#F59E0B' },
  { id: 'inquiries',     moduleId: 'core', title: 'Inquiries',    icon: Mail,         permission: 'manage_contact_requests',  order: 4, value: 0, color: '#EC4899' },
  { id: 'customers',     moduleId: 'core', title: 'Customers',    icon: Users,        permission: 'view_customers',           order: 5, value: 0, color: '#14B8A6' },
  { id: 'projects',      moduleId: 'core', title: 'Projects',     icon: FolderKanban, permission: 'view_projects',            order: 6, value: 0, color: '#6366F1' },
  { id: 'audit-logs',    moduleId: 'core', title: 'Audit Logs',   icon: ScrollText,   permission: 'view_audit_logs',          order: 7, value: 0, color: '#8B5CF6' },
  { id: 'static-pages',  moduleId: 'core', title: 'Static Pages', icon: FileText,     permission: 'manage_static_pages',      order: 8, value: 0, color: '#3B82F6' },
  { id: 'faq',           moduleId: 'core', title: 'FAQ',          icon: HelpCircle,   permission: 'manage_faqs',             order: 9, value: 0, color: '#EC4899' },
  { id: 'menus',         moduleId: 'core', title: 'Menus',        icon: Menu,         permission: 'manage_menus',            order: 10, value: 0, color: '#14B8A6' },
  { id: 'homepage',      moduleId: 'core', title: 'Homepage',     icon: Home,         permission: 'manage_homepage',         order: 11, value: 0, color: '#F97316' },
]