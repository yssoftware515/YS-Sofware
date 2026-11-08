import { cn } from '@/lib/utils/cn'

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
