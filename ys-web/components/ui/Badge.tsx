import { cn } from '@/lib/utils/cn'
import type { ProductStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline'
  className?: string
}

const variants = {
  default: 'bg-background-muted text-foreground-muted',
  accent:  'bg-accent-subtle text-accent',
  success: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  error:   'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  outline: 'border border-border text-foreground-muted',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}

const statusConfig: Record<ProductStatus, { label: string; variant: BadgeProps['variant']; dot: string }> = {
  active:   { label: 'Active',   variant: 'success', dot: 'bg-green-500' },
  beta:     { label: 'Beta',     variant: 'warning', dot: 'bg-amber-500' },
  planned:  { label: 'Planned',  variant: 'default', dot: 'bg-foreground-muted' },
  archived: { label: 'Archived', variant: 'outline', dot: 'bg-border-strong' },
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      {config.label}
    </Badge>
  )
}
