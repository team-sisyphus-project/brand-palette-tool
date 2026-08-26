import './App.css'
import { ColorGenerator } from './components/ColorGenerator'
import { useTheme } from './lib/theme'

/**
 * grain-1 (theme toggle placement): ThemeToggle no longer lives in the app
 * header — App still owns the theme state (`useTheme`) but hands `theme` /
 * `toggleTheme` down to ColorGenerator as props, which renders the toggle
 * itself, anchored to the color/preview panel (see ColorGenerator.tsx).
 *
 * grain-1 (2026-08-26, pre-generate two-column layout): the page title/
 * description block previously lived here as a standalone `.app__intro` row
 * above `app-shell`. It has been relocated into ColorGenerator's pre-generate
 * branch, where it now forms the left column of a left(title+description)/
 * right(intake form) split alongside the intake form (see
 * `.color-generator__intake` in ColorGenerator.tsx/.css) - App itself no
 * longer renders any title/description markup.
 */
function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app">
      <div className="app-shell">
        <ColorGenerator theme={theme} onToggleTheme={toggleTheme} />
      </div>
    </div>
  )
}

export default App
