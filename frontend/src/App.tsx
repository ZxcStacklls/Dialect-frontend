import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LogoAnimationProvider } from './contexts/LogoAnimationContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppearanceProvider } from './contexts/AppearanceContext'
import { TitleBarContextProvider, useTitleBar } from './contexts/TitleBarContext'
import TitleBar, { TitleBarProvider } from './components/TitleBar'
import WelcomePage from './pages/WelcomePage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import Dashboard from './pages/Dashboard'
import MessengerPage from './pages/MessengerPage'
import ProtectedRoute from './components/ProtectedRoute'
// import ParticleBackground from './components/ParticleBackground' unused

// Компонент для определения, показывать ли ParticleBackground
const AppContent = () => {
  const location = useLocation()
  const isAuthPage = ['/', '/login', '/signup', '/welcome'].includes(location.pathname)

  return (
    <div className={`app-content ${isAuthPage ? '!mt-0 !h-screen' : ''}`}>
      {/* Глобальный анимированный фон (только на страницах авторизации) */}
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

// Wrapper компонент для TitleBar с контекстом
const TitleBarWithContext = () => {
  const { currentTab } = useTitleBar()
  return <TitleBar activeTab={currentTab} />
}

function App() {
  return (
    <AppearanceProvider>
      <ToastProvider>
        <AuthProvider>
          <LogoAnimationProvider>
            <TitleBarProvider>
              <TitleBarContextProvider>
                <div className="app-container">
                  <TitleBarWithContext />
                  <HashRouter>
                    <AppContent />
                  </HashRouter>
                </div>
              </TitleBarContextProvider>
            </TitleBarProvider>
          </LogoAnimationProvider>
        </AuthProvider>
      </ToastProvider>
    </AppearanceProvider>
  )
}

export default App

