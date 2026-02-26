import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProjectHub from './components/ProjectHub'
import Editor from './components/Editor'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<ProjectHub />} />
          <Route path="/editor/:projectId" element={<Editor />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
