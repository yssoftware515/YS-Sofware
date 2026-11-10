import {
  LayoutDashboard,
  Users, Settings, ScrollText,
  UserCog,
  Wrench, Mail, FolderKanban,
} from 'lucide-react'
import type { NavGroup } from '@/lib/platform/registries/NavigationRegistry'

export const coreNavGroups: NavGroup[] = [
  {
    id: 'overview',
    labelEn: 'Overview',
    labelAr: 'نظرة عامة',
    moduleId: 'core',
    order: 0,
    items: [
      { href: '/admin/dashboard', labelEn: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard, moduleId: 'core' },
    ],
  },
  {
    id: 'products-services',
    labelEn: 'Services & Content',
    labelAr: 'الخدمات والمحتوى',
    moduleId: 'core',
    order: 1,
    items: [
      { href: '/admin/services',  labelEn: 'Services',  labelAr: 'الخدمات',   icon: Wrench,    permission: 'manage_services',  moduleId: 'core' },
    ],
  },
  {
    id: 'engagement',
    labelEn: 'Engagement',
    labelAr: 'التفاعل',
    moduleId: 'core',
    order: 3,
    items: [
      { href: '/admin/contact-requests', labelEn: 'Inquiries', labelAr: 'الاستفسارات', icon: Mail, permission: 'manage_contact_requests', moduleId: 'core' },
    ],
  },
  {
    id: 'system',
    labelEn: 'System',
    labelAr: 'النظام',
    moduleId: 'core',
    order: 5,
    items: [
      { href: '/admin/users',         labelEn: 'Users',          labelAr: 'المستخدمون',       icon: Users,       permission: 'manage_users', moduleId: 'core' },
      { href: '/admin/roles',         labelEn: 'Roles & Permissions', labelAr: 'الأدوار والصلاحيات', icon: UserCog, permission: 'manage_users', moduleId: 'core' },
      { href: '/admin/settings',      labelEn: 'Settings',       labelAr: 'الإعدادات',        icon: Settings,    permission: 'manage_settings', moduleId: 'core' },
    ],
  },
  {
    id: 'security',
    labelEn: 'Security',
    labelAr: 'الأمان',
    moduleId: 'core',
    order: 6,
    items: [
      { href: '/admin/audit-logs',    labelEn: 'Audit Logs',    labelAr: 'سجلات التدقيق',  icon: ScrollText, permission: 'view_audit_logs', moduleId: 'core' },
    ],
  },
  {
    id: 'business',
    labelEn: 'Business',
    labelAr: 'الأعمال',
    moduleId: 'core',
    order: 7,
    items: [
      { href: '/admin/customers', labelEn: 'Customers', labelAr: 'العملاء', icon: Users, permission: 'view_customers', moduleId: 'core' },
      { href: '/admin/projects',  labelEn: 'Projects',  labelAr: 'المشاريع', icon: FolderKanban, permission: 'view_projects', moduleId: 'core' },
    ],
  },
]
