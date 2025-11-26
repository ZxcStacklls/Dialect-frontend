import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLogoAnimation } from '../contexts/LogoAnimationContext'
import CountrySelector, { CIS_COUNTRIES, Country } from '../components/CountrySelector'
import AvatarUpload from '../components/AvatarUpload'
import PasswordModal from '../components/PasswordModal'
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
  
  const passwordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmPasswordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    }
  }, [logoPosition, isAnimating, setAnimating])

  // Если уже авторизован, перенаправляем на dashboard
  if (isAuthenticated) {
    navigate('/dashboard')
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
    if (!formData.country) return '000000000'
    
    const dialCode = formData.country.dialCode
    const maxLength = formData.country.maxLength
    
    // Placeholder в зависимости от страны
    if (dialCode === '+7') return '000 000 0000'
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
    
    // Форматирование для России и Казахстана (+7): XXX XXX-XX-XX
    if (dialCode === '+7' && digits.length > 0) {
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 6) {
        return `${digits.slice(0, 3)} ${digits.slice(3)}`
      } else {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
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
    
    // Для остальных стран - просто цифры без форматирования
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
    const formatted = formatPhoneNumber(value)
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
    if (!formData.password) {
      setError('Пароль обязателен')
      return false
    }
    
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return false
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return false
    }
    
    return true
  }

  const validateStep3 = (): boolean => {
    if (!formData.first_name.trim()) {
      setError('Имя обязательно')
      return false
    }
    
    if (!formData.username.trim()) {
      setError('Имя пользователя обязательно')
      return false
    }
    
    return true
  }

  const handleNext = async () => {
    setError('')
    
    if (currentStep === 1) {
      const isValid = await validateStep1()
      if (!isValid) return
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!validateStep2()) return
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    setError('')
    setPhoneExists(false)
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
      
      navigate('/dashboard')
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
      <div className="relative z-10 w-full flex items-center justify-start px-8 md:px-16 lg:px-24 py-16">
        <div className={`w-full max-w-2xl transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
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
              
              <div className="mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">START FOR FREE</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Создать новый аккаунт<span className="text-primary-500">.</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Уже есть аккаунт?{' '}
                <Link
                  to="/login"
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Войти
                </Link>
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
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
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


          {/* Шаг 1: Номер телефона */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Страна</label>
                <div className={countryJustChanged ? 'animate-country-select' : ''}>
                  <CountrySelector
                    selectedCountry={formData.country}
                    onCountryChange={handleCountryChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Номер телефона</label>
                <div className="relative flex items-center border-b-2 border-gray-600/50 focus-within:border-primary-500 transition-all">
                  <div className="px-3 py-5 text-gray-300 text-lg border-0 select-none">+</div>
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
                    className="w-20 px-2 py-5 bg-transparent text-gray-300 focus:outline-none text-lg border-0"
                    maxLength={4}
                    placeholder="7"
                  />
                  <div className="w-px h-8 bg-gray-600"></div>
                  <input
                    ref={phoneNumberInputRef}
                    type="text"
                    placeholder={getPhonePlaceholder()}
                    value={formData.phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onKeyDown={handlePhoneKeyDown}
                    maxLength={(formData.country?.maxLength || 10) + 5}
                    className="flex-1 px-4 py-5 bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none border-0"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-8 py-4 text-gray-400 hover:text-white transition-colors"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={checkingPhone}
                  className="flex-1 bg-primary-500 text-white py-4 px-8 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingPhone ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Проверка...
                    </span>
                  ) : (
                    'Далее'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Шаг 2: Пароль */}
          {currentStep === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Пароль</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Минимум 6 символов"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full px-6 py-5 bg-white/5 border-b-2 text-white text-lg placeholder-gray-500 focus:outline-none transition-all ${
                    passwordError
                      ? 'border-red-500'
                      : 'border-gray-600/50 focus:border-primary-500'
                  }`}
                />
                {passwordError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {passwordError}
                  </p>
                )}
                {!passwordError && formData.password.length > 0 && formData.password.length >= 6 && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Пароль соответствует требованиям
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Подтвердите пароль</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Повторите пароль"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full px-6 py-5 bg-white/5 border-b-2 text-white text-lg placeholder-gray-500 focus:outline-none transition-all ${
                    confirmPasswordError
                      ? 'border-red-500'
                      : formData.confirmPassword && formData.confirmPassword === formData.password
                      ? 'border-green-500'
                      : 'border-gray-600/50 focus:border-primary-500'
                  }`}
                />
                {confirmPasswordError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {confirmPasswordError}
                  </p>
                )}
                {!confirmPasswordError && formData.confirmPassword && formData.confirmPassword === formData.password && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Пароли совпадают
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-8 py-4 text-gray-400 hover:text-white transition-colors"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white py-4 px-8 rounded-lg font-semibold hover:bg-primary-600 transition-all"
                >
                  Далее
                </button>
              </div>
            </form>
          )}

          {/* Шаг 3: Имя, фамилия, аватарка */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <AvatarUpload
                onImageChange={(file) => setFormData({ ...formData, avatar: file })}
              />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-wider">Имя</label>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="Введите имя"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-6 py-5 bg-white/5 border-b-2 border-gray-600/50 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400 uppercase tracking-wider">Фамилия</label>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Введите фамилию"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-6 py-5 bg-white/5 border-b-2 border-gray-600/50 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider">Имя пользователя</label>
                <input
                  type="text"
                  name="username"
                  placeholder="ivan_user"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-6 py-5 bg-white/5 border-b-2 border-gray-600/50 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-all"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-8 py-4 text-gray-400 hover:text-white transition-colors"
                >
                  Назад
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
                      Регистрация...
                    </span>
                  ) : (
                    'Создать аккаунт'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
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
    </div>
  )
}

export default SignUpPage
