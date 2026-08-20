import { describe, it, expect } from 'vitest'
import {
  searchReducer,
  initialSearchState,
  shouldFetchQuery,
  buildSearchUrl,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_QUERY_LENGTH,
  type SearchState,
} from '@/lib/search/state'
import type { SearchResult } from '@/types'

/**
 * INT-005 regression — the header search state machine.
 *
 * The backend /public/search endpoint rejects q shorter than 2 chars and
 * is rate-limited (throttle:search), so the modal must never fire
 * requests for empty/short/duplicate queries and must debounce typing.
 * These tests pin the rules the modal runs on.
 */

const result = (n: number): SearchResult => ({
  type: 'product',
  id: `p-${n}`,
  title: `Result ${n}`,
  excerpt: null,
  url: `/en/products/r${n}`,
  rank: n,
  meta: {},
})

describe('shouldFetchQuery', () => {
  it('never fetches an empty or whitespace query', () => {
    expect(shouldFetchQuery('', '')).toBe(false)
    expect(shouldFetchQuery('', '   ')).toBe(false)
  })

  it('never fetches queries shorter than the backend minimum of 2 chars', () => {
    expect(shouldFetchQuery('', 'a')).toBe(false)
    expect(shouldFetchQuery('a', 'b')).toBe(false)
  })

  it('fetches a real query', () => {
    expect(shouldFetchQuery('', 'erp')).toBe(true)
  })

  it('does not refetch an identical query', () => {
    expect(shouldFetchQuery('erp', 'erp')).toBe(false)
    expect(shouldFetchQuery('erp', ' erp ')).toBe(false)
  })

  it('refetches when the query actually changes', () => {
    expect(shouldFetchQuery('erp', 'erp 2')).toBe(true)
  })
})

describe('searchReducer lifecycle', () => {
  const base = initialSearchState<SearchResult>()

  it('QUERY_CHANGED clears the active selection', () => {
    const withResults: SearchState<SearchResult> = {
      ...base,
      phase: 'results',
      results: [result(1), result(2)],
      activeIndex: 1,
    }
    const next = searchReducer(withResults, { type: 'QUERY_CHANGED', query: 'erp' })
    expect(next.activeIndex).toBe(-1)
    expect(next.query).toBe('erp')
  })

  it('results → results phase when non-empty, empty phase when none', () => {
    const loaded = searchReducer(base, { type: 'FETCH_STARTED' })
    expect(loaded.phase).toBe('loading')

    const withResults = searchReducer(loaded, { type: 'RESULTS_RECEIVED', results: [result(1)] })
    expect(withResults.phase).toBe('results')
    expect(withResults.activeIndex).toBe(0)

    const empty = searchReducer(loaded, { type: 'RESULTS_RECEIVED', results: [] })
    expect(empty.phase).toBe('empty')
    expect(empty.activeIndex).toBe(-1)
  })

  it('failure enters error phase and clears results', () => {
    const withResults: SearchState<SearchResult> = {
      ...base,
      phase: 'results',
      results: [result(1)],
      activeIndex: 0,
    }
    const failed = searchReducer(withResults, { type: 'FETCH_FAILED', error: 'boom' })
    expect(failed.phase).toBe('error')
    expect(failed.error).toBe('boom')
    expect(failed.results).toHaveLength(0)
  })

  it('ARROW moves within bounds', () => {
    let s: SearchState<SearchResult> = {
      ...base,
      phase: 'results',
      results: [result(1), result(2), result(3)],
      activeIndex: 0,
    }
    s = searchReducer(s, { type: 'ARROW', direction: 1 })
    expect(s.activeIndex).toBe(1)
    s = searchReducer(s, { type: 'ARROW', direction: 1 })
    expect(s.activeIndex).toBe(2)
    s = searchReducer(s, { type: 'ARROW', direction: 1 })
    expect(s.activeIndex).toBe(2)
    s = searchReducer(s, { type: 'ARROW', direction: -1 })
    s = searchReducer(s, { type: 'ARROW', direction: -1 })
    s = searchReducer(s, { type: 'ARROW', direction: -1 })
    expect(s.activeIndex).toBe(0)
  })

  it('ARROW is a no-op without results', () => {
    const s = searchReducer(base, { type: 'ARROW', direction: 1 })
    expect(s.activeIndex).toBe(-1)
  })

  it('RESET returns to idle', () => {
    const s: SearchState<SearchResult> = {
      ...base,
      phase: 'results',
      results: [result(1)],
      activeIndex: 0,
      query: 'erp',
    }
    expect(searchReducer(s, { type: 'RESET' })).toEqual(initialSearchState())
  })
})

describe('search contract constants', () => {
  it('debounce and minimum lengths match the client policy', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300)
    expect(SEARCH_MIN_QUERY_LENGTH).toBe(2)
  })

  it('builds the same URL the client hits', () => {
    expect(buildSearchUrl('erp', 'en')).toBe('/public/search?q=erp&locale=en&limit=10')
    const ar = buildSearchUrl('نظام', 'ar', 5)
    expect(ar.startsWith('/public/search?q=')).toBe(true)
    expect(decodeURIComponent(ar)).toBe('/public/search?q=نظام&locale=ar&limit=5')
  })
})