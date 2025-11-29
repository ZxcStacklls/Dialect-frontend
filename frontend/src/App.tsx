import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LogoAnimationProvider } from './contexts/LogoAnimationContext'
import { ToastProvider } from './contexts/ToastContext'
import TitleBar from './components/TitleBar'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import Dashboard from './pages/Dashboard'
import MessengerPage from './pages/MessengerPage'
import ProtectedRoute from './components/ProtectedRoute'
import ParticleBackground from './components/ParticleBackground'

// Компонент для определения, показывать ли ParticleBackground
const AppContent = () => {
  const location = useLocation()
  const isAuthPage = location.pathname === '/' || 
                     location.pathname === '/login' || 
                     location.pathname === '/signup'

  return (
    <div className="app-content">
      {/* Глобальный анимированный фон (только на страницах авторизации) */}
      {isAuthPage && (
        <ParticleBackground particleCount={60} connectionDistance={120} />
      )}
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/messenger"
          element={
            <ProtectedRoute>
              <MessengerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LogoAnimationProvider>
          <div className="app-container">
            <TitleBar />
            <HashRouter>
              <AppContent />
            </HashRouter>
          </div>
        </LogoAnimationProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

