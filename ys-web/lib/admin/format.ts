/**
 * Shared formatting helpers for admin screens.
 *
 * Money values arrive from the API as decimal strings (never floats) —
 * formatting converts the string to a display number, but no arithmetics
 * happen on the client for money the backend already summed.
 */

export function formatMoney(
  value: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '—'
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return String(value)
  const code = (currency ?? 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: code }).format(num)
  } catch {
    // Unknown currency code — fall back to a readable pair.
    return `${code} ${num.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return isNaN(date.getTime()) ? value : date.toLocaleString()
}