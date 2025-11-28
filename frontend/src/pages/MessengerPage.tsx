import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import DefaultAvatar from '../components/DefaultAvatar'
import { getApiBaseUrl } from '../utils/platform'

const MessengerPage: React.FC = () => {
  const { user, refreshUser } = useAuth()
  const [selectedChat, setSelectedChat] = useState<number | null>(null)
  const [chatsPanelWidth, setChatsPanelWidth] = useState(380)
  const [hoveredStatus, setHoveredStatus] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [activeNavItem, setActiveNavItem] = useState<string>('chats')
  const [avatarError, setAvatarError] = useState(false)
  const chatsPanelRef = useRef<HTMLDivElement>(null)
  const MIN_WIDTH = 80 // Минимальный размер равен ширине навигационной панели
  const MAX_WIDTH = 500
  const COMPACT_WIDTH = 200 // Ширина для компактного режима
  const AUTO_COLLAPSE_THRESHOLD = 280 // Порог для автоматического сворачивания (увеличен)
  
  // Получить полный URL аватарки
  const getAvatarUrl = (avatarUrl?: string | null): string | null => {
    if (!avatarUrl || avatarUrl.trim() === '') return null
    // Если уже полный URL, возвращаем как есть
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl
    }
    // Если путь уже начинается с /static/, используем его напрямую (прокси vite обработает)
    if (avatarUrl.startsWith('/static/')) {
      return avatarUrl
    }
    // Иначе формируем полный URL
    const apiBaseUrl = getApiBaseUrl()
    let baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '') // Убираем /api и конечный /
    return `${baseUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`
  }
  
  // Сброс ошибки аватарки при изменении user
  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])
  
  // Автоматическое обновление профиля каждые 10 секунд (дублируем в компоненте для надежности)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshUser()
      } catch (error) {
        console.error('Ошибка при автообновлении профиля:', error)
      }
    }, 10000) // Обновляем каждые 10 секунд

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // TODO: Заменить на реальные данные из API
  const chats: any[] = []
  const hasChats = chats.length > 0
  const hasSelectedChat = selectedChat !== null
  
  // Навигационные элементы
  const navItems = [
    { id: 'home', icon: 'home', label: 'Главная' },
    { id: 'groups', icon: 'groups', label: 'Группы' },
    { id: 'calls', icon: 'phone', label: 'Звонки' },
    { id: 'chats', icon: 'chat', label: 'Чаты' },
    { id: 'settings', icon: 'settings', label: 'Настройки' },
  ]

  // Обработка ресайза панели с автоматическим сворачиванием
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = e.clientX - 80 // 80px - ширина навигационной панели
      
      // Автоматическое сворачивание при достижении порога (как в Telegram)
      if (newWidth < AUTO_COLLAPSE_THRESHOLD) {
        // Сворачиваем до минимума
        setChatsPanelWidth(MIN_WIDTH)
      } else if (newWidth >= AUTO_COLLAPSE_THRESHOLD && newWidth < COMPACT_WIDTH) {
        // Устанавливаем компактный размер при разворачивании
        setChatsPanelWidth(COMPACT_WIDTH)
      } else if (newWidth >= COMPACT_WIDTH && newWidth <= MAX_WIDTH) {
        setChatsPanelWidth(newWidth)
      } else if (newWidth > MAX_WIDTH) {
        setChatsPanelWidth(MAX_WIDTH)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, chatsPanelWidth])

  // Иконки SVG
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
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const userStatus = user?.status_text || null
  const isMinimized = chatsPanelWidth <= MIN_WIDTH
  const isCompact = chatsPanelWidth > MIN_WIDTH && chatsPanelWidth < COMPACT_WIDTH
  const avatarUrl = getAvatarUrl(user?.avatar_url)

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden select-none">
      {/* Левая навигационная панель (фиксированная, без масштабирования) */}
      <div className="w-20 flex-shrink-0 border-r border-gray-700/50 bg-gray-800/30 flex flex-col">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          {navItems.map((item) => {
            const isActive = activeNavItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveNavItem(item.id)}
                className={`relative w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title={item.label}
              >
                {getIcon(item.icon)}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Панель с чатами (масштабируемая) */}
      <div
        ref={chatsPanelRef}
        className="relative flex flex-col border-r border-gray-700/50 bg-gray-800/30 transition-none overflow-hidden"
        style={{ width: `${chatsPanelWidth}px` }}
      >
        {/* Блок профиля пользователя */}
        <div className={`mx-4 mt-3 mb-1 px-3 py-2 flex-shrink-0`}>
          <div className={`flex items-center ${isMinimized ? 'justify-center gap-0' : 'gap-3'}`}>
            <div className="relative flex-shrink-0 w-10 h-10">
              <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-green-500/60">
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
              {/* Индикатор онлайн (зеленое кольцо) - поверх аватарки */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800 shadow-lg" style={{ zIndex: 20 }}></div>
            </div>
            {!isMinimized && (
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate mb-0.5">
                  {user?.first_name || 'Пользователь'} {user?.last_name || ''}
                </div>
                <div
                  className="relative h-4 overflow-hidden"
                  onMouseEnter={() => setHoveredStatus(true)}
                  onMouseLeave={() => setHoveredStatus(false)}
                >
                  {userStatus ? (
                    <>
                      {/* Статус */}
                      <div 
                        className="text-gray-400 text-xs truncate cursor-pointer hover:text-gray-300 transition-all duration-300 absolute inset-0"
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
                          className="text-primary-400 text-xs truncate transition-all duration-300 absolute inset-0"
                          style={{
                            transform: hoveredStatus ? 'translateY(0)' : 'translateY(100%)',
                            opacity: hoveredStatus ? 1 : 0
                          }}
                        >
                          @{user.username}
                        </div>
                      )}
                    </>
                  ) : (
                    user?.username && (
                      <div className="text-gray-400 text-xs truncate">
                        @{user.username}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            {!isMinimized && (
              <button className="text-gray-400 hover:text-white transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-white/5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Разделительная линия между профилем и поиском */}
        <div className="mx-4 border-t border-gray-700/50 my-1"></div>

        {/* Блок поиска */}
        {isMinimized ? (
          <div className="mx-4 mt-3 mb-2 flex items-center justify-center flex-shrink-0">
            <button className="text-gray-400 hover:text-white transition-colors p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="mx-4 mt-1 mb-2 px-3 py-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Поиск"
              className="w-full px-4 py-2 bg-white/5 border-2 border-gray-600/40 rounded-xl text-white text-sm placeholder-gray-500/60 focus:outline-none focus:border-primary-500/60 focus:bg-primary-500/10 transition-all shadow-lg select-text"
            />
          </div>
        )}

        {/* Разделительная линия после поиска */}
        <div className="mx-4 border-t border-gray-700/50 mb-2"></div>

        {!isMinimized && (
          <>
            {/* Блок списка чатов */}
            <div className="flex-1 overflow-y-auto bg-gray-800/10">
              <div className="py-2">
                {chats.length > 0 ? (
                  chats.map((_chat, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedChat(index)}
                      className={`w-full ${isCompact ? 'px-3 py-2' : 'px-6 py-3'} hover:bg-white/5 transition-colors text-left`}
                    >
                      <div className={`flex items-center ${isCompact ? 'gap-2' : 'gap-3'}`}>
                        <div className="relative">
                          <div className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-gray-700/50 border-2 border-gray-600/50 flex-shrink-0`} />
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        </div>
                        {!isCompact && (
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">Чат {index + 1}</div>
                            <div className="text-gray-400 text-sm truncate">Последнее сообщение...</div>
                          </div>
                        )}
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
                      <p className="text-gray-500 text-sm transition-opacity duration-300">Нет чатов</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Минимальный вид - только аватарки чатов */}
        {isMinimized && (
          <div className="flex-1 flex flex-col items-center py-2 gap-3 overflow-y-auto">
            {chats.length > 0 ? (
              chats.slice(0, 8).map((_chat, index) => (
                <div key={index} className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-700/50 border-2 border-gray-600/50"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
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
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 group"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsResizing(true)
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-20 bg-gray-600/30 group-hover:bg-primary-500/60 rounded-l-full transition-all" />
        </div>
      </div>

      {/* Центральная область - чат или пустое состояние */}
      <div className="flex-1 flex items-center justify-center bg-gray-900/50">
        {hasSelectedChat ? (
          // TODO: Область открытого чата
          <div className="text-center">
            <p className="text-gray-400">Чат открыт</p>
          </div>
        ) : hasChats ? (
          // Есть чаты, но ни один не выбран
          <div className="text-center px-8">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <svg
                  className="w-24 h-24 mx-auto text-gray-600"
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
              <h2 className="text-2xl font-semibold text-white mb-2">
                Выберите чат
              </h2>
              <p className="text-gray-400 text-lg">
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
                  className="w-24 h-24 mx-auto text-gray-600"
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
              <h2 className="text-2xl font-semibold text-white mb-3">
                Начните общение
              </h2>
              <p className="text-gray-400 text-lg mb-6">
                У вас пока нет чатов. Найдите друзей и начните общаться, чтобы делиться моментами и обмениваться сообщениями.
              </p>
              <button
                onClick={() => {
                  // TODO: Реализовать переход к поиску друзей
                  console.log('Найти друзей')
                }}
                className="px-8 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors text-white font-semibold text-base shadow-lg shadow-primary-500/20"
              >
                Найти друзей
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessengerPage
