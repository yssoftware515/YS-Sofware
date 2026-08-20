/**
 * INT-005 — the header search state machine (pure, node-testable).
 *
 * The backend /public/search endpoint requires q min:2 chars and is rate
 * limited (throttle:search). This module owns the rules the SearchModal
 * runs on: debounce timing, when a fetch may fire, the lifecycle states,
 * and keyboard-selection math. All of it is pinned by contract tests.
 */

export const SEARCH_DEBOUNCE_MS = 300

export const SEARCH_MIN_QUERY_LENGTH = 2

export type SearchPhase = 'idle' | 'loading' | 'results' | 'empty' | 'error'

export interface SearchState<T> {
  phase: SearchPhase
  query: string
  results: T[]
  activeIndex: number
  error: string | null
}

export const initialSearchState = <T>(): SearchState<T> => ({
  phase: 'idle',
  query: '',
  results: [],
  activeIndex: -1,
  error: null,
})

export type SearchAction<T> =
  | { type: 'QUERY_CHANGED'; query: string }
  | { type: 'FETCH_STARTED' }
  | { type: 'RESULTS_RECEIVED'; results: T[] }
  | { type: 'FETCH_FAILED'; error: string }
  | { type: 'RESET' }
  | { type: 'ARROW'; direction: -1 | 1 }
  | { type: 'SET_ACTIVE'; index: number }

export function searchReducer<T>(
  state: SearchState<T>,
  action: SearchAction<T>,
): SearchState<T> {
  switch (action.type) {
    case 'QUERY_CHANGED':
      return { ...state, query: action.query, activeIndex: -1 }
    case 'FETCH_STARTED':
      return { ...state, phase: 'loading', error: null }
    case 'RESULTS_RECEIVED': {
      const results = action.results
      return {
        ...state,
        phase: results.length > 0 ? 'results' : 'empty',
        results,
        activeIndex: results.length > 0 ? 0 : -1,
      }
    }
    case 'FETCH_FAILED':
      return { ...state, phase: 'error', error: action.error, results: [], activeIndex: -1 }
    case 'RESET':
      return initialSearchState<T>()
    case 'ARROW': {
      if (state.results.length === 0) return state
      const next = state.activeIndex + action.direction
      return {
        ...state,
        activeIndex: Math.min(Math.max(next, 0), state.results.length - 1),
      }
    }
    case 'SET_ACTIVE': {
      if (action.index < 0 || action.index >= state.results.length) return state
      return { ...state, activeIndex: action.index }
    }
    default:
      return state
  }
}

/**
 * Whether a fetch may fire for a newly typed query.
 *
 * The backend rejects q shorter than 2 chars and rate-limits the endpoint
 * (throttle:search) — so empty and re-typed queries must never produce a
 * request.
 */
export function shouldFetchQuery(prevQuery: string, nextQuery: string): boolean {
  const next = nextQuery.trim()
  const prev = prevQuery.trim()
  if (next.length < SEARCH_MIN_QUERY_LENGTH) return false
  if (next === prev) return false
  return true
}

/**
 * Mirror of client.ts api.search() param building — pinned so the modal
 * and the client can never drift apart.
 */
export function buildSearchUrl(query: string, locale: string, limit = 10): string {
  const params = new URLSearchParams({ q: query, locale, limit: String(limit) })
  return `/public/search?${params.toString()}`
}