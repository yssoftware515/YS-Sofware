import {
  Box, Activity, HeartPulse, TrendingUp, Shield, Zap, Globe, Layers,
  Database, Cloud, Cpu, Lock, CreditCard, BarChart, Users, Briefcase,
  Rocket, Settings, Code, Smartphone, Monitor, Server, Wallet, Calendar,
  type LucideIcon,
} from 'lucide-react'

/**
 * PRODUCT_ICONS — maps a product's `icon_key` (set from the admin panel,
 * validated server-side against a closed list) to the actual icon
 * component rendered on its card.
 *
 * KEEP THIS IN SYNC WITH THE BACKEND:
 * Every key here must exactly match a case in
 * `app/Domains/Product/Enums/ProductIcon.php` (ys-api repo). Adding a new
 * icon *option* to the platform means adding it in both places, once —
 * that's the only code change "add a new product" should ever require;
 * everything else is admin-panel-only from here on.
 */
export const PRODUCT_ICONS: Record<string, LucideIcon> = {
  'box':          Box,
  'activity':     Activity,
  'heart-pulse':  HeartPulse,
  'trending-up':  TrendingUp,
  'shield':       Shield,
  'zap':          Zap,
  'globe':        Globe,
  'layers':       Layers,
  'database':     Database,
  'cloud':        Cloud,
  'cpu':          Cpu,
  'lock':         Lock,
  'credit-card':  CreditCard,
  'bar-chart':    BarChart,
  'users':        Users,
  'briefcase':    Briefcase,
  'rocket':       Rocket,
  'settings':     Settings,
  'code':         Code,
  'smartphone':   Smartphone,
  'monitor':      Monitor,
  'server':       Server,
  'wallet':       Wallet,
  'calendar':     Calendar,
}

/**
 * Looks up a product's icon component. Returns null (not a fallback icon)
 * when icon_key is missing/unrecognized — callers decide how to degrade
 * (e.g. the generic initials box), rather than this silently picking an
 * arbitrary default that has nothing to do with the product.
 */
export function getProductIcon(iconKey: string | null | undefined): LucideIcon | null {
  if (!iconKey) return null
  return PRODUCT_ICONS[iconKey] ?? null
}
