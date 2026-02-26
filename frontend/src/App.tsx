import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-foreground">Home Designer</h1>
                <p className="text-muted-foreground">
                  3D Interior Design Application
                </p>
                <p className="text-sm text-muted-foreground">
                  Frontend initialized. Backend implementation in progress.
                </p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
