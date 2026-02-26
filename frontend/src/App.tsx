import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProjectHub from './components/ProjectHub'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<ProjectHub />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
