import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import ProjectHub from './components/ProjectHub'
import Editor from './components/Editor'
import NotFound from './components/NotFound'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Toaster position="top-right" duration={3000} richColors />
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
