import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-background-subtle text-foreground border border-border hover:bg-background-muted hover:border-border-strong active:scale-[0.98]',
  ghost:     'text-foreground-muted hover:bg-background-subtle hover:text-foreground active:scale-[0.98]',
  danger:    'bg-error text-white hover:opacity-90 active:scale-[0.98]',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3.5 py-2 min-h-[44px]',
  md: 'text-sm px-5 py-2.5 min-h-[44px]',
  lg: 'text-base px-7 py-3.5 min-h-[52px]',
}

/**
 * Returns the same visual classes the <Button> element uses, for cases
 * where a non-<button> element (e.g. next/link's <Link>) needs to look
 * like a button. Keeps a single source of truth for button styling so
 * <Button> and <Link>-as-button never drift apart.
 */
export function buttonVariants(opts?: { variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  const { variant = 'primary', size = 'md', className } = opts ?? {}
  return cn(
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
    'transition-all duration-150 select-none cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    variants[variant],
    sizes[size],
    className,
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
