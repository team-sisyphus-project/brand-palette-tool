import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './theme'

const STORAGE_KEY = 'color-palette-generator:theme'

/** Minimal mutable MediaQueryList stand-in so tests can fire 'change' events. */
function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mql = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: 'change', listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_: 'change', listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    },
  }
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return {
    fireChange: (nextMatches: boolean) => {
      matches = nextMatches
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent))
    },
  }
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to the OS dark preference when nothing is stored', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('defaults to the OS light preference when nothing is stored', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('prefers a persisted manual choice over the OS preference', () => {
    mockMatchMedia(true)
    window.localStorage.setItem(STORAGE_KEY, 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('toggling flips the theme, updates data-theme, and persists the choice', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('follows a live OS change while no manual choice has been made', () => {
    const media = mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())

    act(() => {
      media.fireChange(true)
    })

    expect(result.current.theme).toBe('dark')
  })

  it('ignores OS changes once a manual choice has been persisted', () => {
    const media = mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.theme).toBe('dark')

    act(() => {
      media.fireChange(false)
    })

    expect(result.current.theme).toBe('dark')
  })
})
