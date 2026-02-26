import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProjectHub from './components/ProjectHub'
import Editor from './components/Editor'
import NotFound from './components/NotFound'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<ProjectHub />} />
          <Route path="/editor/:projectId" element={<Editor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
