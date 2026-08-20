'use client'

interface StatusDotProps {
  status: 'active' | 'inactive' | 'warning' | 'error'
  size?: number
}

const statusColors: Record<string, string> = {
  active: '#10B981',
  inactive: '#9CA3AF',
  warning: '#F59E0B',
  error: '#EF4444',
}

export function StatusDot({ status, size = 8 }: StatusDotProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: statusColors[status] ?? statusColors.inactive,
        flexShrink: 0,
      }}
    />
  )
}
