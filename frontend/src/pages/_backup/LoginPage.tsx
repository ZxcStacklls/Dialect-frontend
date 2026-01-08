import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogoAnimation } from '../contexts/LogoAnimationContext'
import { authAPI } from '../api/auth'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    phoneNumber?: string
    code?: string
    password?: string
  }>({})
  const [mounted, setMounted] = useState(false)
  const logoRef = useRef<HTMLDivElement>(null)
  const { logoPosition, setTargetPosition, setAnimating, isAnimating } = useLogoAnimation()

  // SMS Code states
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', ''])
  const [codeResendTimer, setCodeResendTimer] = useState(0)
  const [codeError, setCodeError] = useState(false)
  const [codeShake, setCodeShake] = useState(false)
  const [codeSuccess, setCodeSuccess] = useState(false)
  const [showPhoneConfirm, setShowPhoneConfirm] = useState(false)
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])

  // Password state (after code verification)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [password, setPassword] = useState('')
  const passwordInputRef = useRef<HTMLInputElement>(null)

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

  // Таймер для повторной отправки кода
  useEffect(() => {
    // Check local storage for cooldown on mount
    const lastSent = localStorage.getItem('lastSmsSent')
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000)
      if (elapsed < 60) {
        setCodeResendTimer(60 - elapsed)
      }
    }
  }, [])

  useEffect(() => {
    if (codeResendTimer > 0) {
      const timer = setTimeout(() => setCodeResendTimer(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [codeResendTimer])

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

  const validatePhone = (): boolean => {
    const errors: { phoneNumber?: string } = {}

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Пожалуйста, введите номер телефона'
    } else if (phoneNumber.trim().length < 10) {
      errors.phoneNumber = 'Номер телефона слишком короткий'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const confirmPhoneAndSend = async () => {
    setShowPhoneConfirm(false)

    // Check cooldown
    const lastSent = localStorage.getItem('lastSmsSent')
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent)
      if (elapsed < 60000) {
        setError(`Подождите ${Math.ceil((60000 - elapsed) / 1000)} сек. перед повторной отправкой`)
        return
      }
    }

    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      await authAPI.sendCode(phoneNumber)
      // Set cooldown
      localStorage.setItem('lastSmsSent', Date.now().toString())
      setShowCodeInput(true)
      setCodeResendTimer(60) // 60 секунд до повторной отправки
      // Фокус на первое поле кода
      setTimeout(() => {
        codeInputRefs.current[0]?.focus()
      }, 100)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
        err.message ||
        'Ошибка при отправке кода. Попробуйте снова.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validatePhone()) {
      return
    }

    setShowPhoneConfirm(true)
  }

  const handleCodeChange = (index: number, value: string) => {
    // Только цифры
    if (value && !/^\d$/.test(value)) return

    const newDigits = [...codeDigits]
    newDigits[index] = value
    setCodeDigits(newDigits)

    // Очищаем ошибку кода при вводе
    if (fieldErrors.code) {
      setFieldErrors(prev => ({ ...prev, code: undefined }))
    }

    // Переход к следующему полю
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }

    // Автоматически проверяем код когда все 6 цифр введены
    const allDigits = newDigits.join('')
    if (allDigits.length === 6) {
      verifyCode(allDigits)
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      // Переход на предыдущее поле при Backspace на пустом поле
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length > 0) {
      const newDigits = [...codeDigits]
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newDigits[i] = pastedData[i]
      }
      setCodeDigits(newDigits)

      if (pastedData.length === 6) {
        verifyCode(pastedData)
      } else {
        codeInputRefs.current[pastedData.length]?.focus()
      }
    }
  }

  const verifyCode = async (code: string) => {
    setLoading(true)
    setError('')
    setCodeError(false)

    try {
      const minTime = new Promise(r => setTimeout(r, 1500))
      // Verify code with backend wait for at least 1.5s
      await Promise.all([authAPI.verifyCode(phoneNumber, code), minTime])

      // Show success animation
      setCodeSuccess(true)

      // Wait for animation then proceed
      setTimeout(() => {
        setCodeSuccess(false)
        setShowPasswordInput(true)
        setShowCodeInput(false)
        setCodeDigits(['', '', '', '', '', ''])
        setTimeout(() => {
          passwordInputRef.current?.focus()
        }, 100)
        setLoading(false)
      }, 800)
    } catch {
      // Trigger shake animation and red highlight
      setCodeError(true)
      setCodeShake(true)

      // Remove shake after animation completes
      setTimeout(() => {
        setCodeShake(false)
        setCodeDigits(['', '', '', '', '', ''])
        setCodeError(false)
        codeInputRefs.current[0]?.focus()
      }, 500)
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!password.trim()) {
      setFieldErrors({ password: 'Пожалуйста, введите пароль' })
      return
    }

    if (password.length < 6) {
      setFieldErrors({ password: 'Пароль должен содержать минимум 6 символов' })
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

    try {
      await login(phoneNumber, password)
      navigate('/messenger')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
        err.message ||
        'Неверный пароль. Попробуйте снова.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (codeResendTimer > 0) return

    setLoading(true)
    setError('')

    try {
      await authAPI.sendCode(phoneNumber)
      setCodeResendTimer(60)
      setCodeDigits(['', '', '', '', '', ''])
      codeInputRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при отправке кода')
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
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }))
    }
  }

  const handleBackToPhone = () => {
    setShowCodeInput(false)
    setShowPasswordInput(false)
    setCodeDigits(['', '', '', '', '', ''])
    setPassword('')
    setError('')
  }

  const handleBackToCode = () => {
    setShowPasswordInput(false)
    setShowCodeInput(true)
    setPassword('')
    setError('')
    setTimeout(() => {
      codeInputRefs.current[0]?.focus()
    }, 100)
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
        <div className={`w-full max-w-2xl transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
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
              {showPasswordInput ? 'Введите пароль' : (showCodeInput ? 'Введите код' : 'Вход в Dialect')}<span className="text-primary-500">.</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              {showPasswordInput ? (
                <>Подтвердите вашу личность</>
              ) : showCodeInput ? (
                <>Мы отправили код на {phoneNumber}</>
              ) : (
                <>
                  Нет аккаунта?{' '}
                  <Link
                    to="/signup"
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Зарегистрироваться
                  </Link>
                </>
              )}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border-l-4 border-red-500 text-red-300 px-6 py-4 rounded text-sm mb-6">
              {error}
            </div>
          )}


          {showPasswordInput ? (
            // Форма ввода пароля (после подтверждения кода)
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Пароль</label>
                <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${fieldErrors.password
                  ? 'border-red-500/60 bg-red-500/10 focus-within:border-red-500/80 focus-within:bg-red-500/15'
                  : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
                  }`}>
                  <input
                    ref={passwordInputRef}
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

              <div className="flex gap-3 pt-4">
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
          ) : showCodeInput ? (
            // Форма ввода кода
            <div className="space-y-6">
              {/* 6 полей для ввода кода */}
              <div
                className={`flex justify-center gap-3 ${codeShake ? 'animate-shake' : ''}`}
                style={codeShake ? {
                  animation: 'shake 0.5s ease-in-out'
                } : undefined}
              >
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => codeInputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={handleCodePaste}
                    disabled={loading || codeSuccess}
                    style={loading ? {
                      animation: `loading-wave 1s infinite ease-in-out ${index * 0.1}s`
                    } : codeSuccess ? {
                      transition: 'all 0.5s ease-out',
                      borderColor: '#22c55e', // green-500
                      backgroundColor: 'rgba(34, 197, 94, 0.2)', // green-500/20
                      boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)'
                    } : undefined}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all
                        ${loading ? 'border-gray-600/40 bg-white/5' : ''}
                        ${!loading && !codeError && !codeSuccess
                        ? 'border-gray-600/40 bg-white/5 focus:border-primary-500/60 focus:bg-primary-500/10'
                        : ''
                      }
                        ${codeError
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : ''
                      }
                        text-white focus:outline-none
                      `}
                  />
                ))}
              </div>

              {/* CSS для анимаций */}
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                  20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                @keyframes loading-wave {
                  0%, 100% { border-color: rgba(75, 85, 99, 0.4); background-color: rgba(255, 255, 255, 0.05); }
                  50% { border-color: #3b82f6; background-color: rgba(59, 130, 246, 0.2); box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
                }
              `}</style>

              {/* Кнопка повторной отправки */}
              <div className="text-center">
                {codeResendTimer > 0 ? (
                  <p className="text-gray-500 text-sm">
                    Отправить код повторно через {codeResendTimer} сек
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>

              {/* Кнопка назад */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  disabled={loading}
                  className="flex-1 relative group overflow-hidden bg-gradient-to-r from-gray-800 to-gray-700 text-white py-4 px-8 rounded-lg font-semibold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-gray-700/30 border border-gray-600/30"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Изменить номер
                  </span>
                </button>
              </div>
            </div>
          ) : (
            // Форма ввода телефона
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Номер телефона</label>
                <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${fieldErrors.phoneNumber
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
                    Мы отправим вам код для входа
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
                      Отправка...
                    </span>
                  ) : (
                    'Получить код'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {/* Phone Confirmation Modal */}
      {showPhoneConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-6 bg-gray-900 border border-gray-800 shadow-xl transform transition-all scale-100 animate-fade-in-scale">
            <h3 className="text-xl font-bold mb-4 text-white text-center">Подтвердите номер</h3>
            <p className="text-gray-400 text-center mb-6 text-lg">
              {phoneNumber}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPhoneConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-800 text-primary-400 hover:bg-gray-700 transition-colors"
              >
                Изменить
              </button>
              <button
                type="button"
                onClick={confirmPhoneAndSend}
                className="flex-1 py-3 rounded-xl font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20"
              >
                Верно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

export default LoginPage
