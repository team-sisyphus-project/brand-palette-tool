import './App.css'
import { ColorGenerator } from './components/ColorGenerator'

function App() {
  return (
    <div className="app">
      <h1>컬러 팔레트 제너레이터</h1>
      <p>브랜드 메인 컬러를 입력하면 5색 팔레트가 즉시 생성됩니다.</p>
      <ColorGenerator />
    </div>
  )
}

export default App
