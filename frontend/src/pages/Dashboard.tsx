import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="glass-effect rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-4 text-white">
            Welcome to Dialect!
          </h2>
          <p className="text-gray-300 mb-4">
            Вы успешно авторизованы в системе.
          </p>
          {user && (
            <div className="mt-4">
              <p className="text-gray-400">
                <span className="font-semibold text-white">Имя:</span>{' '}
                {user.first_name} {user.last_name}
              </p>
              {user.username && (
                <p className="text-gray-400">
                  <span className="font-semibold text-white">Username:</span>{' '}
                  {user.username}
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

