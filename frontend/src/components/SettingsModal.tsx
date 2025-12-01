import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import DefaultAvatar from './DefaultAvatar'
import { getApiBaseUrl } from '../utils/platform'

// Функция для форматирования даты в формат YYYY-MM-DD
const formatDateForInput = (date: Date | null): string => {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  activeTab?: string
  onTabChange?: (tab: string) => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  activeTab: externalActiveTab,
  onTabChange
}) => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [internalActiveTab, setInternalActiveTab] = useState<string>('profile')
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab
  const setActiveTab = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalActiveTab(tab)
    }
  }
  
  const [avatarError, setAvatarError] = useState(false)
  const [birthday, setBirthday] = useState<string>('')
  const [isAnimating, setIsAnimating] = useState(false)

  // Обработка ESC для закрытия
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Блокировка прокрутки фона при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Анимация появления
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Получить полный URL аватарки
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

  const avatarUrl = getAvatarUrl(user?.avatar_url)

  // Навигационные вкладки
  const navTabs = [
    { id: 'profile', label: 'Редактировать профиль', icon: 'edit' },
    { id: 'privacy', label: 'Приватность', icon: 'lock' },
    { id: 'notifications', label: 'Уведомления', icon: 'bell' },
    { id: 'chats', label: 'Чаты и медиа', icon: 'chat' },
    { id: 'language', label: 'Язык', icon: 'globe' },
    { id: 'appearance', label: 'Внешний вид', icon: 'appearance' },
    { id: 'sessions', label: 'Активные сессии', icon: 'screen' },
  ]

  // Иконки для вкладок
  const getTabIcon = (iconName: string) => {
    const iconClass = 'w-5 h-5'
    switch (iconName) {
      case 'edit':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'lock':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'bell':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
      case 'chat':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'globe':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'appearance':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        )
      case 'screen':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  if (!isOpen && !isAnimating) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ${
          isDark ? 'bg-black/80' : 'bg-black/60'
        } ${isOpen ? 'backdrop-blur-sm' : 'backdrop-blur-none'}`}
        onClick={onClose}
      />
      
      {/* Модальное окно */}
      <div 
        className={`relative w-[90vw] h-[90vh] max-w-[1200px] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark 
            ? 'bg-gray-900 border border-gray-800/50' 
            : 'bg-white border border-gray-200'
        } ${
          isOpen 
            ? 'scale-100 translate-y-0' 
            : 'scale-95 translate-y-4'
        }`}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 p-2 rounded-lg transition-all hover:rotate-90 ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Контент настроек */}
        <div className="flex h-full w-full">
          {/* Левая панель навигации */}
          <div className={`w-72 flex-shrink-0 border-r flex flex-col ${
            isDark ? 'border-gray-800/50 bg-gray-900/50' : 'border-gray-200 bg-gray-50/50'
          }`}>
            {/* Заголовок */}
            <div className={`px-6 py-6 border-b ${isDark ? 'border-gray-800/50' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Настройки
              </h2>
            </div>

            {/* Навигационные вкладки */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-6 py-3.5 flex items-center gap-3 text-left transition-all ${
                      isActive
                        ? isDark
                          ? 'bg-primary-500/20 text-primary-400 border-r-4 border-primary-500'
                          : 'bg-primary-500/10 text-primary-600 border-r-4 border-primary-600'
                        : isDark
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    {getTabIcon(tab.icon)}
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Информация пользователя внизу */}
            <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800/50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0 w-10 h-10">
                  <div className={`relative w-full h-full rounded-full overflow-hidden border-2 ${
                    isDark ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    {user?.avatar_url && avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={`${user?.first_name} ${user?.last_name || ''}`}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                        onLoad={() => setAvatarError(false)}
                      />
                    ) : (
                      <DefaultAvatar
                        firstName={user?.first_name || 'П'}
                        lastName={user?.last_name}
                        size={40}
                        className="border-0"
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {user?.first_name || 'Пользователь'} {user?.last_name || ''}
                  </div>
                  {user?.username && (
                    <div className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      @{user.username}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Правая часть - контент */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Контент вкладки */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === 'profile' ? (
                <div className="p-8 max-w-3xl mx-auto">
                  {/* Аватар */}
                  <div className="mb-8">
                    <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Аватар
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
                        {user?.avatar_url && avatarUrl && !avatarError ? (
                          <img
                            src={avatarUrl}
                            alt={`${user?.first_name} ${user?.last_name || ''}`}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                            onLoad={() => setAvatarError(false)}
                          />
                        ) : (
                          <DefaultAvatar
                            firstName={user?.first_name || 'П'}
                            lastName={user?.last_name}
                            size={96}
                            className="border-0"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isDark
                              ? 'bg-primary-500 text-white hover:bg-primary-600'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                        >
                          Загрузить фото
                        </button>
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isDark
                              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          Удалить фото
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Имя */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Имя
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.first_name || ''}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                        isDark
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="Введите имя"
                    />
                  </div>

                  {/* Фамилия */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Фамилия
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.last_name || ''}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                        isDark
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="Введите фамилию"
                    />
                  </div>

                  {/* Username */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Username
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 font-medium`}>
                        @
                      </span>
                      <input
                        type="text"
                        defaultValue={user?.username || ''}
                        className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                          isDark
                            ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        }`}
                        placeholder="username"
                      />
                    </div>
                  </div>

                  {/* Телефон */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Телефон
                    </label>
                    <input
                      type="tel"
                      defaultValue={user?.phone_number || ''}
                      disabled
                      className={`w-full px-4 py-3 border rounded-lg cursor-not-allowed opacity-60 ${
                        isDark
                          ? 'bg-gray-800/30 border-gray-700 text-gray-400'
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                    />
                    <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Телефон нельзя изменить
                    </p>
                  </div>

                  {/* Статус */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Статус
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.status_text || ''}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                        isDark
                          ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="Ваш статус"
                    />
                  </div>

                  {/* День рождения */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      День рождения
                    </label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                        isDark
                          ? 'bg-gray-800/50 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Кнопки сохранения и отмены */}
                  <div className={`flex items-center justify-end gap-3 pt-6 border-t mt-8 ${
                    isDark ? 'border-gray-800/50' : 'border-gray-200'
                  }`}>
                    <button
                      onClick={onClose}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isDark
                          ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Отмена
                    </button>
                    <button
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isDark
                          ? 'bg-primary-500 text-white hover:bg-primary-600'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                      }`}
                    >
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Вкладка &quot;{navTabs.find(t => t.id === activeTab)?.label}&quot; пока не реализована
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal

