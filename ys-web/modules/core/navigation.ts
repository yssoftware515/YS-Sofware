import {
  LayoutDashboard, Package, FileText, Map, Megaphone,
  Briefcase, Image, Users, Settings, ScrollText,
  ToggleLeft, History, BookOpen, HelpCircle, Menu,
  Home, UserCog,
  Tags, Wrench, Mail, FolderKanban,
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
    id: 'content',
    labelEn: 'Content',
    labelAr: 'المحتوى',
    moduleId: 'core',
    order: 1,
    items: [
      { href: '/admin/products',     labelEn: 'Products',     labelAr: 'المنتجات',     icon: Package,    permission: 'manage_products',   moduleId: 'core' },
      { href: '/admin/services',     labelEn: 'Services',     labelAr: 'الخدمات',      icon: Wrench,     permission: 'manage_services',   moduleId: 'core' },
      { href: '/admin/contact-requests', labelEn: 'Inquiries', labelAr: 'الاستفسارات', icon: Mail,       permission: 'manage_contact_requests', moduleId: 'core' },
      { href: '/admin/docs',         labelEn: 'Documentation',labelAr: 'التوثيق',      icon: FileText,   permission: 'manage_documentation', moduleId: 'core' },
      { href: '/admin/static-pages', labelEn: 'Static Pages', labelAr: 'الصفحات الثابتة', icon: BookOpen, permission: 'manage_static_pages', moduleId: 'core' },
      { href: '/admin/faq',          labelEn: 'FAQ',          labelAr: 'الأسئلة الشائعة', icon: HelpCircle, permission: 'manage_faqs',    moduleId: 'core' },
      { href: '/admin/menus',        labelEn: 'Menus',        labelAr: 'القوائم',        icon: Menu,       permission: 'manage_menus',     moduleId: 'core' },
      { href: '/admin/homepage',     labelEn: 'Homepage',     labelAr: 'الصفحة الرئيسية', icon: Home,       permission: 'manage_homepage',  moduleId: 'core' },
{ href: '/admin/releases',     labelEn: 'Releases',     labelAr: 'الإصدارات',     icon: Tags,       permission: 'manage_products',  moduleId: 'core' },
      { href: '/admin/roadmap',      labelEn: 'Roadmap',      labelAr: 'خارطة الطريق',  icon: Map,        permission: 'manage_roadmap',   moduleId: 'core' },
      { href: '/admin/updates',      labelEn: 'Updates',      labelAr: 'المستجدات',     icon: Megaphone,  permission: 'manage_updates',   moduleId: 'core' },
      { href: '/admin/careers',      labelEn: 'Careers',      labelAr: 'الوظائف',       icon: Briefcase,  permission: 'manage_careers',   moduleId: 'core' },
      { href: '/admin/timeline',     labelEn: 'Timeline',     labelAr: 'الجدول الزمني',  icon: History,    permission: 'manage_timeline',  moduleId: 'core' },
    ],
  },
  {
    id: 'media',
    labelEn: 'Media',
    labelAr: 'الوسائط',
    moduleId: 'core',
    order: 2,
    items: [
      { href: '/admin/media', labelEn: 'Media Library', labelAr: 'مكتبة الوسائط', icon: Image, permission: 'manage_media', moduleId: 'core' },
    ],
  },
  {
    id: 'system',
    labelEn: 'System',
    labelAr: 'النظام',
    moduleId: 'core',
    order: 3,
    items: [
      { href: '/admin/users',         labelEn: 'Users',          labelAr: 'المستخدمون',       icon: Users,       permission: 'manage_users', moduleId: 'core' },
      { href: '/admin/roles',         labelEn: 'Roles & Permissions', labelAr: 'الأدوار والصلاحيات', icon: UserCog, permission: 'manage_users', moduleId: 'core' },
      { href: '/admin/settings',      labelEn: 'Settings',       labelAr: 'الإعدادات',        icon: Settings,    permission: 'manage_settings', moduleId: 'core' },
      { href: '/admin/feature-flags', labelEn: 'Feature Flags',  labelAr: 'مفاتيح الميزات',    icon: ToggleLeft, permission: 'manage_feature_flags',  moduleId: 'core' },
    ],
  },
  {
    id: 'security',
    labelEn: 'Security',
    labelAr: 'الأمان',
    moduleId: 'core',
    order: 4,
    items: [
      { href: '/admin/audit-logs',    labelEn: 'Audit Logs',    labelAr: 'سجلات التدقيق',  icon: ScrollText, permission: 'view_audit_logs', moduleId: 'core' },
    ],
  },
  {
    id: 'business',
    labelEn: 'Business',
    labelAr: 'الأعمال',
    moduleId: 'core',
    order: 5,
    items: [
      { href: '/admin/customers', labelEn: 'Customers', labelAr: 'العملاء', icon: Users, permission: 'view_customers', moduleId: 'core' },
      { href: '/admin/projects',  labelEn: 'Projects',  labelAr: 'المشاريع', icon: FolderKanban, permission: 'view_projects', moduleId: 'core' },
    ],
  },
  {
    id: 'billing',
    labelEn: 'Billing',
    labelAr: 'الفواتير والاشتراكات',
    moduleId: 'core',
    order: 6,
    items: [
      { href: '/admin/subscriptions', labelEn: 'Subscriptions', labelAr: 'الاشتراكات', icon: Briefcase, permission: 'manage_subscriptions', moduleId: 'core' },
    ],
  },
]
