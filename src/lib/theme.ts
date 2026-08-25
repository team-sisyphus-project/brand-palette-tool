import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** localStorage key for the user's explicit manual theme choice. */
const STORAGE_KEY = 'color-palette-generator:theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

/** Reads the OS-level preference; used as the default before any manual override. */
function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Reads the persisted manual choice, if the user has ever toggled. */
function getStoredTheme(): Theme | null {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : null
}

function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

export interface UseThemeResult {
  /** Currently resolved theme, already applied to `<html data-theme>`. */
  theme: Theme
  /** Flips the theme and persists the choice so it survives reload. */
  toggleTheme: () => void
}

/**
 * Theme state: defaults to the OS `prefers-color-scheme`, and — until the
 * user makes an explicit manual choice — keeps following live OS changes.
 * A manual toggle persists to localStorage and from then on wins over the
 * OS setting. Applies the resolved theme to `<html data-theme>` so
 * index.css's light/dark token variants (§3 of the design spec) take effect.
 */
export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Follow OS changes live, but only while no manual choice is persisted —
  // checked per-event (not just at mount) so a toggle made after this
  // listener attaches still wins over the next OS change.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      if (getStoredTheme() !== null) return
      setTheme(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
