import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import DefaultAvatar from './DefaultAvatar'
import { getApiBaseUrl } from '../utils/platform'

interface ProfileEditPanelProps {
  onClose: () => void
  isDark: boolean
}

const ProfileEditPanel: React.FC<ProfileEditPanelProps> = ({ onClose, isDark }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('profile')
  const [avatarError, setAvatarError] = useState(false)

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

  // Навигационные вкладки (как в примере)
  const navTabs = [
    { id: 'profile', label: 'Редактировать профиль', icon: 'edit' },
    { id: 'language', label: 'Язык', icon: 'globe' },
    { id: 'notifications', label: 'Уведомления', icon: 'bell' },
    { id: 'payments', label: 'Платежи', icon: 'card' },
    { id: 'taxes', label: 'Налоги', icon: 'document' },
    { id: 'transactions', label: 'Транзакции', icon: 'transactions' },
    { id: 'password', label: 'Пароль', icon: 'lock' },
    { id: 'access', label: 'Доступ', icon: 'door' },
    { id: 'sessions', label: 'Сессии', icon: 'screen' },
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
      case 'globe':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'bell':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
      case 'card':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      case 'document':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'transactions':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      case 'lock':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'door':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
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

  return (
    <div className={`flex h-full w-full ${isDark ? 'bg-gray-900/40' : 'bg-white/90'}`}>
      {/* Левая панель навигации */}
      <div className={`w-64 flex-shrink-0 border-r flex flex-col ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}>
        {/* Заголовок */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Настройки
          </h2>
        </div>

        {/* Навигационные вкладки */}
        <div className="flex-1 overflow-y-auto py-2">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-6 py-3 flex items-center gap-3 text-left transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-primary-500/20 text-primary-400 border-r-2 border-primary-500'
                      : 'bg-primary-500/10 text-primary-500 border-r-2 border-primary-500'
                    : isDark
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                {getTabIcon(tab.icon)}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Кнопка удаления аккаунта */}
        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}>
          <button
            className={`w-full px-6 py-3 flex items-center gap-3 text-left transition-colors ${
              isDark
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-red-500 hover:text-red-600 hover:bg-red-50/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm font-medium">Удалить аккаунт</span>
          </button>
        </div>
      </div>

      {/* Правая часть - контент */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Заголовок с кнопкой закрытия */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Редактировать профиль
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Фото профиля */}
              <div className="flex items-start gap-6">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700/40">
                    {user?.avatar_url && avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt={`${user?.first_name} ${user?.last_name || ''}`}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-600">
                        <DefaultAvatar
                          firstName={user?.first_name || 'П'}
                          lastName={user?.last_name}
                          size={96}
                          className="border-0"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <button
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      isDark
                        ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    Загрузить новое фото
                  </button>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Рекомендуется минимум 800x800 px. Разрешены JPG или PNG
                  </p>
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Личная информация
                  </h3>
                  <button
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Полное имя
                    </label>
                    <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {user?.first_name || ''} {user?.last_name || ''}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Email
                    </label>
                    <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {user?.username ? `${user.username}@example.com` : 'Не указан'}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Телефон
                    </label>
                    <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      Не указан
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Местоположение
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Введите местоположение"
                    defaultValue="California"
                    className={`flex-1 px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-primary-500/60 ${
                      isDark
                        ? 'bg-gray-800/50 border-gray-700/40 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300/60 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <button
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Отмена
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDark
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    О себе
                  </h3>
                  <button
                    className={`p-2 rounded-lg transition-colors ${
                      isDark
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
                <div className={`px-4 py-3 rounded-lg min-h-[120px] ${isDark ? 'bg-gray-800/50 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  {user?.bio || 'Не указано'}
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'profile' && (
            <div className="flex items-center justify-center h-full">
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Вкладка &quot;{navTabs.find(t => t.id === activeTab)?.label}&quot; пока не реализована
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfileEditPanel

