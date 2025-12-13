import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'

const Dashboard = () => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { settings } = useAppearance()
  
  const isDark = theme === 'dark'
  const isModern = settings.designStyle === 'modern'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={`min-h-screen p-8 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' 
        : 'bg-gradient-to-br from-gray-100 via-white to-gray-100'
    }`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${
            isModern ? 'modern-glow-text' : (isDark ? 'text-white' : 'text-gray-900')
          }`}>
            Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className={`px-6 py-2 rounded-lg transition-all ${
              isModern 
                ? 'modern-btn !bg-gradient-to-r !from-red-500 !to-rose-600 hover:!from-red-400 hover:!to-rose-500' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            Logout
          </button>
        </div>

        <div className={`rounded-2xl p-8 ${
          isModern 
            ? 'liquid-glass' 
            : `glass-effect ${isDark ? '' : 'bg-white/80 border-gray-200/50'}`
        }`}>
          <h2 className={`text-2xl font-semibold mb-4 ${
            isModern && isDark ? 'modern-glow-text' : (isDark ? 'text-white' : 'text-gray-900')
          }`}>
            Welcome to Dialect!
          </h2>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Вы успешно авторизованы в системе.
          </p>
          {user && (
            <div className={`mt-4 p-4 rounded-xl ${
              isModern 
                ? 'modern-profile-card' 
                : (isDark ? 'bg-gray-800/30' : 'bg-gray-100/50')
            }`}>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Имя:</span>{' '}
                {user.first_name} {user.last_name}
              </p>
              {user.username && (
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Username:</span>{' '}
                  <span className={isModern ? 'text-primary-400' : 'text-primary-500'}>@{user.username}</span>
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Dashboard

