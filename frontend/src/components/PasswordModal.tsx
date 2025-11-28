import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface PasswordModalProps {
  phoneNumber: string
  isOpen: boolean
  onClose: () => void
}

const PasswordModal: React.FC<PasswordModalProps> = ({ phoneNumber, isOpen, onClose }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(phoneNumber, password)
      navigate('/messenger')
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Неверный пароль. Попробуйте снова.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full p-10 animate-fade-in">
        {/* Заголовок */}
        <div className="mb-12">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Введите пароль<span className="text-primary-500">.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Этот номер уже зарегистрирован. Введите пароль для входа.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border-l-4 border-red-500 text-red-300 px-6 py-4 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400 uppercase tracking-wider">Пароль</label>
            </div>
            <input
              ref={inputRef}
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-6 py-5 bg-white/5 border-b-2 border-gray-600/50 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-gray-400 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-500 text-white py-4 px-8 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Вход...
                </span>
              ) : (
                'Войти'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordModal

