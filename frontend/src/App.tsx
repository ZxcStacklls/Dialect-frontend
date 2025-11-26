import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LogoAnimationProvider } from './contexts/LogoAnimationContext'
import TitleBar from './components/TitleBar'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { isElectron } from './utils/platform'

// В Electron используем HashRouter для лучшей совместимости с file:// протоколом
// В Web используем BrowserRouter для чистых URL
const Router = isElectron() ? HashRouter : BrowserRouter

function App() {
  return (
    <AuthProvider>
      <LogoAnimationProvider>
        <div className="app-container">
          <TitleBar />
          <div className="app-content">
            <Router>
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </div>
        </div>
      </LogoAnimationProvider>
    </AuthProvider>
  )
}

export default App

