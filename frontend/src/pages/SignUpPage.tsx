import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogoAnimation } from '../contexts/LogoAnimationContext'
import CountrySelector, { CIS_COUNTRIES, Country } from '../components/CountrySelector'
import AvatarUpload from '../components/AvatarUpload'
import PasswordModal from '../components/PasswordModal'
import AnimatedSlogans from '../components/AnimatedSlogans'
import { authAPI } from '../api/auth'

type Step = 1 | 2 | 3

const SignUpPage = () => {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    country: null as Country | null,
    countryCode: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    username: '',
    first_name: '',
    last_name: '',
    avatar: null as File | null,
    public_key: 'default_public_key',
  })

  const countryCodeInputRef = useRef<HTMLInputElement>(null)
  const phoneNumberInputRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const { logoPosition, setTargetPosition, setAnimating, isAnimating } = useLogoAnimation()

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [existingPhoneNumber, setExistingPhoneNumber] = useState('')
  const [countryJustChanged, setCountryJustChanged] = useState(false)
  const [, setPhoneExists] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState('')
  const [firstNameError, setFirstNameError] = useState('')
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(false)

  // SMS Code verification states
  const [showSmsCodeInput, setShowSmsCodeInput] = useState(false)
  const [smsCodeDigits, setSmsCodeDigits] = useState(['', '', '', '', '', ''])
  const [smsCodeResendTimer, setSmsCodeResendTimer] = useState(0)
  const smsCodeInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])
  const [smsCodeError, setSmsCodeError] = useState(false) // Changed to boolean for red highlight
  const [smsCodeShake, setSmsCodeShake] = useState(false) // Shake animation state
  const [smsCodeSuccess, setSmsCodeSuccess] = useState(false) // Success animation state
  const [showPhoneConfirm, setShowPhoneConfirm] = useState(false)
  // Global SMS rate limit - prevents spamming by going back and requesting again
  const [smsGlobalCooldown, setSmsGlobalCooldown] = useState(0)

  const passwordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmPasswordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      // Разрешаем прокрутку только в select menu со странами
      const target = e.target as HTMLElement
      if (target.closest('.country-selector-dropdown')) {
        return // Разрешаем прокрутку в dropdown
      }
      // Блокируем прокрутку колесиком мыши везде кроме dropdown
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Разрешаем прокрутку только в select menu со странами
      const target = e.target as HTMLElement
      if (target.closest('.country-selector-dropdown')) {
        return // Разрешаем прокрутку в dropdown
      }
      // Блокируем touch-прокрутку
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    // Блокируем прокрутку через клавиатуру
    const handleKeyDownScroll = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        // Разрешаем в select menu
        const target = e.target as HTMLElement
        if (target.closest('.country-selector-dropdown')) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      // Space разрешаем только в input/textarea
      if (e.key === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
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

  // SMS code resend timer
  useEffect(() => {
    if (smsCodeResendTimer > 0) {
      const timer = setTimeout(() => setSmsCodeResendTimer(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [smsCodeResendTimer])

  // Global SMS cooldown timer - prevents request spam
  useEffect(() => {
    if (smsGlobalCooldown > 0) {
      const timer = setTimeout(() => setSmsGlobalCooldown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [smsGlobalCooldown])

  useEffect(() => {
    setMounted(true)

    // Восстанавливаем данные регистрации из localStorage, если они есть
    try {
      const pendingRegistration = localStorage.getItem('pending_registration')
      if (pendingRegistration) {
        const data = JSON.parse(pendingRegistration)
        // Проверяем, что данные не старше 1 часа
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          // Восстанавливаем код страны и номер
          if (data.phone_number) {
            const phoneMatch = data.phone_number.match(/^(\+\d+)(.+)$/)
            if (phoneMatch) {
              const countryCode = phoneMatch[1]
              const phoneNumber = phoneMatch[2].replace(/\D/g, '')
              const foundCountry = findCountryByCode(countryCode)

              setFormData(prev => ({
                ...prev,
                country: foundCountry,
                countryCode: foundCountry?.dialCode || countryCode,
                phoneNumber: phoneNumber || prev.phoneNumber,
                username: data.username || prev.username,
                first_name: data.first_name || prev.first_name,
                last_name: data.last_name || prev.last_name,
                password: data.password || prev.password,
                confirmPassword: data.password || prev.confirmPassword,
                public_key: data.public_key || prev.public_key,
              }))
            } else {
              // Если не удалось распарсить номер, восстанавливаем только остальные данные
              setFormData(prev => ({
                ...prev,
                username: data.username || prev.username,
                first_name: data.first_name || prev.first_name,
                last_name: data.last_name || prev.last_name,
                password: data.password || prev.password,
                confirmPassword: data.password || prev.confirmPassword,
                public_key: data.public_key || prev.public_key,
              }))
            }
          } else {
            // Если номера нет, восстанавливаем только остальные данные
            setFormData(prev => ({
              ...prev,
              username: data.username || prev.username,
              first_name: data.first_name || prev.first_name,
              last_name: data.last_name || prev.last_name,
              password: data.password || prev.password,
              confirmPassword: data.password || prev.confirmPassword,
              public_key: data.public_key || prev.public_key,
            }))
          }
        } else {
          // Удаляем устаревшие данные
          localStorage.removeItem('pending_registration')
        }
      }
    } catch (error) {
      console.warn('Ошибка при восстановлении данных регистрации:', error)
      localStorage.removeItem('pending_registration')
    }

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

    return () => {
      if (passwordTimeoutRef.current) clearTimeout(passwordTimeoutRef.current)
      if (confirmPasswordTimeoutRef.current) clearTimeout(confirmPasswordTimeoutRef.current)
      if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current)
    }
  }, [logoPosition, isAnimating, setAnimating])

  // Если уже авторизован, перенаправляем на messenger
  if (isAuthenticated) {
    navigate('/messenger')
    return null
  }

  const findCountryByCode = (code: string): Country | null => {
    // Убираем + если есть
    const cleanCode = code.startsWith('+') ? code : `+${code}`

    // Сначала ищем точное совпадение
    const exactMatch = CIS_COUNTRIES.find(c => c.dialCode === cleanCode)
    if (exactMatch) return exactMatch

    // Если точного совпадения нет, ищем страны, код которых начинается с введенного кода
    // Но только если введенный код достаточно длинный для однозначного определения
    const partialMatches = CIS_COUNTRIES.filter(c => c.dialCode.startsWith(cleanCode))

    // Если есть только одно частичное совпадение, возвращаем его
    // Это работает для случаев, когда код еще не полностью введен, но уже однозначен
    if (partialMatches.length === 1) {
      return partialMatches[0]
    }

    // Если несколько совпадений, проверяем, можем ли мы определить страну
    // Например, +7 соответствует и России, и Казахстану - возвращаем первую (Россию)
    if (partialMatches.length > 1) {
      // Если все совпадения имеют одинаковый код (например, +7 для RU и KZ), возвращаем первое
      const firstDialCode = partialMatches[0].dialCode
      if (partialMatches.every(c => c.dialCode === firstDialCode)) {
        return partialMatches[0]
      }
    }

    return null
  }

  const getFullPhoneNumber = () => {
    if (!formData.countryCode) return ''
    const code = formData.countryCode.startsWith('+') ? formData.countryCode : `+${formData.countryCode}`
    return `${code}${formData.phoneNumber.replace(/\D/g, '')}`
  }

  const getPhonePlaceholder = (): string => {
    if (!formData.country) return ''

    const dialCode = formData.country.dialCode
    const maxLength = formData.country.maxLength

    // Placeholder в зависимости от страны
    if (dialCode === '+7') return '0 00 000 00 00'
    if (dialCode === '+375') return '00 000-00-00'
    if (dialCode === '+996') return '000 000-000'
    if (dialCode === '+992') return '00 000-00-00'
    if (dialCode === '+998') return '00 000-00-00'
    if (dialCode === '+86') return '000 0000 0000'
    if (dialCode === '+91') return '00000 00000'
    if (dialCode === '+90') return '000 000 00 00'
    if (dialCode === '+98') return '000 000 0000'
    if (dialCode === '+55') return '00 00000-0000'
    if (dialCode === '+58') return '000 000-0000'
    if (dialCode === '+53') return '000 00000'
    if (dialCode === '+20') return '00 0000 0000'
    if (dialCode === '+27') return '00 000 0000'
    if (dialCode === '+251') return '00 000 0000'
    if (dialCode === '+223') return '00 00 00 00'
    if (dialCode === '+226') return '00 00 00 00'
    if (dialCode === '+236') return '00 00 00 00'
    if (dialCode === '+971') return '00 000 0000'
    if (dialCode === '+966') return '0 000 0000'
    if (dialCode === '+213') return '00 000 0000'
    if (dialCode === '+963') return '000 000 000'
    if (dialCode === '+850') return '0 000 0000'
    if (dialCode === '+58') return '000 000-0000'
    if (dialCode === '+53') return '000 00000'
    if (dialCode === '+20') return '00 0000 0000'
    if (dialCode === '+27') return '00 000 0000'
    if (dialCode === '+251') return '00 000 0000'
    if (dialCode === '+223') return '00 00 00 00'
    if (dialCode === '+226') return '00 00 00 00'
    if (dialCode === '+236') return '00 00 00 00'
    if (dialCode === '+971') return '00 000 0000'
    if (dialCode === '+966') return '0 000 0000'
    if (dialCode === '+213') return '00 000 0000'
    if (dialCode === '+963') return '000 000 000'

    // По умолчанию просто нули
    return '0'.repeat(Math.min(maxLength, 10))
  }

  const formatPhoneNumber = (value: string) => {
    if (!formData.country) return value.replace(/\D/g, '')

    const digits = value.replace(/\D/g, '')
    const maxLength = formData.country.maxLength

    if (digits.length > maxLength) {
      return digits.slice(0, maxLength)
    }

    const dialCode = formData.country.dialCode

    // Форматирование для России и Казахстана (+7): X XX XXX XX XX (например: 9 12 345 67 89)
    if (dialCode === '+7' && digits.length > 0) {
      if (digits.length <= 1) {
        return digits
      } else if (digits.length <= 3) {
        return `${digits.slice(0, 1)} ${digits.slice(1)}`
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3)}`
      } else if (digits.length <= 8) {
        return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
      } else {
        return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
      }
    }

    // Форматирование для Беларуси (+375): XX XXX-XX-XX
    if (dialCode === '+375' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else if (digits.length <= 7) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`
      }
    }

    // Форматирование для Кыргызстана (+996): XXX XXX-XXX
    if (dialCode === '+996' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
    }

    // Форматирование для Таджикистана (+992): XX XXX-XX-XX
    if (dialCode === '+992' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else if (digits.length <= 7) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`
      }
    }

    // Форматирование для Узбекистана (+998): XX XXX-XX-XX
    if (dialCode === '+998' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else if (digits.length <= 7) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`
      }
    }

    // Форматирование для Китая (+86): XXX XXXX XXXX
    if (dialCode === '+86' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 7) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
      }
    }

    // Форматирование для Индии (+91): XXXXX XXXXX
    if (dialCode === '+91' && digits.length > 0) {
      if (digits.length <= 5) {
        return digits
      } else {
        return `${digits.slice(0, 5)} ${digits.slice(5)}`
      }
    }

    // Форматирование для Турции (+90): XXX XXX XX XX
    if (dialCode === '+90' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else if (digits.length <= 8) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
      }
    }

    // Форматирование для Ирана (+98): XXX XXX XXXX
    if (dialCode === '+98' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
      }
    }

    // Форматирование для Бразилии (+55): XX XXXXX-XXXX
    if (dialCode === '+55' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 7) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`
      }
    }

    // Форматирование для Венесуэлы (+58): XXX XXX-XXXX
    if (dialCode === '+58' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
    }

    // Форматирование для Кубы (+53): XXX XXXXX
    if (dialCode === '+53' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      }
    }

    // Форматирование для Египта (+20): XX XXXX XXXX
    if (dialCode === '+20' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
      }
    }

    // Форматирование для ЮАР (+27): XX XXX XXXX
    if (dialCode === '+27' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
      }
    }

    // Форматирование для Эфиопии (+251): XX XXX XXXX
    if (dialCode === '+251' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
      }
    }

    // Форматирование для Мали, Буркина-Фасо, ЦАР (+223, +226, +236): XX XX XX XX
    if ((dialCode === '+223' || dialCode === '+226' || dialCode === '+236') && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 4) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`
      }
    }

    // Форматирование для ОАЭ (+971): XX XXX XXXX
    if (dialCode === '+971' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
      }
    }

    // Форматирование для Саудовской Аравии (+966): X XXX XXXX
    if (dialCode === '+966' && digits.length > 0) {
      if (digits.length <= 1) {
        return digits
      } else if (digits.length <= 4) {
        return `${digits.slice(0, 1)} ${digits.slice(1)}`
      } else {
        return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`
      }
    }

    // Форматирование для Алжира (+213): XX XXX XXXX
    if (dialCode === '+213' && digits.length > 0) {
      if (digits.length <= 2) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`
      } else {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
      }
    }

    // Форматирование для Сирии (+963): XXX XXX XXX
    if (dialCode === '+963' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
      }
    }

    // Форматирование для КНДР (+850): X XXX XXXX
    if (dialCode === '+850' && digits.length > 0) {
      if (digits.length <= 1) {
        return digits
      } else if (digits.length <= 4) {
        return `${digits.slice(0, 1)} ${digits.slice(1)}`
      } else {
        return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`
      }
    }

    // Универсальное форматирование для остальных стран: группы по 3 цифры с пробелами
    if (digits.length > 0) {
      const parts: string[] = []
      for (let i = 0; i < digits.length; i += 3) {
        parts.push(digits.slice(i, i + 3))
      }
      return parts.join(' ')
    }

    return digits
  }

  const handleCountryChange = (country: Country | null) => {
    if (country) {
      setFormData({ ...formData, country, countryCode: country.dialCode, phoneNumber: '' })
    } else {
      setFormData({ ...formData, country: null, countryCode: '+', phoneNumber: '' })
    }
    setError('')
    setPhoneExists(false)
  }

  const handleCountryCodeChange = (value: string) => {
    // value уже содержит +, убираем его для обработки
    const digits = value.replace(/\D/g, '')

    // Ограничиваем длину (самый длинный код 375)
    const limitedDigits = digits.slice(0, 3)

    // Всегда начинаем с +
    const code = '+' + limitedDigits

    // Если только + или пусто, убираем страну
    if (code === '+' || limitedDigits === '') {
      setFormData(prev => ({ ...prev, countryCode: code, country: null }))
      setError('')
      setPhoneExists(false)
      setCountryJustChanged(false)
      return
    }

    // Ищем страну по коду сразу (без задержки)
    const foundCountry = findCountryByCode(code)

    if (foundCountry) {
      // Если страна найдена, обновляем и код, и страну
      const wasDifferent = formData.country?.code !== foundCountry.code
      setFormData(prev => ({
        ...prev,
        country: foundCountry,
        countryCode: foundCountry.dialCode,
        phoneNumber: '' // Сбрасываем номер при смене страны
      }))

      // Анимация при изменении страны
      if (wasDifferent) {
        setCountryJustChanged(true)
        setTimeout(() => setCountryJustChanged(false), 300)
      }

      // Автоматически переводим курсор на поле ввода номера
      setTimeout(() => {
        phoneNumberInputRef.current?.focus()
      }, 50)
    } else {
      // Если код не найден, оставляем код как есть, но убираем страну
      setFormData(prev => ({
        ...prev,
        countryCode: code,
        country: null
      }))
      setCountryJustChanged(false)
    }

    setError('')
    setPhoneExists(false)
  }

  const handlePhoneChange = (value: string) => {
    if (!formData.country) {
      // Если страна не выбрана, просто сохраняем цифры
      const digits = value.replace(/\D/g, '')
      setFormData({ ...formData, phoneNumber: digits })
      setError('')
      setPhoneExists(false)
      return
    }

    // Получаем только цифры из введенного значения
    const digits = value.replace(/\D/g, '')

    // Проверяем, не превышает ли длина максимальную
    const maxLength = formData.country.maxLength
    if (digits.length > maxLength) {
      // Если превышает, обрезаем до максимальной длины
      const trimmedDigits = digits.slice(0, maxLength)
      const formatted = formatPhoneNumber(trimmedDigits)
      setFormData({ ...formData, phoneNumber: formatted })
      setError('')
      setPhoneExists(false)
      return
    }

    // Форматируем номер
    const formatted = formatPhoneNumber(digits)
    setFormData({ ...formData, phoneNumber: formatted })
    setError('')
    setPhoneExists(false)
  }

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Если поле пустое и нажат backspace, переходим в поле кода страны
    if (e.key === 'Backspace' && formData.phoneNumber.replace(/\D/g, '').length === 0) {
      e.preventDefault()
      countryCodeInputRef.current?.focus()
      // Ставим курсор в конец кода страны
      setTimeout(() => {
        if (countryCodeInputRef.current) {
          const length = countryCodeInputRef.current.value.length
          countryCodeInputRef.current.setSelectionRange(length, length)
        }
      }, 0)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Обрабатываем username отдельно (убираем @ и проверяем уникальность)
    if (name === 'username') {
      // Убираем @ если пользователь его ввел
      const cleanUsername = value.replace(/^@+/, '')

      // Обновляем значение без @
      const newFormData = {
        ...formData,
        [name]: cleanUsername,
      }
      setFormData(newFormData)

      // Сбрасываем состояние проверки
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current)
      }

      if (!cleanUsername) {
        setUsernameError('')
        setUsernameAvailable(false)
        setCheckingUsername(false)
        return
      }

      // Проверяем минимальную длину
      if (cleanUsername.length < 3) {
        setUsernameError('Имя пользователя должно содержать минимум 3 символа')
        setUsernameAvailable(false)
        setCheckingUsername(false)
        return
      }

      // Проверка уникальности с debounce
      setCheckingUsername(true)
      usernameTimeoutRef.current = setTimeout(async () => {
        try {
          const isAvailable = await authAPI.checkUsernameAvailability(cleanUsername)
          setCheckingUsername(false)
          if (isAvailable) {
            setUsernameError('')
            setUsernameAvailable(true)
          } else {
            setUsernameError('Это имя пользователя уже занято')
            setUsernameAvailable(false)
          }
        } catch (error) {
          setCheckingUsername(false)
          setUsernameError('Ошибка при проверке имени пользователя')
          setUsernameAvailable(false)
        }
      }, 500)
      return
    }

    const newFormData = {
      ...formData,
      [name]: value,
    }
    setFormData(newFormData)

    // Валидация пароля в реальном времени с debounce
    if (name === 'password') {
      if (passwordTimeoutRef.current) {
        clearTimeout(passwordTimeoutRef.current)
      }

      if (!value) {
        // Не показываем ошибку сразу при очистке, только если пользователь ушел с поля или нажал "Далее"
        // Но если мы уже показывали ошибку "Заполните это поле", то можно оставить или убрать
        // Лучше убрать ошибку при начале ввода или очистке, валидация сработает при сабмите
        setPasswordError('')
        if (formData.confirmPassword) {
          if (confirmPasswordTimeoutRef.current) {
            clearTimeout(confirmPasswordTimeoutRef.current)
          }
          confirmPasswordTimeoutRef.current = setTimeout(() => {
            if (formData.confirmPassword !== value) {
              setConfirmPasswordError('Пароли не совпадают')
            } else {
              setConfirmPasswordError('')
            }
          }, 500)
        }
        return
      }

      passwordTimeoutRef.current = setTimeout(() => {
        if (value.length < 6) {
          setPasswordError('Пароль должен содержать минимум 6 символов')
        } else {
          setPasswordError('')
        }
      }, 500)

      if (formData.confirmPassword) {
        if (confirmPasswordTimeoutRef.current) {
          clearTimeout(confirmPasswordTimeoutRef.current)
        }
        confirmPasswordTimeoutRef.current = setTimeout(() => {
          if (formData.confirmPassword !== value) {
            setConfirmPasswordError('Пароли не совпадают')
          } else {
            setConfirmPasswordError('')
          }
        }, 500)
      }
    }

    if (name === 'confirmPassword') {
      if (confirmPasswordTimeoutRef.current) {
        clearTimeout(confirmPasswordTimeoutRef.current)
      }

      if (!value) {
        setConfirmPasswordError('')
        return
      }

      confirmPasswordTimeoutRef.current = setTimeout(() => {
        if (value !== newFormData.password) {
          setConfirmPasswordError('Пароли не совпадают')
        } else {
          setConfirmPasswordError('')
        }
      }, 500)
    }
    if (name === 'first_name') {
      if (value.trim()) {
        setFirstNameError('')
      }
    }
  }

  const validateStep1 = async (): Promise<boolean> => {
    if (!formData.countryCode || formData.countryCode === '+') {
      setError('Введите код страны')
      return false
    }

    // Проверяем, что код страны соответствует доступным странам
    const code = formData.countryCode.startsWith('+') ? formData.countryCode : `+${formData.countryCode}`
    const foundCountry = findCountryByCode(code)

    if (!foundCountry) {
      setError('Код страны не поддерживается. Выберите страну из списка.')
      return false
    }

    // Обновляем страну если код изменился
    if (!formData.country || foundCountry.code !== formData.country.code) {
      setFormData(prev => ({ ...prev, country: foundCountry }))
    }

    const fullPhone = getFullPhoneNumber()
    const phoneDigits = fullPhone.replace(/\D/g, '')
    const expectedLength = code.replace(/\D/g, '').length + foundCountry.maxLength

    if (phoneDigits.length < expectedLength) {
      setError(`Введите полный номер телефона`)
      return false
    }

    // Проверка существования номера только при нажатии "Далее"
    setCheckingPhone(true)
    try {
      const exists = await authAPI.checkPhoneExists(fullPhone)
      setPhoneExists(exists)
      setCheckingPhone(false)

      if (exists) {
        // Показываем модальное окно для ввода пароля
        setExistingPhoneNumber(fullPhone)
        setShowPasswordModal(true)
        return false
      }
    } catch {
      setCheckingPhone(false)
      setError('Ошибка при проверке номера. Попробуйте снова.')
      return false
    }

    return true
  }

  const validateStep2 = (): boolean => {
    let isValid = true

    if (!formData.password) {
      setPasswordError('Заполните это поле')
      isValid = false
    } else if (formData.password.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов')
      isValid = false
    }

    if (formData.confirmPassword && formData.password && formData.password !== formData.confirmPassword) {
      setConfirmPasswordError('Пароли не совпадают')
      isValid = false
    }

    return isValid
  }

  const validateStep3 = (): boolean => {
    let isValid = true

    if (!formData.first_name.trim()) {
      setFirstNameError('Заполните это поле')
      isValid = false
    }

    if (!formData.username.trim()) {
      setUsernameError('Заполните это поле')
      isValid = false
    } else if (formData.username.trim().length < 3) {
      setUsernameError('Имя пользователя должно содержать минимум 3 символа')
      isValid = false
    }

    if (usernameError && usernameError !== 'Заполните это поле') {
      // Если есть другая ошибка (например, занято), то не валидно
      isValid = false
    }

    if (checkingUsername) {
      setError('Пожалуйста, дождитесь завершения проверки имени пользователя')
      return false
    }

    if (!usernameAvailable && formData.username.trim().length >= 3) {
      setUsernameError('Это имя пользователя уже занято. Выберите другое.')
      isValid = false
    }

    // Проверка аватара, если он был загружен
    if (formData.avatar && avatarError) {
      setError(avatarError)
      isValid = false
    }

    return isValid
  }

  const confirmPhoneAndSend = async () => {
    setShowPhoneConfirm(false)

    // Check localStorage cooldown
    const lastSent = localStorage.getItem('lastSmsSent')
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent)
      if (elapsed < 60000) {
        const remaining = Math.ceil((60000 - elapsed) / 1000)
        setError(`Подождите ${remaining} сек. перед повторной отправкой`)
        setSmsGlobalCooldown(remaining)
        setSmsCodeResendTimer(remaining)
        setShowSmsCodeInput(true)
        return
      }
    }

    // Send SMS code
    setLoading(true)
    try {
      await authAPI.sendCode(getFullPhoneNumber(), true)
      localStorage.setItem('lastSmsSent', Date.now().toString())
      setSmsGlobalCooldown(60)
      setShowSmsCodeInput(true)
      setSmsCodeResendTimer(60)
      setTimeout(() => {
        smsCodeInputRefs.current[0]?.focus()
      }, 100)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при отправке кода')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    setError('')

    if (currentStep === 1) {
      if (showSmsCodeInput) {
        // Already showing SMS code input - user pressed back and returned
        return
      }
      const isValid = await validateStep1()
      if (!isValid) return

      // Show confirmation
      setShowPhoneConfirm(true)

    } else if (currentStep === 2) {
      if (!validateStep2()) return
      setCurrentStep(3)
    }
  }

  // SMS Code handlers
  const handleSmsCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return

    const newDigits = [...smsCodeDigits]
    newDigits[index] = value
    setSmsCodeDigits(newDigits)
    setSmsCodeError(false)

    if (value && index < 5) {
      smsCodeInputRefs.current[index + 1]?.focus()
    }

    const allDigits = newDigits.join('')
    if (allDigits.length === 6) {
      verifySmsCode(allDigits)
    }
  }

  const handleSmsCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !smsCodeDigits[index] && index > 0) {
      smsCodeInputRefs.current[index - 1]?.focus()
    }
  }

  const handleSmsCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length > 0) {
      const newDigits = [...smsCodeDigits]
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newDigits[i] = pastedData[i]
      }
      setSmsCodeDigits(newDigits)

      if (pastedData.length === 6) {
        verifySmsCode(pastedData)
      } else {
        smsCodeInputRefs.current[pastedData.length]?.focus()
      }
    }
  }

  const handleSmsResend = async () => {
    if (smsCodeResendTimer > 0) return

    setLoading(true)
    setError('')

    try {
      await authAPI.sendCode(getFullPhoneNumber(), true)
      setSmsCodeResendTimer(60)
      setSmsGlobalCooldown(60) // Update global cooldown too
      setSmsCodeDigits(['', '', '', '', '', ''])
      smsCodeInputRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при отправке кода')
    } finally {
      setLoading(false)
    }
  }

  const verifySmsCode = async (code: string) => {
    setLoading(true)
    setSmsCodeError(false)

    try {
      const minTime = new Promise(r => setTimeout(r, 1500))
      // Verify code with backend wait for at least 1.5s
      await Promise.all([authAPI.verifyCode(getFullPhoneNumber(), code, true), minTime])

      // Show success animation
      setLoading(false)
      setSmsCodeSuccess(true)

      // Wait for success animation then proceed
      setTimeout(() => {
        setSmsCodeSuccess(false)
        setShowSmsCodeInput(false)
        setSmsCodeDigits(['', '', '', '', '', ''])
        setCurrentStep(2)
      }, 800)
    } catch {
      // Trigger shake animation and red highlight
      setSmsCodeError(true)
      setSmsCodeShake(true)

      // Remove shake after animation completes
      setTimeout(() => {
        setSmsCodeShake(false)
        // Clear the code inputs after shake
        setSmsCodeDigits(['', '', '', '', '', ''])
        setSmsCodeError(false)
        smsCodeInputRefs.current[0]?.focus()
      }, 500)
      setLoading(false)
    }
  }

  const handleBack = () => {
    setError('')
    setPhoneExists(false)

    if (showSmsCodeInput) {
      // Go back from SMS code to phone input
      setShowSmsCodeInput(false)
      setSmsCodeDigits(['', '', '', '', '', ''])
      setSmsCodeError(false)
      return
    }

    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!validateStep3()) return

    setLoading(true)
    setError('')

    // Сохраняем данные регистрации в localStorage для безопасности
    const registrationData = {
      phone_number: getFullPhoneNumber(),
      username: formData.username.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim() || undefined,
      password: formData.password,
      public_key: formData.public_key,
      country: formData.country?.code || undefined,
    }

    // Сохраняем данные локально перед регистрацией
    try {
      localStorage.setItem('pending_registration', JSON.stringify({
        ...registrationData,
        timestamp: Date.now(),
      }))
    } catch (storageError) {
      console.warn('Не удалось сохранить данные в localStorage:', storageError)
    }

    // Финальная проверка перед регистрацией
    try {
      // Проверяем номер телефона еще раз перед финальной регистрацией
      const phoneExists = await authAPI.checkPhoneExists(registrationData.phone_number)
      if (phoneExists) {
        setError('Этот номер телефона уже зарегистрирован. Используйте другой номер.')
        localStorage.removeItem('pending_registration')
        setLoading(false)
        return
      }

      // Если все проверки пройдены, создаем пользователя
      await register(registrationData)

      // Загружаем аватар, если он был выбран
      if (formData.avatar) {
        try {
          await authAPI.uploadAvatar(formData.avatar)
        } catch (avatarError: any) {
          // Если загрузка аватара не удалась, не блокируем регистрацию
          // Пользователь уже зарегистрирован, просто аватар не загрузился
          console.warn('Ошибка при загрузке аватара:', avatarError)
        }
      }

      // Очищаем сохраненные данные после успешной регистрации
      localStorage.removeItem('pending_registration')

      navigate('/messenger')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Ошибка при регистрации. Попробуйте снова.'

      // Очищаем сохраненные данные при ошибке
      localStorage.removeItem('pending_registration')

      if (errorMessage.toLowerCase().includes('phone') || errorMessage.toLowerCase().includes('номер')) {
        setError('Этот номер телефона уже зарегистрирован. Используйте другой номер.')
        // Возвращаемся на шаг 1 для изменения номера
        setCurrentStep(1)
      } else if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('имя пользователя')) {
        setError('Это имя пользователя уже занято. Выберите другое.')
        // Остаемся на шаге 3 для изменения username
      } else {
        setError(errorMessage)
      }
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
      <div className="relative z-10 w-full flex items-center justify-between px-4 sm:px-8 md:px-16 lg:px-32 xl:px-40 py-16 gap-6 lg:gap-12">
        {/* Форма регистрации */}
        <div className={`w-full max-w-2xl min-w-0 sm:min-w-[500px] flex-shrink-0 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}>
          {/* Логотип и заголовок */}
          {currentStep === 1 && (
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

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight break-words">
                {showSmsCodeInput ? 'Введите код' : 'Создать новый аккаунт'}<span className="text-primary-500">.</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                {showSmsCodeInput ? (
                  <>Мы отправили код на {getFullPhoneNumber()}</>
                ) : (
                  <>
                    Уже есть аккаунт?{' '}
                    <Link
                      to="/login"
                      className="text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Войти
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Заголовок шага (для остальных шагов) */}
          {currentStep !== 1 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {currentStep === 2 && 'ШАГ 2 ИЗ 3'}
                  {currentStep === 3 && 'ШАГ 3 ИЗ 3'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight break-words">
                {currentStep === 2 && 'Пароль'}
                {currentStep === 3 && 'Расскажите о себе'}
              </h1>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border-l-4 border-red-500 text-red-300 px-6 py-4 rounded text-sm mb-6">
              {error}
            </div>
          )}


          {/* Шаг 1: Номер телефона или SMS код */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {showSmsCodeInput ? (
                // SMS Code Input
                <>
                  {/* 6 полей для ввода кода */}
                  <div
                    className={`flex justify-center gap-3 ${smsCodeShake ? 'animate-shake' : ''}`}
                    style={smsCodeShake ? {
                      animation: 'shake 0.5s ease-in-out'
                    } : undefined}
                  >
                    {smsCodeDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => smsCodeInputRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleSmsCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleSmsCodeKeyDown(index, e)}
                        onPaste={handleSmsCodePaste}
                        disabled={loading || smsCodeSuccess}
                        style={loading ? {
                          animation: `loading-wave 1s infinite ease-in-out ${index * 0.1}s`
                        } : smsCodeSuccess ? {
                          transition: 'all 0.5s ease-out',
                          borderColor: '#22c55e', // green-500
                          backgroundColor: 'rgba(34, 197, 94, 0.2)', // green-500/20
                          boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)'
                        } : undefined}
                        className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all
                          ${loading ? 'border-gray-600/40 bg-white/5' : ''}
                          ${!loading && !smsCodeError && !smsCodeSuccess
                            ? 'border-gray-600/40 bg-white/5 focus:border-primary-500/60 focus:bg-primary-500/10'
                            : ''
                          }
                          ${smsCodeError
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
                    {smsCodeResendTimer > 0 ? (
                      <p className="text-gray-500 text-sm">
                        Отправить код повторно через {smsCodeResendTimer} сек
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSmsResend}
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
                      onClick={handleBack}
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
                </>
              ) : (
                // Phone Input
                <>
                  <div className="space-y-3 min-w-0">
                    <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Страна</label>
                    <div className={countryJustChanged ? 'animate-country-select' : ''}>
                      <CountrySelector
                        selectedCountry={formData.country}
                        onCountryChange={handleCountryChange}
                      />
                    </div>
                    <p className="text-xs text-gray-500/80">
                      Выберите страну для определения кода страны
                    </p>
                  </div>

                  <div className="space-y-3 min-w-0">
                    <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Номер телефона</label>
                    <div className="relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20">
                      <div className="px-5 py-5 text-primary-400 text-xl font-bold border-0 select-none flex-shrink-0">+</div>
                      <input
                        ref={countryCodeInputRef}
                        type="text"
                        value={formData.countryCode.replace('+', '')}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '')
                          handleCountryCodeChange('+' + value)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && formData.countryCode.replace('+', '').length === 0) {
                            e.preventDefault()
                          }
                        }}
                        className="w-16 px-2 py-5 bg-transparent text-gray-300 focus:outline-none text-base border-0 flex-shrink-0 font-medium"
                        maxLength={4}
                        placeholder=""
                      />
                      <div className="w-px h-8 bg-gray-600/50 flex-shrink-0"></div>
                      <input
                        ref={phoneNumberInputRef}
                        type="text"
                        placeholder={getPhonePlaceholder() || "Введите номер телефона"}
                        value={formData.phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onKeyDown={handlePhoneKeyDown}
                        maxLength={(formData.country?.maxLength || 10) + 5}
                        className="flex-1 min-w-0 px-5 py-5 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-500/80">
                      Мы отправим SMS с кодом подтверждения на этот номер
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={checkingPhone || loading}
                      className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
                    >
                      {(checkingPhone || loading) ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {checkingPhone ? 'Проверка...' : 'Отправка кода...'}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Далее
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="relative group overflow-hidden bg-gradient-to-r from-gray-800 to-gray-700 text-white py-4 px-6 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-gray-700/30 border border-gray-600/30"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative flex items-center justify-center">
                        <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Шаг 2: Пароль */}
          {currentStep === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Пароль</label>
                  {formData.password.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {formData.password.length} символов
                    </span>
                  )}
                </div>
                <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${passwordError
                  ? 'border-red-500/60 bg-red-500/10 shadow-red-500/10'
                  : formData.password.length >= 6
                    ? 'border-green-500/60 bg-green-500/10 shadow-green-500/10'
                    : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
                  }`}
                >
                  <input
                    type="password"
                    name="password"
                    placeholder="Придумайте надежный пароль"
                    value={formData.password}
                    onChange={handleChange}
                    className="flex-1 min-w-0 px-5 py-5 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                  />
                  {formData.password.length >= 6 && !passwordError && (
                    <div className="absolute right-4">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {!passwordError && formData.password.length > 0 && formData.password.length < 6 && (
                  <p className="text-xs text-gray-500/80">
                    Пароль должен содержать минимум 6 символов
                  </p>
                )}
                {passwordError && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-300 leading-relaxed">{passwordError}</p>
                  </div>
                )}
                {!passwordError && formData.password.length >= 6 && (
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-green-300 font-medium leading-relaxed">Пароль соответствует требованиям</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 min-w-0">
                <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Подтвердите пароль</label>
                <div className={`relative flex items-center border-2 min-w-0 rounded-xl transition-all shadow-lg ${confirmPasswordError
                  ? 'border-red-500/60 bg-red-500/10 shadow-red-500/10'
                  : formData.confirmPassword && formData.confirmPassword === formData.password
                    ? 'border-green-500/60 bg-green-500/10 shadow-green-500/10'
                    : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
                  }`}
                >
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Введите пароль еще раз"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="flex-1 min-w-0 px-5 py-5 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                  />
                  {!confirmPasswordError && formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <div className="absolute right-4">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {confirmPasswordError && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-300 leading-relaxed">{confirmPasswordError}</p>
                  </div>
                )}
                {!confirmPasswordError && formData.confirmPassword && formData.confirmPassword === formData.password && (
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-green-300 font-medium leading-relaxed">Пароли совпадают</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
                >
                  <span className="flex items-center justify-center gap-2">
                    Далее
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="relative group overflow-hidden bg-gradient-to-r from-gray-800 to-gray-700 text-white py-4 px-6 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-gray-700/30 border border-gray-600/30"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center">
                    <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Шаг 3: Имя, фамилия, аватарка */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Avatar Section - Centered */}
              <div className="flex flex-col items-center gap-4 pb-6 border-b border-gray-700/30">
                <AvatarUpload
                  size={40}
                  onImageChange={(file) => {
                    setFormData({ ...formData, avatar: file })
                    if (!file) {
                      setAvatarError(null)
                    }
                  }}
                  onValidationError={(error) => {
                    setAvatarError(error)
                    if (error) {
                      setFormData(prev => ({ ...prev, avatar: null }))
                    }
                  }}
                  validationError={avatarError}
                />
                <p className="text-sm text-gray-500">Добавьте фото профиля</p>
              </div>

              {/* Name Fields Section - Two Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-3">
                  <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Имя</label>
                  <div className={`relative flex items-center border-2 rounded-xl transition-all shadow-lg ${firstNameError
                    ? 'border-red-500/60 bg-red-500/10 shadow-red-500/10'
                    : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
                    }`}>
                    <input
                      type="text"
                      name="first_name"
                      placeholder="Ваше имя"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="flex-1 px-5 py-4 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                    />
                  </div>
                  {firstNameError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {firstNameError}
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-3">
                  <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Фамилия</label>
                  <div className="relative flex items-center border-2 rounded-xl transition-all shadow-lg border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20">
                    <input
                      type="text"
                      name="last_name"
                      placeholder="Ваша фамилия"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="flex-1 px-5 py-4 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                    />
                  </div>
                  <p className="text-xs text-gray-500/70">Необязательное поле</p>
                </div>
              </div>

              {/* Username Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400 uppercase tracking-wider font-medium">Имя пользователя</label>
                  {formData.username.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {formData.username.length}/20
                    </span>
                  )}
                </div>
                <div className={`relative flex items-center border-2 rounded-xl transition-all shadow-lg ${usernameError
                  ? 'border-red-500/60 bg-red-500/10 shadow-red-500/10'
                  : usernameAvailable && formData.username.length >= 3
                    ? 'border-green-500/60 bg-green-500/10 shadow-green-500/10'
                    : 'border-gray-600/40 bg-white/5 hover:border-gray-600/60 hover:bg-white/10 focus-within:border-primary-500/60 focus-within:bg-primary-500/10 focus-within:shadow-primary-500/20'
                  }`}>
                  <div className="px-5 py-4 text-primary-400 text-xl font-bold select-none">@</div>
                  <div className="w-px h-8 bg-gray-600/50"></div>
                  <input
                    type="text"
                    name="username"
                    placeholder="выберите_уникальное_имя"
                    value={formData.username}
                    onChange={handleChange}
                    maxLength={20}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pastedText = e.clipboardData.getData('text').replace(/^@+/, '')
                      if (pastedText) {
                        const syntheticEvent = {
                          target: {
                            name: 'username',
                            value: pastedText,
                          },
                        } as React.ChangeEvent<HTMLInputElement>
                        handleChange(syntheticEvent)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '@') {
                        e.preventDefault()
                      }
                    }}
                    className="flex-1 px-5 py-4 bg-transparent text-white text-lg placeholder-gray-500/60 focus:outline-none border-0 font-medium"
                  />
                  {checkingUsername && (
                    <div className="absolute right-4">
                      <svg className="animate-spin h-5 w-5 text-primary-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                  {!checkingUsername && usernameAvailable && formData.username.length >= 3 && (
                    <div className="absolute right-4">
                      <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Status Messages */}
                {!usernameError && !usernameAvailable && (
                  <p className="text-xs text-gray-500/80">
                    Это имя будет отображаться в вашем профиле. Можно использовать буквы, цифры и подчеркивание.
                  </p>
                )}
                {usernameError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {usernameError}
                  </div>
                )}
                {!usernameError && usernameAvailable && formData.username.length >= 3 && (
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-xs text-green-300 font-medium">Отлично! Это имя доступно</p>
                      <p className="text-xs text-green-400/70 mt-0.5">Вы сможете изменить его позже в настройках</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Регистрация...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Создать аккаунт
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="relative group overflow-hidden bg-gradient-to-r from-gray-800 to-gray-700 text-white py-4 px-6 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-gray-700/30 border border-gray-600/30"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center">
                    <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Анимированные слоганы (только на первом шаге) */}
        {currentStep === 1 && (
          <div className="hidden xl:flex flex-1 items-center justify-center max-w-xl min-w-0 flex-shrink">
            <AnimatedSlogans />
          </div>
        )}
      </div>

      {/* Модальное окно для ввода пароля */}
      <PasswordModal
        phoneNumber={existingPhoneNumber}
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setExistingPhoneNumber('')
        }}
      />
      {/* Phone Confirmation Modal */}
      {showPhoneConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-6 bg-gray-900 border border-gray-800 shadow-xl transform transition-all scale-100 animate-fade-in-scale">
            <h3 className="text-xl font-bold mb-4 text-white text-center">Подтвердите номер</h3>
            <p className="text-gray-400 text-center mb-6 text-lg">
              {getFullPhoneNumber()}
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

export default SignUpPage
