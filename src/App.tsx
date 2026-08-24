import './App.css'
import { ColorGenerator } from './components/ColorGenerator'

function App() {
  return (
    <div className="app">
      <h1>Color Palette Generator</h1>
      <p>Enter a brand main color to instantly generate a 5-color palette.</p>
      <ColorGenerator />
    </div>
  )
}

export default App
