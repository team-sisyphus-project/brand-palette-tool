import './App.css'
import { ColorGenerator } from './components/ColorGenerator'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './lib/theme'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app">
      <div className="app__intro">
        <div className="app__header">
          <h1>Color Palette Generator</h1>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <p>Enter a brand main color to instantly generate a 5-color palette.</p>
      </div>
      <div className="app-shell">
        <ColorGenerator />
      </div>
    </div>
  )
}

export default App
