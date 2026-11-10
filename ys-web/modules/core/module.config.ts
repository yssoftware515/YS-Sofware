import type { ModuleManifest } from '@/lib/platform/contracts/ModuleManifest'

export const manifest: ModuleManifest = {
  id: 'core',
  name: { en: 'Platform Core', ar: 'نظام المنصة الأساسي' },
  description: {
    en: 'Core platform features: services, users, settings, security, and dashboard',
    ar: 'ميزات المنصة الأساسية: الخدمات والمستخدمين والإعدادات والأمان ولوحة التحكم',
  },
  version: '1.0.0',
  slug: 'core',
  enabled: true,
  order: 0,
}
