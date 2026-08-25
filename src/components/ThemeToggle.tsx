import type { Theme } from '../lib/theme'
import './ThemeToggle.css'

export interface ThemeToggleProps {
  /** Currently resolved theme, owned by the caller's `useTheme()`. */
  theme: Theme
  /** Called when the user activates the toggle. */
  onToggle: () => void
}

/**
 * Manual light/dark override control. Purely presentational — the caller
 * (App) owns the resolved `theme` (from `useTheme`) and reacts to `onToggle`
 * by flipping it. Modeled as a switch: `aria-checked` reflects "dark is on".
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={onToggle}
    >
      {isDark ? 'Dark' : 'Light'}
    </button>
  )
}
