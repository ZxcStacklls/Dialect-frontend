import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogoAnimation } from '../contexts/LogoAnimationContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const logoRef = useRef<HTMLDivElement>(null)
  const { logoPosition, setTargetPosition, setAnimating, isAnimating } = useLogoAnimation()

  useEffect(() => {
    setMounted(true)
    
    // Анимация логотипа при загрузке страницы
    if (logoPosition && isAnimating && logoRef.current) {
      // Определяем целевую позицию
      const timer = setTimeout(() => {
        const rect = logoRef.current?.getBoundingClientRect()
        if (rect) {
          setTargetPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
          })
        }
        // Завершаем анимацию после появления
        setTimeout(() => {
          setAnimating(false)
        }, 600)
      }, 50)
      
      return () => clearTimeout(timer)
    }
  }, [logoPosition, isAnimating, setAnimating, setTargetPosition])

  // Блокировка Tab навигации и прокрутки
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Блокируем Tab
      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    const handleWheel = (e: WheelEvent) => {
      // Блокируем прокрутку колесиком мыши
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Блокируем touch-прокрутку
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Блокируем прокрутку через клавиатуру
    const handleKeyDownScroll = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Space'].includes(e.key)) {
        // Разрешаем Space только если не в input/textarea
        if (e.key === 'Space' && (e.target as HTMLElement).tagName === 'INPUT') {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keydown', handleKeyDownScroll, true)
    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keydown', handleKeyDownScroll, true)
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Если уже авторизован, перенаправляем на dashboard
  if (isAuthenticated) {
    navigate('/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setError('')
    setLoading(true)

    try {
      await login(phoneNumber, password)
      navigate('/dashboard')
    } catch (err: any) {
      // Обрабатываем ошибку без перезагрузки страницы
      const errorMessage = err.response?.data?.detail || 
        err.message || 
        'Неверный номер телефона или пароль. Попробуйте снова.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page min-h-screen flex relative overflow-hidden">
      {/* Фоновое изображение с затемнением */}
      <div className="absolute inset-0 z-0">
        <img
          src="/background.jpg"
          alt="Background"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
        <div className="absolute inset-0 bg-black/75"></div>
      </div>

      {/* Контент */}
      <div className="relative z-10 w-full flex items-center justify-start px-8 md:px-16 lg:px-24 py-16">
        <div className={`w-full max-w-2xl transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
        }`}>
          {/* Логотип и заголовок */}
          <div
            ref={logoRef}
            className={`mb-12 ${mounted && (!isAnimating || !logoPosition) ? 'animate-logo-appear' : 'opacity-0 scale-90'}`}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg overflow-hidden">
                <img
                  src="/appicon_gradient.png"
                  alt="Dialect"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/appicon_default.png'
                  }}
                />
              </div>
              <span className="text-white text-lg font-medium">Dialect</span>
            </div>
            
            <div className="mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">START FOR FREE</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Вход в Dialect<span className="text-primary-500">.</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Уже есть аккаунт?{' '}
              <Link
                to="/signup"
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border-l-4 border-red-500 text-red-300 px-6 py-4 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-400 uppercase tracking-wider">Номер телефона</label>
              <input
                type="text"
                placeholder="+7 (999) 123-45-67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full px-6 py-5 bg-white/5 border-b-2 border-gray-600/50 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Пароль</label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Забыли пароль?
                </Link>
              </div>
              <input
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
                onClick={() => navigate('/signup')}
                className="px-8 py-4 text-gray-400 hover:text-white transition-colors"
              >
                Изменить метод
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
    </div>
  )
}

export default LoginPage

