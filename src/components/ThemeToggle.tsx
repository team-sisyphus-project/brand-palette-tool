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
 * by flipping it. Modeled as a real switch widget: a track with a sliding
 * thumb, no text label — `aria-checked` reflects "dark is on".
 *
 * A static Sun icon sits left of the track and a static Moon icon sits right
 * of it (see ThemeToggle.css's `.theme-toggle-icon--sun`/`--moon`), framing
 * the switch so the control reads as a theme toggle at a glance. Both icons
 * are `aria-hidden` decoration — they don't affect the accessible name/state
 * (`role="switch"`/`aria-checked`/`aria-label` above) or contribute text
 * content, and are always rendered regardless of `theme`.
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
      <svg
        className="theme-toggle-icon theme-toggle-icon--sun"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        className="theme-toggle-icon theme-toggle-icon--moon"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
      </svg>
      <span className="theme-toggle-thumb" aria-hidden="true" />
    </button>
  )
}
