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
  const [fieldErrors, setFieldErrors] = useState<{
    phoneNumber?: string
    password?: string
  }>({})
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

  // Если уже авторизован, перенаправляем на messenger
  if (isAuthenticated) {
    navigate('/messenger')
    return null
  }

  const validateForm = (): boolean => {
    const errors: { phoneNumber?: string; password?: string } = {}
    
    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Пожалуйста, введите номер телефона'
    } else if (phoneNumber.trim().length < 10) {
      errors.phoneNumber = 'Номер телефона слишком короткий'
    }
    
    if (!password.trim()) {
      errors.password = 'Пожалуйста, введите пароль'
    } else if (password.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Валидация полей
    if (!validateForm()) {
      return
    }
    
    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      await login(phoneNumber, password)
      navigate('/messenger')
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

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value)
    // Очищаем ошибку при вводе
    if (fieldErrors.phoneNumber) {
      setFieldErrors(prev => ({ ...prev, phoneNumber: undefined }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    // Очищаем ошибку при вводе
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }))
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
      <div className="relative z-10 w-full flex items-center justify-start px-8 md:px-16 lg:px-32 xl:px-40 py-16">
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
              
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Вход в Dialect<span className="text-primary-500">.</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Нет аккаунта?{' '}
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

            <div className="space-y-3">
              <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Номер телефона</label>
              <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${
                fieldErrors.phoneNumber
                  ? 'border-red-500/60 bg-red-500/10 focus-within:border-red-500/80 focus-within:bg-red-500/15'
                  : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
              }`}>
                <input
                  type="text"
                  placeholder="+7 (999) 123-45-67"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="flex-1 min-w-0 px-5 py-5 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                />
                {fieldErrors.phoneNumber && (
                  <div className="absolute right-3 flex items-center">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {fieldErrors.phoneNumber ? (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.phoneNumber}
                </p>
              ) : (
                <p className="text-xs text-gray-500/80">
                  Введите номер телефона, который вы использовали при регистрации
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Пароль</label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Забыли пароль?
                </Link>
              </div>
              <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${
                fieldErrors.password
                  ? 'border-red-500/60 bg-red-500/10 focus-within:border-red-500/80 focus-within:bg-red-500/15'
                  : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
              }`}>
                <input
                  type="password"
                  placeholder="Введите ваш пароль"
                  value={password}
                  onChange={handlePasswordChange}
                  className="flex-1 min-w-0 px-5 py-5 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                />
                {fieldErrors.password && (
                  <div className="absolute right-3 flex items-center">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.password}
                </p>
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
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

