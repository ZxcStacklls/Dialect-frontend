import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useLogoAnimation } from '../contexts/LogoAnimationContext'

const WelcomePage = () => {
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()
  const logoRef = useRef<HTMLDivElement>(null)
  const { setLogoPosition, setAnimating, isAnimating } = useLogoAnimation()

  useEffect(() => {
    setIsVisible(true)
  }, [])

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

  const handleNavigation = (path: string) => {
    if (logoRef.current) {
      const rect = logoRef.current.getBoundingClientRect()
      setLogoPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      })
      
      // Начинаем анимацию исчезновения
      setAnimating(true)
      
      // Переходим на страницу после начала анимации
      setTimeout(() => {
        navigate(path)
      }, 400)
    } else {
      navigate(path)
    }
  }

  return (
    <div className="auth-page min-h-screen flex relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
      <div className="relative z-10 w-full flex items-center justify-center p-4">
        <div className={`w-full max-w-4xl text-center transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {/* Логотип с анимацией */}
          <div
            ref={logoRef}
            className={`mb-8 ${
              isAnimating ? 'animate-logo-move' : isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-2xl">
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
          </div>

          {/* Заголовок */}
          <h1 className={`text-5xl md:text-6xl font-bold text-white mb-4 transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            Добро пожаловать в Dialect
          </h1>

          {/* Подзаголовок */}
          <p className={`text-xl md:text-2xl text-gray-300 mb-12 transition-all duration-1000 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            Самый безопасный и быстрый мессенджер
          </p>

          {/* Кнопка */}
          <div className={`transition-all duration-1000 delay-900 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <button
              onClick={() => handleNavigation('/signup')}
              className="inline-block px-12 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-lg font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 transform duration-300"
            >
              Начать общение
            </button>
          </div>

          {/* Дополнительная информация */}
          <div className={`mt-16 text-gray-400 transition-all duration-1000 delay-1100 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}>
            <p className="mb-4">Уже есть аккаунт?</p>
            <button
              onClick={() => handleNavigation('/login')}
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors underline"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage

