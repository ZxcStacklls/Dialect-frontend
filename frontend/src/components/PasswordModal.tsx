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

    // Проверка на пустое поле
    if (!password.trim()) {
      setError('Пожалуйста, введите пароль')
      return
    }

    setLoading(true)

    try {
      await login(phoneNumber, password)
      navigate('/messenger')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Неверный пароль. Попробуйте снова.'
      setError(errorMessage)
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
          <div className="space-y-3 min-w-0">
            <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Пароль</label>
            <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${
              error
                ? 'border-red-500/60 bg-red-500/10 shadow-red-500/10'
                : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
            }`}>
              <input
                ref={inputRef}
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                className="flex-1 min-w-0 px-5 py-5 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
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
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-gray-400 hover:text-white transition-colors border border-gray-600/40 rounded-lg hover:border-gray-600/60 flex-shrink-0"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordModal

