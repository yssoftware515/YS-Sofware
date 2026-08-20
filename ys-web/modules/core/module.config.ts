import type { ModuleManifest } from '@/lib/platform/contracts/ModuleManifest'

export const manifest: ModuleManifest = {
  id: 'core',
  name: { en: 'Platform Core', ar: 'نظام المنصة الأساسي' },
  description: {
    en: 'Core platform features: CMS, users, settings, media, security, and dashboard',
    ar: 'ميزات المنصة الأساسية: نظام إدارة المحتوى والمستخدمين والإعدادات والوسائط والأمان ولوحة التحكم',
  },
  version: '1.0.0',
  slug: 'core',
  enabled: true,
  order: 0,
}
