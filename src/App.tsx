import './App.css'
import { ColorGenerator } from './components/ColorGenerator'
import { useTheme } from './lib/theme'

/**
 * grain-1 (theme toggle placement): ThemeToggle no longer lives in the app
 * header — App still owns the theme state (`useTheme`) but hands `theme` /
 * `toggleTheme` down to ColorGenerator as props, which renders the toggle
 * itself, anchored to the color/preview panel (see ColorGenerator.tsx).
 */
function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app">
      <div className="app__intro">
        <h1>Color Palette Generator</h1>
        <p>Enter a brand main color to instantly generate a 5-color palette.</p>
      </div>
      <div className="app-shell">
        <ColorGenerator theme={theme} onToggleTheme={toggleTheme} />
      </div>
    </div>
  )
}

export default App
