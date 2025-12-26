import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'
import { useToast } from '../contexts/ToastContext'
import { useTitleBar } from '../contexts/TitleBarContext'
import DefaultAvatar from '../components/DefaultAvatar'
import SettingsModal from '../components/SettingsModal'
import CreateChatModal from '../components/CreateChatModal'
import UserContextMenu from '../components/UserContextMenu'
import { getApiBaseUrl } from '../utils/platform'
import { canSendRequests, isOnline, isServerAvailable } from '../utils/appState'
import apiClient from '../api/client'
import { fetchChats, createPrivateChat, findExistingPrivateChat, Chat, ChatParticipant } from '../api/chats'
import ChatContextMenu from '../components/ChatContextMenu'
import ChatInterface from '../components/ChatInterface'

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
  const { user, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { settings } = useAppearance()
  const { addToast } = useToast()
  const { setCurrentTab } = useTitleBar()
  const [selectedChat, setSelectedChat] = useState<number | null>(null)
  // Initial state is true (optimistic) to avoid "Connecting..." flash
  const [isOnlineState, setIsOnlineState] = useState(navigator.onLine)
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

  // Состояние для чатов
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const cached = localStorage.getItem('cached_chats')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [isLoadingChats, setIsLoadingChats] = useState(() => {
    // Если есть кеш, не показываем лоадер (или показываем только фоновое обновление)
    // Но для UX лучше показать лоадер ненадолго, или если кеша нет
    return !localStorage.getItem('cached_chats')
  })
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false)

  // Состояние для контекстного меню чата
  const [chatContextMenu, setChatContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    chatId: number | null
    chatName?: string
  }>({ isOpen: false, x: 0, y: 0, chatId: null, chatName: undefined })

  // Состояние для контекстного меню
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    user: any | null
  }>({ isOpen: false, x: 0, y: 0, user: null })

  // Ref для кнопок навигации
  const navButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Определяем стиль дизайна и расположение навигации
  const isModern = settings.designStyle === 'modern'
  const isNavBottom = settings.navPosition === 'bottom'
  const isNavRight = settings.navPosition === 'right'
  const isChatsRight = settings.chatsPosition === 'right'

  // Ref для доступа к актуальной ширине внутри обработчиков событий без пересоздания эффекта
  const chatsPanelWidthRef = useRef(chatsPanelWidth)
  useEffect(() => {
    chatsPanelWidthRef.current = chatsPanelWidth
  }, [chatsPanelWidth])

  // Автоматически выбирать иконку настроек при открытии окна настроек
  useEffect(() => {
    if (isSettingsOpen) {
      setActiveNavItem('settings')
      setCurrentTab('settings')
    }
  }, [isSettingsOpen, setCurrentTab])

  // Обработчик закрытия окна настроек
  const handleCloseSettings = () => {
    setIsSettingsOpen(false)
    setActiveNavItem('chats')
    setCurrentTab('chats')
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

    const interval = setInterval(checkConnection, 5000)

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

  // Загрузка чатов
  const loadChats = useCallback(async () => {
    if (!canSendRequests()) return

    try {
      const loadedChats = await fetchChats()
      setChats(loadedChats)
      localStorage.setItem('cached_chats', JSON.stringify(loadedChats))
    } catch (error) {
      console.error('Ошибка при загрузке чатов:', error)
    } finally {
      setIsLoadingChats(false)
    }
  }, [])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  // Global WebSocket for Real-time Updates (Chat List & Global Events)
  useEffect(() => {
    // We can use the token from the hook since this component is wrapped in AuthProvider
    // But we need to use a ref or ensure we don't reconnect constantly if token object reference changes (rare for string).
    // Let's use localStorage for stability in this effect or just the prop if it's stable.
    const storedToken = localStorage.getItem('access_token') // use access_token key as defined in AuthContext
    if (!storedToken) return

    // Construct WS URL based on API Base URL
    const apiBase = getApiBaseUrl().replace(/^http/, 'ws')
    const wsUrl = `${apiBase}/v1/messages/ws?token=${storedToken}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Global WS Connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'new_message') {
          // Update Chat List
          setChats(prevChats => {
            const chatIndex = prevChats.findIndex(c => c.id === data.chat_id)

            // Если чат уже есть в списке
            if (chatIndex !== -1) {
              const updatedChat = { ...prevChats[chatIndex] }
              updatedChat.last_message = {
                content: data.content,
                sent_at: data.sent_at,
                sender_id: data.sender_id // Important for "You:" prefix
              }
              // Увеличиваем счетчик, если чат не открыт прямо сейчас
              if (selectedChat !== data.chat_id) {
                updatedChat.unread_count = (updatedChat.unread_count || 0) + 1
              }

              // Перемещаем чат наверх
              const newChats = [...prevChats]
              newChats.splice(chatIndex, 1)
              return [updatedChat, ...newChats]
            } else {
              // Новый чат - загружаем список заново
              loadChats()
              return prevChats
            }
          })
        } else if (data.type === 'chat_deleted') {
          // Remove chat from list
          setChats(prev => prev.filter(c => c.id !== data.chat_id))

          // If this chat was open, close it (deselect)
          if (selectedChat === data.chat_id) {
            const isPrivateDelete = !data.for_everyone
            // If I deleted it for myself, definitely close.
            // If someone else deleted it 'for everyone', also close.
            // In both cases, the chat is gone for me.
            setSelectedChat(null)
          }
        } else if (data.type === 'chat_history_cleared') {
          // If history cleared, update last message in list to empty/null
          setChats(prev => prev.map(c => {
            if (c.id === data.chat_id) {
              return { ...c, last_message: undefined, unread_count: 0 }
            }
            return c
          }))

          // If open, we might want to clear messages... 
          // but ChatInterface should handle its own "clear" event if it has a separate WS connection on the chat?
          // Actually, the global WS event is good enough to reload or clear.
          // Ideally ChatInterface also listens to this or we emit an event.
          // Since ChatInterface connects to /messages/ws, it doesn't receive this CHAT level event.
          // BUT, we changed backend to send to 'user_id' via manager. 
          // Since manager sends to ALL connections of user, ChatInterface WILL receive this event too.
        } else if (data.type === 'user_status') {
          // --- REAL-TIME ONLINE STATUS UPDATE ---
          const { user_id, is_online } = data

          setChats(prevChats => {
            return prevChats.map(chat => {
              // Ищем участника в чате
              const updatedParticipants = chat.participants.map(p => {
                if (p.id === user_id) {
                  return { ...p, is_online: is_online }
                }
                return p
              })

              // Проверяем, изменилось ли что-то (чтобы не триггерить ре-рендер лишний раз)
              const hasChanged = chat.participants.some((p, index) => p.is_online !== updatedParticipants[index].is_online)

              if (hasChanged) {
                return { ...chat, participants: updatedParticipants }
              }
              return chat
            })
          })
        }
      } catch (error) {
        console.error('Global WS Error:', error)
      }
    }

    ws.onclose = () => {
      console.log('Global WS Disconnected')
    }

    return () => {
      ws.close()
    }
  }, [selectedChat, loadChats])

  // Обработчик создания/открытия чата с пользователем
  const handleStartChat = async (userId: number) => {
    try {
      // Проверяем, есть ли уже чат с этим пользователем
      const existingChat = findExistingPrivateChat(chats, userId)

      if (existingChat) {
        // Открываем существующий чат
        setSelectedChat(existingChat.id)
      } else {
        // Создаем новый чат
        const newChat = await createPrivateChat(userId)
        setChats(prev => [newChat, ...prev])
        setSelectedChat(newChat.id)
      }

      // Закрываем поиск и модальное окно
      handleSearchClose()
      setIsCreateChatOpen(false)
      setActiveNavItem('chats')

    } catch (error) {
      console.error('Ошибка при создании чата:', error)
      addToast('Не удалось создать чат', 'error', 3000)
    }
  }

  // Обработчик контекстного меню
  const handleContextMenu = (e: React.MouseEvent, user: any) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      user
    })
  }

  const handleChatContextMenu = (e: React.MouseEvent, chatId: number, chatName?: string) => {
    e.preventDefault()
    e.stopPropagation()
    setChatContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      chatId,
      chatName
    })
  }

  // This is called AFTER successful deletion from ChatContextMenu
  const handleDeleteChat = (chatId: number) => {
    setChats(prev => prev.filter(c => c.id !== chatId))
    if (selectedChat === chatId) {
      setSelectedChat(null)
    }
    // Success toast is shown by context menu or we can show it here if context menu doesn't
    addToast('Чат удален', 'success')
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, user: null })
  }

  const hasChats = chats.length > 0
  const hasSelectedChat = selectedChat !== null

  const navItems = [
    { id: 'home', icon: 'home', label: 'Главная' },
    { id: 'groups', icon: 'groups', label: 'Группы' },
    { id: 'calls', icon: 'phone', label: 'Звонки' },
    { id: 'chats', icon: 'chat', label: 'Чаты' },
    { id: 'settings', icon: 'settings', label: 'Настройки' },
  ]

  // Функция для расчета позиции индикатора на основе реальных позиций кнопок
  const calculateIndicatorPosition = React.useCallback(() => {
    const activeButton = navButtonRefs.current[activeNavItem]
    if (activeButton && !isModern) {
      const container = activeButton.parentElement
      if (container) {
        const buttonRect = activeButton.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        if (isNavBottom) {
          // Горизонтальная навигация (снизу)
          const relativeLeft = buttonRect.left - containerRect.left + container.scrollLeft
          const INDICATOR_WIDTH = 32 // w-8 = 32px
          const BUTTON_WIDTH = buttonRect.width
          const centerOffset = (BUTTON_WIDTH - INDICATOR_WIDTH) / 2
          setIndicatorPosition(relativeLeft + centerOffset)
        } else {
          // Вертикальная навигация (слева/справа)
          const relativeTop = buttonRect.top - containerRect.top + container.scrollTop
          const INDICATOR_HEIGHT = 32 // h-8 = 32px
          const BUTTON_HEIGHT = buttonRect.height
          const centerOffset = (BUTTON_HEIGHT - INDICATOR_HEIGHT) / 2
          setIndicatorPosition(relativeTop + centerOffset)
        }
      }
    }
  }, [activeNavItem, isModern, isNavBottom])

  // Вычисление позиции индикатора для анимации
  useEffect(() => {
    if (isModern) {
      setIndicatorPosition(null)
      return
    }

    // Добавляем небольшую задержку для полного рендера DOM
    const timeoutId = setTimeout(() => {
      calculateIndicatorPosition()
    }, 10)

    return () => clearTimeout(timeoutId)
  }, [activeNavItem, isModern, calculateIndicatorPosition])

  // Пересчет позиции при прокрутке и изменении размера окна
  useEffect(() => {
    if (isModern) return

    const activeButton = navButtonRefs.current[activeNavItem]
    if (!activeButton) return

    const container = activeButton.parentElement
    if (!container) return

    const handleScroll = () => {
      calculateIndicatorPosition()
    }

    const handleResize = () => {
      calculateIndicatorPosition()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [activeNavItem, isModern, calculateIndicatorPosition])

  // Обработка ресайза панели
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentWidth = chatsPanelWidthRef.current
      let newWidth = 0

      if (isChatsRight) {
        // Панель чатов справа: resize handle слева от панели (на границе с контентом)
        // Ширина = расстояние от правого края окна до курсора
        const windowWidth = window.innerWidth
        if (settings.navPosition === 'right') {
          // Если навигация справа, панель чатов между навигацией и контентом
          newWidth = windowWidth - e.clientX - NAV_SIZE
        } else if (settings.navPosition === 'left') {
          // Если навигация слева, панель чатов справа от контента
          newWidth = windowWidth - e.clientX
        } else {
          // Навигация снизу
          newWidth = windowWidth - e.clientX
        }
      } else {
        // Панель чатов слева: resize handle справа от панели (на границе с контентом)
        if (settings.navPosition === 'left') {
          newWidth = e.clientX - NAV_SIZE
        } else {
          // Если навигация Справа или Снизу, панель чатов начинается от левого края окна (0)
          newWidth = e.clientX
        }
      }

      // Направление движения для анимаций
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
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [COLLAPSE_THRESHOLD, COMPACT_WIDTH, EXPAND_THRESHOLD, MAX_WIDTH, MIN_WIDTH, isResizing, animatePanelWidth, settings.navPosition, NAV_SIZE, isChatsRight])

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
  const isCompact = isMinimized // Совпадает с isMinimized для одинакового поведения с профилем
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
      // Flex direction: 
      // left -> row (Nav | Workspace)
      // right -> row-reverse (Workspace | Nav) -> Workspace keeps (Chats | Content)
      // bottom -> col-reverse (Workspace / Nav) -> Workspace keeps (Chats | Content)
      isNavBottom ? 'flex-col-reverse' : isNavRight ? 'flex-row-reverse' : 'flex-row'
      }`}>
      {/* Навигационная панель - в цвет titlebar */}
      <div className={`nav-panel flex-shrink-0 flex ${isNavBottom ? 'flex-row h-16 w-full items-center justify-center' : 'flex-col w-[72px] h-full'
        } ${isModern ? 'liquid-nav' : ''
        }`}>
        <div className={`flex items-center justify-center w-full h-full ${isNavBottom ? 'flex-row' : 'flex-col'
          }`}>
          {/* Liquid Glass Container для Modern стиля */}
          <div className={`relative flex gap-2 ${isNavBottom ? 'flex-row' : 'flex-col'
            } ${isModern ? `liquid-nav-container ${isNavBottom ? 'horizontal' : ''}` : ''
            }`}>
            {/* Анимированный индикатор (только для не-modern стиля) */}
            {!isModern && indicatorPosition !== null && (
              <div
                className={`absolute transition-all duration-300 ease-out bg-primary-500 ${isNavBottom
                  ? 'bottom-[-14px] h-1 w-8 rounded-t-full left-0'
                  : `w-1 h-8 top-0 ${isNavRight ? 'right-[-14px] rounded-l-full' : 'left-[-14px] rounded-r-full'}`
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
                  ref={(el) => { navButtonRefs.current[item.id] = el }}
                  onClick={() => {
                    setActiveNavItem(item.id)
                    if (item.id === 'settings') {
                      setIsSettingsOpen(true)
                    } else {
                      handleCloseSettings()
                    }
                  }}
                  className={`relative flex items-center justify-center transition-all duration-300 ease-out ${isModern
                    ? `modern-nav-btn ${isActive ? 'active' : ''}`
                    : `w-12 h-12 ${isActive
                      ? 'text-primary-500 scale-105'
                      : isDark
                        ? 'text-gray-500 hover:text-primary-300 hover:bg-primary-500/10'
                        : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/10'
                    }`
                    } ${isModern && !isActive
                      ? (isDark ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-800')
                      : ''
                    }`}
                  style={{
                    borderRadius: isModern ? '50%' : `var(--border-radius, 0.75rem)`,
                    fontSize: `calc(1rem * var(--font-scale, 1))`,
                    width: isModern ? '52px' : '48px',
                    height: isModern ? '52px' : '48px',
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
        Он всегда flex-row, чтобы чаты и контент оставались в ряд, 
        даже если навигация переместилась вниз или вправо.
        Порядок зависит от настройки chatsPosition.
      */}
      {/* WRAPPER для Чатов и Контента с закруглённым углом */}
      <div className={`content-wrapper flex-1 flex overflow-hidden relative h-full flex-row rounded-tl-2xl ${isChatsRight ? 'flex-row-reverse' : ''
        }`}>

        {/* Панель с чатами (масштабируемая) */}
        <div
          ref={chatsPanelRef}
          className={`chat-panel relative flex flex-col overflow-hidden border-r rounded-tl-2xl ${isModern ? 'modern-chat-panel' : ''}
            }`}
          style={{
            width: `${chatsPanelWidth}px`,
            transition: isPanelAnimating ? `width ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none'
          }}
        >
          {/* ... [Весь контент панели чатов без изменений] ... */}
          {/* Блок профиля пользователя */}
          <div
            className={`transition-all duration-300 ease-in-out ${(isSearchActive && !isMinimized) || (!isProfileVisible && !isMinimized) ? 'opacity-0 max-h-0 m-0 p-0 overflow-hidden' : 'opacity-100 max-h-[200px] overflow-visible'
              }`}
          >
            <div className="mt-3 mb-1 flex-shrink-0">
              <div className="flex items-center py-2 pl-5 pr-3">
                <div
                  className={`relative flex-shrink-0 w-12 h-12 cursor-pointer ${isModern && isOnlineState ? 'modern-avatar-ring' : ''}`}
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <div className={`relative w-full h-full rounded-full overflow-hidden ${!isModern ? `border-2 ${isOnlineState ? 'border-green-500/60' : 'border-gray-600/40'}` : ''
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
                          size={48}
                          className="border-0"
                        />
                      </div>
                    )}
                  </div>
                  {/* Индикатор онлайн */}
                  {!isModern && (
                    <div
                      className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${isOnlineState
                        ? 'bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_0_4px_rgba(34,197,94,0.6)]'
                        : 'bg-gray-500 border border-white/50 shadow-[0_0_0_2px_rgba(0,0,0,0.8)]'
                        }`}
                      style={{
                        zIndex: 20,
                        opacity: isMinimized ? 0 : 1,
                        transform: isMinimized ? 'scale(0)' : 'scale(1)'
                      }}
                    ></div>
                  )}
                  {isModern && isOnlineState && (
                    <div
                      className="modern-online-indicator absolute -bottom-0.5 -right-0.5"
                      style={{
                        zIndex: 20,
                        opacity: isMinimized ? 0 : 1,
                        transform: isMinimized ? 'scale(0)' : 'scale(1)'
                      }}
                    ></div>
                  )}
                </div>
                <div
                  className={`flex-1 min-w-0 cursor-pointer transition-all duration-300 ease-in-out overflow-hidden ${isMinimized
                    ? 'opacity-0 w-0 ml-0 mr-0'
                    : 'opacity-100 w-auto ml-3'
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
                      <div className={`text-xs truncate flex items-center gap-1 ${isDark ? 'text-primary-400' : 'text-primary-500'
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
                          className={`text-xs truncate cursor-pointer transition-all duration-300 absolute inset-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
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
                      className={`transition-colors flex-shrink-0 p-1.5 rounded-lg ${isDark
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
                      <div className={`absolute top-full mt-2 w-48 rounded-xl shadow-xl z-[100] overflow-hidden animate-fade-in ${
                        // Меню всегда открывается в сторону, где есть место
                        // Когда панель чатов справа, меню открывается справа (чтобы не выходить за экран)
                        // Когда панель чатов слева, меню открывается справа (относительно кнопки)
                        'right-0'
                        } ${isModern
                          ? 'modern-dropdown'
                          : `backdrop-blur-xl ${isDark
                            ? 'bg-gray-900/95 border border-gray-800/50'
                            : 'bg-white/95 border border-gray-200/50'
                          }`
                        }`}>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setIsSettingsOpen(true)
                              setIsProfileMenuOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${isDark
                              ? 'text-gray-300 hover:bg-white/5'
                              : 'text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Редактировать профиль
                          </button>
                          <button
                            onClick={() => {
                              setIsCreateChatOpen(true)
                              setIsProfileMenuOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${isDark
                              ? 'text-gray-300 hover:bg-white/5'
                              : 'text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Создать чат
                          </button>
                          <div className={`border-t my-1 ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}></div>
                          <button
                            onClick={() => {
                              toggleTheme()
                              setIsProfileMenuOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${isDark
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
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Разделительная линия между профилем и поиском */}
            <div className={`mx-4 my-1 ${isModern ? 'modern-divider' : `border-t ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}`}></div>
          </div>

          {/* Блок поиска */}
          {isMinimized ? (
            <div className="mx-4 mt-3 mb-2 flex items-center justify-center flex-shrink-0">
              <button
                onClick={handleSearchIconClick}
                className={`transition-colors p-2 ${isDark ? 'text-gray-500 hover:text-primary-300' : 'text-gray-400 hover:text-primary-500'
                  }`}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className={`mx-4 px-3 py-2 flex-shrink-0 transition-all duration-300 ease-in-out relative z-10 ${isSearchActive ? 'mt-3 mb-2' : 'mt-1 mb-2'
              }`}>
              <div className="flex items-center gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Поиск"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  className={`flex-1 px-4 py-2 text-sm placeholder-gray-500/60 focus:outline-none transition-all shadow-lg select-text ${isModern
                    ? `modern-input ${isDark ? 'text-white' : 'text-gray-900'}`
                    : `border-2 rounded-xl focus:border-primary-500/60 focus:bg-primary-500/10 ${isDark
                      ? 'bg-gray-800/30 border-gray-700/40 text-white'
                      : 'bg-white border-gray-300/60 text-gray-900'
                    }`
                    }`}
                />
                {isSearchActive && (
                  <button
                    onClick={handleSearchClose}
                    className={`p-1.5 rounded-lg transition-all ${isDark
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
          <div className={`mx-4 mb-2 transition-opacity duration-300 ${isModern ? 'modern-divider' : `border-t ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}`}></div>

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
                    className={`px-4 py-2 text-sm font-medium transition-colors relative flex-shrink-0 ${activeSearchTab === tab.id
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
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-primary-400' : 'bg-primary-500'
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
              <div className="chat-list flex-1 overflow-y-auto chat-panel-scrollbar">
                <div className="py-2 transition-all duration-300 ease-in-out">
                  {isLoadingChats && !isSearchActive ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    </div>
                  ) : isSearchActive ? (
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
                                  onClick={() => handleStartChat(foundUser.id)}
                                  onContextMenu={(e) => handleContextMenu(e, foundUser)}
                                  className={`w-full transition-colors text-left ${isModern
                                    ? 'modern-search-result'
                                    : `px-6 py-3 ${isDark
                                      ? 'hover:bg-primary-500/10'
                                      : 'hover:bg-primary-500/5'
                                    }`
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0 w-12 h-12">
                                      <div className={`relative w-full h-full rounded-full overflow-hidden border-2 ${foundUser.is_online ? 'border-green-500/60' : 'border-gray-600/40'
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
                                        className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${foundUser.is_online
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
                                              className={`text-xs truncate cursor-pointer transition-all duration-300 absolute inset-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
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
                    chats.map((chat) => {
                      console.log('Rendering chat:', chat)
                      // Для приватных чатов берем собеседника
                      const otherUser = chat.chat_type === 'private'
                        ? chat.participants.find(p => p.id !== user?.id)
                        : null

                      // Аватар: для приватного чата — аватар собеседника, для группы — аватар группы
                      const chatAvatarUrl = getAvatarUrl(chat.avatar_url)

                      // Имя чата: для приватного чата — имя собеседника (уже приходит с бэка)
                      const chatDisplayName = chat.chat_name || 'Чат'

                      // Подсообщение: последнее сообщение или @username
                      const getSubtitle = () => {
                        if (chat.last_message?.content) {
                          return chat.last_message.content
                        }
                        // Если нет последнего сообщения — показываем @username
                        if (otherUser?.username) {
                          return `@${otherUser.username}`
                        }
                        return 'Нет сообщений'
                      }

                      // Онлайн статус собеседника (только если мы сами в сети)
                      const isUserOnline = (otherUser?.is_online ?? false) && isOnlineState

                      return (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat.id)}
                          onContextMenu={(e) => handleChatContextMenu(e, chat.id, chatDisplayName)}
                          className={`w-full transition-all duration-300 ease-in-out text-left relative group ${isModern
                            ? `modern-chat-item ${selectedChat === chat.id ? 'selected' : ''}`
                            : `${isCompact ? 'px-2 py-1.5' : 'px-4 py-2'} ${isDark
                              ? 'hover:bg-primary-500/10'
                              : 'hover:bg-primary-500/5'
                            } ${selectedChat === chat.id ? (isDark ? 'bg-primary-500/20' : 'bg-primary-500/15') : ''}`
                            }`}
                        >
                          {/* Индикатор выбранного чата */}
                          {selectedChat === chat.id && !isModern && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md"></div>
                          )}
                          <div className={`flex items-center transition-all duration-300 ease-in-out ${isCompact ? 'justify-center' : 'gap-3'}`}>
                            <div className="relative flex-shrink-0">
                              <div className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full overflow-hidden border-2 transition-all duration-300 ease-in-out ${isUserOnline
                                ? 'border-green-500/60'
                                : isDark ? 'border-gray-700/50' : 'border-gray-300/60'
                                }`}>
                                {chatAvatarUrl ? (
                                  <img
                                    src={chatAvatarUrl}
                                    alt={chatDisplayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <DefaultAvatar
                                    firstName={otherUser?.first_name || chatDisplayName.charAt(0)}
                                    lastName={otherUser?.last_name}
                                    size={isCompact ? 40 : 48}
                                  />
                                )}
                              </div>
                              {isUserOnline && (
                                <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.8),0_0_3px_rgba(34,197,94,0.5)] transition-all duration-300 ease-in-out"></div>
                              )}
                            </div>
                            <div
                              className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${isCompact || isCompactCollapsing
                                ? 'opacity-0 max-w-0 overflow-hidden ml-0'
                                : 'opacity-100 max-w-full ml-0'
                                }`}
                            >
                              <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {chatDisplayName}
                              </div>
                              <div className={`text-sm truncate ${chat.last_message?.content
                                ? (isDark ? 'text-gray-500' : 'text-gray-500')
                                : (isDark ? 'text-primary-400' : 'text-primary-500')
                                }`}>
                                {getSubtitle()}
                              </div>
                            </div>
                            {/* Время последнего сообщения */}
                            {!isCompact && chat.last_message?.sent_at && (
                              <div className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                {formatChatTimestamp(chat.last_message.sent_at)}
                              </div>
                            )}
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
            <div className={`flex-1 flex flex-col items-center py-2 gap-2 overflow-y-auto chat-panel-scrollbar`}>
              {chats.length > 0 ? (
                chats.map((chat) => {
                  // Получаем данные чата так же, как в развернутом виде
                  const otherUser = chat.chat_type === 'private'
                    ? chat.participants.find(p => p.id !== user?.id)
                    : null
                  const chatAvatarUrl = getAvatarUrl(chat.avatar_url)
                  const chatDisplayName = chat.chat_name || 'Чат'
                  // Онлайн статус собеседника (только если мы сами в сети)
                  const isUserOnline = (otherUser?.is_online ?? false) && isOnlineState
                  const isSelected = selectedChat === chat.id

                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      onContextMenu={(e) => handleChatContextMenu(e, chat.id, chatDisplayName)}
                      className={`relative w-full flex items-center justify-center py-1.5 transition-all duration-200 ${isSelected
                        ? isDark ? 'bg-primary-500/20' : 'bg-primary-500/15'
                        : isDark ? 'hover:bg-primary-500/10' : 'hover:bg-primary-500/5'
                        }`}
                    >
                      {/* Индикатор выбранного чата */}
                      {isSelected && !isModern && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md"></div>
                      )}
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${isUserOnline
                          ? 'border-green-500/60'
                          : isDark ? 'border-gray-700/50' : 'border-gray-300/60'
                          }`}>
                          {chatAvatarUrl ? (
                            <img
                              src={chatAvatarUrl}
                              alt={chatDisplayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <DefaultAvatar
                              firstName={otherUser?.first_name || chatDisplayName.charAt(0)}
                              lastName={otherUser?.last_name}
                              size={40}
                            />
                          )}
                        </div>
                        {isUserOnline && (
                          <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-green-500 border border-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.8),0_0_3px_rgba(34,197,94,0.5)]"></div>
                        )}
                      </div>
                    </button>
                  )
                })
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

          {/* Разделитель для ресайза - игольчатый градиент */}
          <div
            className="absolute top-0 w-3 h-full cursor-ew-resize z-20 group"
            style={{
              [isChatsRight ? 'left' : 'right']: -6
            }}
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
            {/* Внутренний градиент - игла */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-[2px] transition-all duration-300 ease-out"
              style={{
                top: '20%',
                height: '60%',
                background: isDark
                  ? 'linear-gradient(to bottom, transparent 0%, rgba(100, 116, 139, 0.2) 30%, rgba(100, 116, 139, 0.4) 50%, rgba(100, 116, 139, 0.2) 70%, transparent 100%)'
                  : 'linear-gradient(to bottom, transparent 0%, rgba(148, 163, 184, 0.3) 30%, rgba(148, 163, 184, 0.5) 50%, rgba(148, 163, 184, 0.3) 70%, transparent 100%)',
                opacity: 0.6
              }}
            />
            {/* Hover состояние - растягивается на всю высоту */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out"
              style={{
                top: '5%',
                height: '90%',
                background: isDark
                  ? 'linear-gradient(to bottom, transparent 0%, rgba(99, 102, 241, 0.3) 15%, rgba(99, 102, 241, 0.5) 50%, rgba(99, 102, 241, 0.3) 85%, transparent 100%)'
                  : 'linear-gradient(to bottom, transparent 0%, rgba(99, 102, 241, 0.4) 15%, rgba(99, 102, 241, 0.6) 50%, rgba(99, 102, 241, 0.4) 85%, transparent 100%)',
              }}
            />
          </div>
        </div>

        {/* Центральная область - чат, пустое состояние */}
        <div className={`message-area flex-1 flex relative ${!hasSelectedChat ? 'items-center justify-center' : ''} ${isModern ? 'modern-message-area' : ''}
          `}>
          {hasSelectedChat ? (
            // Область открытого чата
            <ChatInterface
              chatId={selectedChat}
              initialData={(() => {
                const chat = chats.find(c => c.id === selectedChat)
                if (!chat) return undefined

                const otherUser = chat.chat_type === 'private'
                  ? chat.participants.find(p => p.id !== user?.id)
                  : null

                // Для приватных чатов используем аватар собеседника, иначе аватар группы
                const avatarToUse = chat.chat_type === 'private'
                  ? otherUser?.avatar_url
                  : chat.avatar_url

                return {
                  title: chat.chat_name || 'Чат',
                  avatarUrl: avatarToUse || null,
                  isOnline: (otherUser?.is_online === true) && isOnlineState, // Явное сравнение + проверка сети
                  type: chat.chat_type as 'private' | 'group'
                }
              })()}
              isAppOnline={isOnlineState}
              onClose={() => setSelectedChat(null)}
            />
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
          ) : !isOnlineState ? (
            // Нет подключения
            <div className="text-center px-8">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <svg
                    className={`w-24 h-24 mx-auto ${isDark ? 'text-gray-700' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01" />
                  </svg>
                </div>
                <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Нет подключения
                </h2>
                <p className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Проверьте ваше интернет-соединение
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
                  className={`px-8 py-3 rounded-lg transition-colors text-white font-semibold text-base ${isModern
                    ? 'modern-btn'
                    : 'bg-primary-500 hover:bg-primary-400 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50'
                    }`}
                >
                  Найти друзей
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно настроек */}
      <ChatContextMenu
        isOpen={chatContextMenu.isOpen}
        x={chatContextMenu.x}
        y={chatContextMenu.y}
        chatId={chatContextMenu.chatId!}
        chatName={chatContextMenu.chatName}
        onClose={() => setChatContextMenu(prev => ({ ...prev, isOpen: false }))}
        onDeleteChat={handleDeleteChat}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        activeTab={settingsActiveTab}
        onTabChange={setSettingsActiveTab}
      />

      {/* Модальное окно создания чата */}
      <CreateChatModal
        isOpen={isCreateChatOpen}
        onClose={() => setIsCreateChatOpen(false)}
        onUserSelected={handleStartChat}
      />

      {/* Контекстное меню для пользователей */}
      {contextMenu.user && (
        <UserContextMenu
          isOpen={contextMenu.isOpen}
          x={contextMenu.x}
          y={contextMenu.y}
          user={contextMenu.user}
          onClose={closeContextMenu}
          onSendMessage={handleStartChat}
          onCopyUsername={(username) => copyUsername(username)}
        />
      )}

    </div>
  )
}

export default MessengerPage