import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { useToast } from '../contexts/ToastContext'
import DefaultAvatar from '../components/DefaultAvatar'
import SettingsModal from '../components/SettingsModal'
import { getApiBaseUrl } from '../utils/platform'
import { canSendRequests, isOnline, isServerAvailable } from '../utils/appState'
import apiClient from '../api/client'

const formatChatTimestamp = (value?: string | number | Date | null): string | null => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const MessengerPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useAppearance()
  const { addToast } = useToast()
  const [selectedChat, setSelectedChat] = useState<number | null>(null)
  const [isOnlineState, setIsOnlineState] = useState(isOnline())
  const [chatsPanelWidth, setChatsPanelWidth] = useState(300)
  const [hoveredStatus, setHoveredStatus] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeNavItem, setActiveNavItem] = useState<string>('chats')
  const [avatarError, setAvatarError] = useState(false)
  const [indicatorPosition, setIndicatorPosition] = useState<number | null>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [wasMinimizedBeforeSearch, setWasMinimizedBeforeSearch] = useState(false)
  const [isProfileVisible, setIsProfileVisible] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeSearchTab, setActiveSearchTab] = useState<string>('users')
  const [hoveredUserStatus, setHoveredUserStatus] = useState<number | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsActiveTab, setSettingsActiveTab] = useState<string>('profile')
  const [isCompactCollapsing, setIsCompactCollapsing] = useState(false)
  const [isPanelAnimating, setIsPanelAnimating] = useState(false)
  
  // Определяем текущее расположение навигации
  const isNavBottom = settings.navPosition === 'bottom'
  const isNavRight = settings.navPosition === 'right'

  // Ref для доступа к актуальной ширине внутри обработчиков событий без пересоздания эффекта
  const chatsPanelWidthRef = useRef(chatsPanelWidth)
  useEffect(() => {
    chatsPanelWidthRef.current = chatsPanelWidth
  }, [chatsPanelWidth])

  // Автоматически выбирать иконку настроек при открытии окна настроек
  useEffect(() => {
    if (isSettingsOpen) {
      setActiveNavItem('settings')
    }
  }, [isSettingsOpen])

  // Обработчик закрытия окна настроек
  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
    setActiveNavItem('chats')
  }
  const chatsPanelRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTabsRef = useRef<HTMLDivElement>(null)
  const previousPanelWidthRef = useRef<number>(chatsPanelWidth)
  const compactAnimationTimeoutRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)
  const MIN_WIDTH = 80 
  const MAX_WIDTH = 500
  const COMPACT_WIDTH = 300
  const COLLAPSE_THRESHOLD = 150
  const EXPAND_THRESHOLD = 150
  const ANIMATION_DURATION = 300
  const NAV_SIZE = 80 // Размер навигационной панели (ширина или высота)

  // Функция для анимации ширины панели через комбинацию React state и ref
  const animatePanelWidth = (targetWidth: number) => {
    if (isAnimatingRef.current) return

    isAnimatingRef.current = true
    
    // Сначала включаем анимацию
    setIsPanelAnimating(true)
    
    // Затем обновляем ref для внутренней логики
    chatsPanelWidthRef.current = targetWidth
    
    // Обновляем state для UI - это запустит анимацию
    requestAnimationFrame(() => {
      setChatsPanelWidth(targetWidth)
    })

    // После завершения анимации отключаем transition
    setTimeout(() => {
      setIsPanelAnimating(false)
      isAnimatingRef.current = false
    }, ANIMATION_DURATION)
  }

  
  // Обработчики поиска
  const handleSearchIconClick = () => {
    setWasMinimizedBeforeSearch(true)
    setIsProfileVisible(false)
    setChatsPanelWidth(COMPACT_WIDTH)
    setIsSearchActive(true)
    setTimeout(() => searchInputRef.current?.focus(), 100)
  }

  const handleSearchFocus = () => {
    if (!isSearchActive) {
      setWasMinimizedBeforeSearch(false)
      setIsProfileVisible(false)
      setIsSearchActive(true)
    }
  }

  const handleSearchClose = () => {
    setIsSearchActive(false)
    setSearchQuery('')
    setSearchResults([])
    if (wasMinimizedBeforeSearch) {
      setIsProfileVisible(false)
      setChatsPanelWidth(MIN_WIDTH)
      setTimeout(() => {
        setIsProfileVisible(true)
        setWasMinimizedBeforeSearch(false)
      }, 350) 
    } else {
      setIsProfileVisible(true)
    }
  }

  // Поиск пользователей (буквальный поиск)
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await apiClient.get('/v1/users/search', {
        params: { q: query.trim() }
      })
      const allResults = response.data || []
      
      const queryLower = query.trim().toLowerCase()
      const filteredResults = allResults.filter((user: any) => {
        const username = (user.username || '').toLowerCase()
        const firstName = (user.first_name || '').toLowerCase()
        const lastName = (user.last_name || '').toLowerCase()
        const phoneNumber = (user.phone_number || '').replace(/\D/g, '') 
        const queryDigits = queryLower.replace(/\D/g, '')
        
        return (
          username.includes(queryLower) ||
          firstName.includes(queryLower) ||
          lastName.includes(queryLower) ||
          (queryDigits.length >= 3 && phoneNumber.includes(queryDigits))
        )
      })
      
      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Ошибка при поиске пользователей:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce для поиска
  useEffect(() => {
    if (!isSearchActive) return

    const timeoutId = setTimeout(() => {
      if (activeSearchTab === 'users') {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300) 

    return () => clearTimeout(timeoutId)
  }, [searchQuery, isSearchActive, activeSearchTab])

  const getAvatarUrl = (avatarUrl?: string | null): string | null => {
    if (!avatarUrl || avatarUrl.trim() === '') return null
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl
    }
    if (avatarUrl.startsWith('/static/')) {
      return avatarUrl
    }
    const apiBaseUrl = getApiBaseUrl()
    let baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '') 
    return `${baseUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const checkConnection = async () => {
      const online = isOnline()
      if (online) {
        const serverAvailable = await isServerAvailable()
        setIsOnlineState(serverAvailable)
      } else {
        setIsOnlineState(false)
      }
    }

    checkConnection()

    const interval = setInterval(checkConnection, 15000)
    
    const handleOnline = () => {
      setTimeout(checkConnection, 500)
    }
    const handleOffline = () => setIsOnlineState(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  useEffect(() => {
    const tabsContainer = searchTabsRef.current
    if (!tabsContainer) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        tabsContainer.scrollLeft += e.deltaX
      } else if (e.deltaY !== 0) {
        e.preventDefault()
        tabsContainer.scrollLeft += e.deltaY
      }
    }

    tabsContainer.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      tabsContainer.removeEventListener('wheel', handleWheel)
    }
  }, [isSearchActive])
  
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!canSendRequests()) {
        console.log('Пропуск обновления профиля: приложение не видно или нет интернета')
        return
      }

      try {
        await refreshUser()
      } catch (error) {
        console.error('Ошибка при автообновлении профиля:', error)
      }
    }, 10000) 

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && canSendRequests()) {
        refreshUser().catch(err => 
          console.error('Ошибка при обновлении профиля после возврата в фокус:', err)
        )
      }
    }

    const handleOnline = () => {
      if (canSendRequests()) {
        refreshUser().catch(err => 
          console.error('Ошибка при обновлении профиля после восстановления интернета:', err)
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const chats: any[] = []
  const hasChats = chats.length > 0
  const hasSelectedChat = selectedChat !== null
  
  const navItems = [
    { id: 'home', icon: 'home', label: 'Главная' },
    { id: 'groups', icon: 'groups', label: 'Группы' },
    { id: 'calls', icon: 'phone', label: 'Звонки' },
    { id: 'chats', icon: 'chat', label: 'Чаты' },
    { id: 'settings', icon: 'settings', label: 'Настройки' },
  ]
  
  // Вычисление позиции индикатора для анимации
  useEffect(() => {
    const activeIndex = navItems.findIndex(item => item.id === activeNavItem)
    if (activeIndex !== -1) {
      const BUTTON_SIZE = 48 // w-12 h-12
      const GAP = 16 // gap-4
      const INDICATOR_SIZE = 32 // размер индикатора (длина или высота в зависимости от ориентации)
      
      // Формула одинакова для X и Y, зависит только от ориентации контейнера
      const position = activeIndex * (BUTTON_SIZE + GAP) + BUTTON_SIZE / 2 - INDICATOR_SIZE / 2
      
      setIndicatorPosition(position)
    }
  }, [activeNavItem])

  // Обработка ресайза панели
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentWidth = chatsPanelWidthRef.current
      let newWidth = 0
      
      // Обновленная логика: Чаты всегда слева (кроме случая, если навигация слева, тогда они правее навигации)
      if (settings.navPosition === 'left') {
        newWidth = e.clientX - NAV_SIZE
      } else {
        // Если навигация Справа или Снизу, панель чатов начинается от левого края окна (0)
        // Поэтому ширина просто равна позиции мыши
        newWidth = e.clientX
      }
      
      // Направление движения для анимаций (теперь всегда одинаковое, так как чаты слева)
      let isDraggingExpanding = newWidth > currentWidth
      let isDraggingCollapsing = newWidth < currentWidth

      // Логика сворачивания
      if (isDraggingCollapsing && currentWidth > MIN_WIDTH && newWidth <= COLLAPSE_THRESHOLD) {
        animatePanelWidth(MIN_WIDTH)
        return
      }

      // Логика разворачивания
      if (isDraggingExpanding && currentWidth <= MIN_WIDTH && newWidth >= EXPAND_THRESHOLD) {
        animatePanelWidth(COMPACT_WIDTH)
        return
      }

      // Обычное изменение размера
      if (currentWidth > MIN_WIDTH && !isAnimatingRef.current) {
        let nextWidth = newWidth
        
        if (nextWidth < COMPACT_WIDTH) nextWidth = COMPACT_WIDTH
        if (nextWidth > MAX_WIDTH) nextWidth = MAX_WIDTH
        
        setChatsPanelWidth(nextWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [COLLAPSE_THRESHOLD, COMPACT_WIDTH, EXPAND_THRESHOLD, MAX_WIDTH, MIN_WIDTH, isResizing, animatePanelWidth, settings.navPosition, NAV_SIZE])

  useEffect(() => {
    const previousWidth = previousPanelWidthRef.current
    const wasMinimized = previousWidth <= MIN_WIDTH
    const isNowMinimized = chatsPanelWidth <= MIN_WIDTH
    
    if (!wasMinimized && isNowMinimized) {
      setIsCompactCollapsing(true)

      if (compactAnimationTimeoutRef.current) {
        window.clearTimeout(compactAnimationTimeoutRef.current)
      }

      compactAnimationTimeoutRef.current = window.setTimeout(() => {
        setIsCompactCollapsing(false)
        compactAnimationTimeoutRef.current = null
      }, 300)
    } else if (!isNowMinimized) {
      if (compactAnimationTimeoutRef.current) {
        window.clearTimeout(compactAnimationTimeoutRef.current)
        compactAnimationTimeoutRef.current = null
      }
      setIsCompactCollapsing(false)
    }

    previousPanelWidthRef.current = chatsPanelWidth
  }, [MIN_WIDTH, chatsPanelWidth])


  useEffect(() => {
    return () => {
      if (compactAnimationTimeoutRef.current) {
        window.clearTimeout(compactAnimationTimeoutRef.current)
        compactAnimationTimeoutRef.current = null
      }
    }
  }, [])

  const getIcon = (iconName: string) => {
    const iconClass = `w-6 h-6`
    switch (iconName) {
      case 'home':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      case 'groups':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case 'phone':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )
      case 'chat':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'settings':
        return (
          <svg className={iconClass} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const userStatus = user?.status_text || null
  const isMinimized = chatsPanelWidth <= MIN_WIDTH
  const isCompact = false 
  const avatarUrl = getAvatarUrl(user?.avatar_url)

  const isDark = theme === 'dark'

  const copyUsername = async (username: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    try {
      await navigator.clipboard.writeText(username)
      addToast(`Username @${username} скопирован`, 'success', 3000)
    } catch (error) {
      console.error('Ошибка при копировании username:', error)
      addToast('Не удалось скопировать username', 'error', 3000)
    }
  }
  
  return (
    <div className={`messenger-container flex h-full overflow-hidden select-none ${
      isDark 
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white'
        : 'bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-900'
    } ${
      // Flex direction: 
      // left -> row (Nav | Workspace)
      // right -> row-reverse (Workspace | Nav) -> Workspace keeps (Chats | Content)
      // bottom -> col-reverse (Workspace / Nav) -> Workspace keeps (Chats | Content)
      isNavBottom ? 'flex-col-reverse' : isNavRight ? 'flex-row-reverse' : 'flex-row'
    }`}>
      {/* Навигационная панель (теперь всегда первая в DOM для flex-reverse логики) */}
      <div className={`flex-shrink-0 flex transition-all duration-300 ease-in-out ${
        isNavBottom ? 'flex-row border-t h-20 w-full items-center justify-center' : 'flex-col w-20 h-full' 
      } ${
        isNavRight ? 'border-l' : (!isNavBottom ? 'border-r' : '')
      } ${
        isDark 
          ? 'border-gray-800/50 bg-gray-900/40'
          : 'border-gray-300/50 bg-gray-100/90'
      }`}>
        <div className={`flex items-center justify-center w-full h-full ${
           isNavBottom ? 'flex-row' : 'flex-col'
        }`}>
          <div className={`relative flex gap-4 ${
            isNavBottom ? 'flex-row' : 'flex-col'
          }`}>
            {/* Анимированный индикатор */}
            {indicatorPosition !== null && (
              <div
                className={`absolute bg-primary-500 transition-all duration-300 ease-out ${
                  isNavBottom 
                    ? 'bottom-[-14px] h-1 w-8 rounded-t-full left-0' // Снизу (горизонтально)
                    : `w-1 h-8 top-0 ${isNavRight ? 'right-[-14px] rounded-l-full' : 'left-[-14px] rounded-r-full'}` // Сбоку (вертикально)
                }`}
                style={{
                  transform: isNavBottom 
                    ? `translateX(${indicatorPosition}px)` 
                    : `translateY(${indicatorPosition}px)`,
                }}
              />
            )}
            
            {navItems.map((item) => {
              const isActive = activeNavItem === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNavItem(item.id)
                    if (item.id === 'settings') {
                      setIsSettingsOpen(true)
                    } else {
                      handleCloseSettings()
                    }
                  }}
                  className={`relative w-12 h-12 flex items-center justify-center transition-all duration-300 ease-out ${
                    isActive
                      ? 'text-primary-500 scale-105'
                      : isDark
                        ? 'text-gray-500 hover:text-primary-300 hover:bg-primary-500/10'
                        : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/10'
                  }`}
                  style={{ 
                    borderRadius: `var(--border-radius, 0.75rem)`,
                    fontSize: `calc(1rem * var(--font-scale, 1))`
                  }}
                  title={item.label}
                >
                  {getIcon(item.icon)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* WRAPPER для Чатов и Контента. 
        Он всегда flex-row, чтобы чаты и контент оставались в ряд (Чаты слева, Контент справа), 
        даже если навигация переместилась вниз или вправо.
      */}
      <div className="flex-1 flex overflow-hidden relative h-full flex-row">
        
        {/* Панель с чатами (масштабируемая) */}
        <div
          ref={chatsPanelRef}
          className={`relative flex flex-col overflow-hidden border-r ${
            isDark ? 'border-gray-800/50 bg-gray-900/40' : 'border-gray-300/50 bg-white/90'
          }`}
            style={{
            width: `${chatsPanelWidth}px`,
            transition: isPanelAnimating ? `width ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none'
          }}
        >
          {/* ... [Весь контент панели чатов без изменений] ... */}
          {/* Блок профиля пользователя */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              (isSearchActive && !isMinimized) || (!isProfileVisible && !isMinimized) ? 'opacity-0 max-h-0 m-0 p-0 overflow-hidden' : 'opacity-100 max-h-[200px] overflow-visible'
            }`}
          >
            <div className="mt-3 mb-1 flex-shrink-0">
              <div className="flex items-center py-2 pl-5 pr-3">
                <div 
                  className="relative flex-shrink-0 w-10 h-10 cursor-pointer"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <div className={`relative w-full h-full rounded-full overflow-hidden border-2 ${
                    isOnlineState ? 'border-green-500/60' : 'border-gray-600/40'
                  }`}>
                    {user?.avatar_url && avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={`${user?.first_name} ${user?.last_name || ''}`}
                        className="w-full h-full"
                        style={{ 
                          objectFit: 'cover',
                          objectPosition: 'center',
                          width: '100%',
                          height: '100%',
                          display: 'block',
                          aspectRatio: '1/1'
                        }}
                        onError={() => {
                          console.error('Ошибка загрузки аватарки:', avatarUrl)
                          setAvatarError(true)
                        }}
                        onLoad={() => {
                          setAvatarError(false)
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-600 rounded-full">
                        <DefaultAvatar
                          firstName={user?.first_name || 'П'}
                          lastName={user?.last_name}
                          size={40}
                          className="border-0"
                        />
                      </div>
                    )}
                  </div>
                  {/* Индикатор онлайн */}
                  <div 
                    className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${
                      isOnlineState 
                        ? 'bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_0_4px_rgba(34,197,94,0.6)]' 
                        : 'bg-gray-500 border border-white/50 shadow-[0_0_0_2px_rgba(0,0,0,0.8)]'
                    }`}
                    style={{ 
                      zIndex: 20,
                      opacity: isMinimized ? 0 : 1,
                      transform: isMinimized ? 'scale(0)' : 'scale(1)'
                    }}
                  ></div>
                </div>
                <div 
                  className={`flex-1 min-w-0 cursor-pointer transition-all duration-300 ease-in-out overflow-hidden ${
                    isMinimized ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto ml-3'
                  }`}
                  onClick={() => setIsSettingsOpen(true)}
                >
                    <div className={`font-semibold text-sm truncate mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user?.first_name || 'Пользователь'} {user?.last_name || ''}
                    </div>
                    <div
                      className="relative h-4 overflow-hidden"
                      onMouseEnter={() => setHoveredStatus(true)}
                      onMouseLeave={() => setHoveredStatus(false)}
                    >
                      {!isOnlineState ? (
                        <div className={`text-xs truncate flex items-center gap-1 ${
                          isDark ? 'text-primary-400' : 'text-primary-500'
                        }`}>
                          <span>Connecting</span>
                          <span className="flex gap-0.5">
                            <span className="connecting-dot">.</span>
                            <span className="connecting-dot">.</span>
                            <span className="connecting-dot">.</span>
                          </span>
                        </div>
                      ) : userStatus ? (
                        <>
                          {/* Статус */}
                          <div 
                            className={`text-xs truncate cursor-pointer transition-all duration-300 absolute inset-0 ${
                              isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            style={{
                              transform: hoveredStatus ? 'translateY(-100%)' : 'translateY(0)',
                              opacity: hoveredStatus ? 0 : 1
                            }}
                          >
                            {userStatus}
                          </div>
                          {/* Username */}
                          {user?.username && (
                            <div 
                              className="text-primary-500 text-xs truncate transition-all duration-300 absolute inset-0 cursor-pointer hover:text-primary-400"
                              style={{
                                transform: hoveredStatus ? 'translateY(0)' : 'translateY(100%)',
                                opacity: hoveredStatus ? 1 : 0
                              }}
                              onClick={(e) => copyUsername(user.username!, e)}
                              title="Нажмите, чтобы скопировать username"
                            >
                              @{user.username}
                            </div>
                          )}
                        </>
                      ) : (
                        user?.username && (
                          <div 
                            className={`text-xs truncate cursor-pointer hover:text-primary-500 transition-colors ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                            onClick={(e) => copyUsername(user.username!, e)}
                            title="Нажмите, чтобы скопировать username"
                          >
                            @{user.username}
                          </div>
                        )
                      )}
                    </div>
                </div>
                {!isMinimized && (
                  <div className="relative z-50 flex-shrink-0" ref={profileMenuRef}>
                    <button 
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={`transition-colors flex-shrink-0 p-1.5 rounded-lg ${
                        isDark
                          ? `text-gray-500 hover:text-primary-300 hover:bg-primary-500/10 ${isProfileMenuOpen ? 'text-primary-400 bg-primary-500/10' : ''}`
                          : `text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 ${isProfileMenuOpen ? 'text-primary-500 bg-primary-500/10' : ''}`
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    
                    {/* Выпадающее меню */}
                    {isProfileMenuOpen && (
                      <div className={`absolute right-0 top-full mt-2 w-48 backdrop-blur-xl rounded-xl shadow-xl z-[100] overflow-hidden animate-fade-in ${
                        isDark
                          ? 'bg-gray-900/95 border border-gray-800/50'
                          : 'bg-white/95 border border-gray-200/50'
                      }`}>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setIsSettingsOpen(true)
                              setIsProfileMenuOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                              isDark
                                ? 'text-gray-300 hover:bg-white/5'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Редактировать профиль
                          </button>
                          <div className={`border-t my-1 ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}></div>
                          <button
                            onClick={() => {
                              toggleTheme()
                              setIsProfileMenuOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                              isDark
                                ? 'text-gray-300 hover:bg-white/5'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {theme === 'dark' ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Светлая тема
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                Темная тема
                              </>
                            )}
                          </button>
                          <div className={`border-t my-1 ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}></div>
                          <button
                            onClick={() => {
                              logout()
                              setIsProfileMenuOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                              isDark
                                ? 'text-red-400 hover:bg-white/5 hover:text-red-300'
                                : 'text-red-500 hover:bg-red-50 hover:text-red-600'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Выйти
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Разделительная линия между профилем и поиском */}
            <div className={`mx-4 border-t my-1 ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}></div>
          </div>

          {/* Блок поиска */}
          {isMinimized ? (
            <div className="mx-4 mt-3 mb-2 flex items-center justify-center flex-shrink-0">
              <button
                onClick={handleSearchIconClick}
                className={`transition-colors p-2 ${
                  isDark ? 'text-gray-500 hover:text-primary-300' : 'text-gray-400 hover:text-primary-500'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className={`mx-4 px-3 py-2 flex-shrink-0 transition-all duration-300 ease-in-out relative z-10 ${
              isSearchActive ? 'mt-3 mb-2' : 'mt-1 mb-2'
            }`}>
              <div className="flex items-center gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Поиск"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  className={`flex-1 px-4 py-2 border-2 rounded-xl text-sm placeholder-gray-500/60 focus:outline-none focus:border-primary-500/60 focus:bg-primary-500/10 transition-all shadow-lg select-text ${
                    isDark
                      ? 'bg-gray-800/30 border-gray-700/40 text-white'
                      : 'bg-white border-gray-300/60 text-gray-900'
                  }`}
                />
                {isSearchActive && (
                  <button
                    onClick={handleSearchClose}
                    className={`p-1.5 rounded-lg transition-all ${
                      isDark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Разделительная линия после поиска */}
          <div className={`mx-4 border-t mb-2 transition-opacity duration-300 ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}></div>

          {/* Вкладки для поиска */}
          {!isMinimized && isSearchActive && (
            <div className={`mx-4 mb-2 border-b ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}>
              <div 
                ref={searchTabsRef}
                className="flex gap-1 overflow-x-auto scrollbar-hide"
              >
                {[
                  { id: 'users', label: 'Users' },
                  { id: 'chats', label: 'Chats' },
                  { id: 'channels', label: 'Channels' },
                  { id: 'groups', label: 'Groups' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSearchTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative flex-shrink-0 ${
                      activeSearchTab === tab.id
                        ? isDark
                          ? 'text-primary-400'
                          : 'text-primary-500'
                        : isDark
                          ? 'text-gray-500 hover:text-gray-300'
                          : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {activeSearchTab === tab.id && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                        isDark ? 'bg-primary-400' : 'bg-primary-500'
                      }`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Контент панели чатов */}
          {!isMinimized && (
            <>
              {/* Блок результатов поиска или списка чатов */}
              <div className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out chat-panel-scrollbar ${isDark ? 'bg-gray-900/20' : 'bg-gray-50/30'}`}>
                <div className="py-2 transition-all duration-300 ease-in-out">
                  {isSearchActive ? (
                    activeSearchTab === 'users' ? (
                      <>
                        {isSearching ? (
                          <div className="flex items-center justify-center py-8">
                            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              Поиск...
                            </div>
                          </div>
                        ) : searchQuery.trim() ? (
                          searchResults.length > 0 ? (
                            searchResults.map((foundUser: any) => {
                              const foundUserAvatarUrl = getAvatarUrl(foundUser.avatar_url)
                              return (
                                <button
                                  key={foundUser.id}
                                  className={`w-full px-6 py-3 transition-colors text-left ${
                                    isDark 
                                      ? 'hover:bg-primary-500/10' 
                                      : 'hover:bg-primary-500/5'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0 w-12 h-12">
                                      <div className={`relative w-full h-full rounded-full overflow-hidden border-2 ${
                                        foundUser.is_online ? 'border-green-500/60' : 'border-gray-600/40'
                                      }`}>
                                        {foundUser.avatar_url && foundUserAvatarUrl ? (
                                          <img
                                            src={foundUserAvatarUrl}
                                            alt={`${foundUser.first_name} ${foundUser.last_name || ''}`}
                                            className="w-full h-full"
                                            style={{ 
                                              objectFit: 'cover',
                                              objectPosition: 'center',
                                              width: '100%',
                                              height: '100%',
                                              display: 'block',
                                              aspectRatio: '1/1'
                                            }}
                                          />
                                        ) : (
                                          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-600 rounded-full">
                                            <DefaultAvatar
                                              firstName={foundUser.first_name || 'П'}
                                              lastName={foundUser.last_name}
                                              size={48}
                                              className="border-0"
                                            />
                                          </div>
                                        )}
                                      </div>
                                      <div 
                                        className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${
                                          foundUser.is_online 
                                            ? 'bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_0_4px_rgba(34,197,94,0.6)]' 
                                            : 'bg-gray-500 border border-white/50 shadow-[0_0_0_2px_rgba(0,0,0,0.8)]'
                                        }`}
                                        style={{ zIndex: 20 }}
                                      ></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-semibold text-sm truncate mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {foundUser.first_name || 'Пользователь'} {foundUser.last_name || ''}
                                      </div>
                                      <div
                                        className="relative h-4 overflow-hidden"
                                        onMouseEnter={() => setHoveredUserStatus(foundUser.id)}
                                        onMouseLeave={() => setHoveredUserStatus(null)}
                                      >
                                        {foundUser.status_text ? (
                                          <>
                                            {/* Username */}
                                            {foundUser.username && (
                                              <div 
                                                className="text-primary-500 text-xs truncate transition-all duration-300 absolute inset-0 cursor-pointer hover:text-primary-400"
                                                style={{
                                                  transform: hoveredUserStatus === foundUser.id ? 'translateY(-100%)' : 'translateY(0)',
                                                  opacity: hoveredUserStatus === foundUser.id ? 0 : 1
                                                }}
                                                onClick={(e) => copyUsername(foundUser.username, e)}
                                                title="Нажмите, чтобы скопировать username"
                                              >
                                                @{foundUser.username}
                                              </div>
                                            )}
                                            {/* Статус */}
                                            <div 
                                              className={`text-xs truncate cursor-pointer transition-all duration-300 absolute inset-0 ${
                                                isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                              }`}
                                              style={{
                                                transform: hoveredUserStatus === foundUser.id ? 'translateY(0)' : 'translateY(100%)',
                                                opacity: hoveredUserStatus === foundUser.id ? 1 : 0
                                              }}
                                            >
                                              {foundUser.status_text}
                                            </div>
                                          </>
                                        ) : foundUser.username ? (
                                          <div 
                                            className={`text-xs truncate cursor-pointer hover:text-primary-500 transition-colors ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                                            onClick={(e) => copyUsername(foundUser.username, e)}
                                            title="Нажмите, чтобы скопировать username"
                                          >
                                            @{foundUser.username}
                                          </div>
                                        ) : (
                                          <div className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            {foundUser.phone_number || ''}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              )
                            })
                          ) : (
                            <div className="flex items-center justify-center min-h-[calc(100vh-300px)] w-full">
                              <div className="flex flex-col items-center justify-center text-center">
                                <div className="mb-3 flex items-center justify-center">
                                  <svg
                                    className="w-16 h-16 text-gray-600 transition-all duration-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                  </svg>
                                </div>
                                <p className={`text-sm transition-opacity duration-300 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                  Ничего не найдено
                                </p>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center min-h-[calc(100vh-300px)] w-full">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="mb-3 flex items-center justify-center">
                                <svg
                                  className="w-16 h-16 text-gray-600 transition-all duration-300"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                              </div>
                              <p className={`text-sm transition-opacity duration-300 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                Введите запрос для поиска
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-center min-h-[calc(100vh-300px)] w-full">
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className={`text-sm transition-opacity duration-300 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            Вкладка &quot;{activeSearchTab}&quot; пока не реализована
                          </p>
                        </div>
                      </div>
                    )
                  ) : chats.length > 0 ? (
                    chats.map((_chat, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedChat(index)}
                        className={`w-full ${isCompact ? 'px-3 py-2' : 'px-6 py-3'} transition-all duration-300 ease-in-out text-left ${
                          isDark 
                            ? 'hover:bg-primary-500/10' 
                            : 'hover:bg-primary-500/5'
                        }`}
                      >
                        <div className={`flex items-center transition-all duration-300 ease-in-out ${isCompact ? 'gap-2' : 'gap-3'}`}>
                          <div className="relative">
                            <div className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full border-2 flex-shrink-0 transition-all duration-300 ease-in-out ${
                              isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-200/80 border-gray-300/60'
                            }`} />
                            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.8),0_0_3px_rgba(34,197,94,0.5)] transition-all duration-300 ease-in-out"></div>
                          </div>
                          <div 
                            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
                              isCompact || isCompactCollapsing 
                                ? 'opacity-0 max-w-0 overflow-hidden' 
                                : 'opacity-100 max-w-full'
                            }`}
                          >
                            <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Чат {index + 1}</div>
                            <div className={`text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Последнее сообщение...</div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex items-center justify-center min-h-[calc(100vh-300px)] w-full">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="mb-3 flex items-center justify-center">
                          <svg
                            className="w-16 h-16 text-gray-600 transition-all duration-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </div>
                        <p className={`text-sm transition-opacity duration-300 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Нет чатов</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Минимальный вид - только аватарки чатов */}
          {isMinimized && (
            <div className={`flex-1 flex flex-col items-center py-2 gap-3 overflow-y-auto chat-panel-scrollbar`}>
              {chats.length > 0 ? (
                chats.slice(0, 8).map((_chat, index) => (
                  <div key={index} className="relative">
                    <div className={`w-10 h-10 rounded-full border-2 ${
                      isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-200/80 border-gray-300/60'
                    }`}></div>
                    <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.8),0_0_3px_rgba(34,197,94,0.5)]"></div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 w-full">
                  <div className="flex items-center justify-center mb-2">
                    <svg
                      className="w-12 h-12 text-gray-600 transition-all duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Разделитель для ресайза */}
          <div
            className={`absolute top-0 w-1 h-full cursor-col-resize z-20 group ${
              // Ручка ресайза всегда справа от панели чатов
              'right-0'
            }`}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsResizing(true)
            }}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Переключаем между свернутым и развернутым состоянием
              if (chatsPanelWidth <= MIN_WIDTH) {
                animatePanelWidth(COMPACT_WIDTH)
              } else {
                animatePanelWidth(MIN_WIDTH)
              }
            }}
          >
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 w-1 h-20 transition-all rounded-l-full ${
              isDark 
                ? 'bg-gray-700/30 group-hover:bg-primary-500/70'
                : 'bg-gray-300/50 group-hover:bg-primary-500/70'
            }`} />
          </div>
        </div>

        {/* Центральная область - чат, пустое состояние */}
        <div className={`flex-1 flex items-center justify-center relative ${isDark ? 'bg-gray-950/50' : 'bg-gray-100/50'}`}>
          {hasSelectedChat ? (
            // TODO: Область открытого чата
            <div className="text-center">
              <p className={isDark ? 'text-gray-500' : 'text-gray-500'}>Чат открыт</p>
            </div>
          ) : hasChats ? (
            // Есть чаты, но ни один не выбран
            <div className="text-center px-8">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <svg
                    className={`w-24 h-24 mx-auto ${isDark ? 'text-gray-700' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Выберите чат
                </h2>
                <p className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Выберите чат, чтобы начать общаться
                </p>
              </div>
            </div>
          ) : (
            // Нет чатов - показываем кнопку "Найти друзей"
            <div className="text-center px-8">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <svg
                    className={`w-24 h-24 mx-auto ${isDark ? 'text-gray-700' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className={`text-2xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Начните общение
                </h2>
                <p className={`text-lg mb-6 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  У вас пока нет чатов. Найдите друзей и начните общаться, чтобы делиться моментами и обмениваться сообщениями.
                </p>
                <button
                  onClick={() => {
                    if (isMinimized) {
                      setWasMinimizedBeforeSearch(true)
                      setChatsPanelWidth(COMPACT_WIDTH)
                    } else {
                      setWasMinimizedBeforeSearch(false)
                    }
                    setIsProfileVisible(false)
                    setIsSearchActive(true)
                    setTimeout(() => searchInputRef.current?.focus(), 300)
                  }}
                  className="px-8 py-3 bg-primary-500 hover:bg-primary-400 rounded-lg transition-colors text-white font-semibold text-base shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50"
                >
                  Найти друзей
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно настроек */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        activeTab={settingsActiveTab}
        onTabChange={setSettingsActiveTab}
      />
    </div>
  )
}

export default MessengerPage