import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance, CompactMode, ThemeMode, DesignStyle, NavPosition, ChatsPosition } from '../contexts/AppearanceContext'
import DefaultAvatar from './DefaultAvatar'
import SessionsTab from './SessionsTab'
import { getApiBaseUrl } from '../utils/platform'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

// ... (предыдущие функции formatDateForInput, getNavIcon, AppearanceTab без изменений) ...
// Функция для форматирования даты в формат YYYY-MM-DD
const formatDateForInput = (date: Date | null): string => {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// SVG иконки для навигации (как в MessengerPage)
const getNavIcon = (iconName: string, className: string = 'w-5 h-5') => {
  switch (iconName) {
    case 'home':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    case 'groups':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    case 'phone':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    case 'chat':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    case 'settings':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return null
  }
}

// Компонент для вкладки "Внешний вид"
const AppearanceTab: React.FC<{
  isDark: boolean
  onClose: () => void
  onSettingsChange: () => void
  saveRef?: React.MutableRefObject<(() => void) | null>
}> = ({ isDark, onClose, onSettingsChange, saveRef }) => {
  const { settings, updateSettings, resetSettings } = useAppearance()
  const { user } = useAuth()

  // Локальное состояние для отложенных изменений
  const [pendingSettings, setPendingSettings] = useState(settings)
  const [hasChanges, setHasChanges] = useState(false)

  // Используем pendingSettings для отображения превью
  const isModern = pendingSettings.designStyle === 'modern'

  const handleSettingChange = (newSettings: any) => {
    setPendingSettings(prev => ({ ...prev, ...newSettings }))
    setHasChanges(true)
    onSettingsChange()
  }

  const handleSave = () => {
    updateSettings(pendingSettings)
    setHasChanges(false)
    onClose()
  }

  // Экспортируем функцию сохранения через ref
  React.useEffect(() => {
    if (saveRef) {
      saveRef.current = () => {
        updateSettings(pendingSettings)
        setHasChanges(false)
      }
    }
    return () => {
      if (saveRef) {
        saveRef.current = null
      }
    }
  }, [pendingSettings, saveRef, updateSettings])

  const handleReset = () => {
    resetSettings()
    setPendingSettings(settings)
    setHasChanges(false)
  }

  const handleCancel = () => {
    setPendingSettings(settings)
    setHasChanges(false)
    onClose()
  }

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
  const [avatarError, setAvatarError] = useState(false)

  const themeOptions: { value: ThemeMode; label: string; desc: string }[] = [
    { value: 'dark', label: 'Тёмная', desc: 'Тёмная тема для работы в условиях низкой освещённости' },
    { value: 'light', label: 'Светлая', desc: 'Светлая тема для работы днём' },
    { value: 'auto', label: 'Авто', desc: 'Автоматически меняется в зависимости от времени суток' },
  ]

  const navPositionOptions: { value: NavPosition; label: string; desc: string }[] = [
    { value: 'left', label: 'Слева', desc: 'Стандартное расположение' },
    { value: 'bottom', label: 'Снизу', desc: 'Удобно для планшетов' },
    { value: 'right', label: 'Справа', desc: 'Для левшей или RTL' },
  ]

  const chatsPositionOptions: { value: ChatsPosition; label: string; desc: string }[] = [
    { value: 'left', label: 'Слева', desc: 'Панель чатов слева от контента' },
    { value: 'right', label: 'Справа', desc: 'Панель чатов справа от контента' },
  ]

  const getNavPositionIcon = (pos: NavPosition) => {
    const baseClass = "w-full h-full border-2 border-current rounded opacity-40"
    const activeClass = "absolute bg-current opacity-100"

    switch (pos) {
      case 'left':
        return (
          <div className="w-8 h-6 relative flex items-center justify-center">
            <div className={baseClass}></div>
            <div className={`${activeClass} left-0 top-0 bottom-0 w-2 rounded-l`}></div>
          </div>
        )
      case 'right':
        return (
          <div className="w-8 h-6 relative flex items-center justify-center">
            <div className={baseClass}></div>
            <div className={`${activeClass} right-0 top-0 bottom-0 w-2 rounded-r`}></div>
          </div>
        )
      case 'bottom':
        return (
          <div className="w-8 h-6 relative flex items-center justify-center">
            <div className={baseClass}></div>
            <div className={`${activeClass} left-0 right-0 bottom-0 h-2 rounded-b`}></div>
          </div>
        )
    }
  }

  const getChatsPositionIcon = (pos: ChatsPosition) => {
    const baseClass = "w-full h-full border-2 border-current rounded opacity-40"
    const activeClass = "absolute bg-current opacity-100"

    switch (pos) {
      case 'left':
        return (
          <div className="w-8 h-6 relative flex items-center justify-center">
            <div className={baseClass}></div>
            <div className={`${activeClass} left-0 top-0 bottom-0 w-1/3 rounded-l`}></div>
            <div className={`${activeClass} right-0 top-0 bottom-0 w-2/3 rounded-r`}></div>
          </div>
        )
      case 'right':
        return (
          <div className="w-8 h-6 relative flex items-center justify-center">
            <div className={baseClass}></div>
            <div className={`${activeClass} left-0 top-0 bottom-0 w-2/3 rounded-l`}></div>
            <div className={`${activeClass} right-0 top-0 bottom-0 w-1/3 rounded-r`}></div>
          </div>
        )
      default:
        return null
    }
  }

  const getThemeIcon = (theme: ThemeMode) => {
    switch (theme) {
      case 'dark':
        return (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'light':
        return (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'auto':
        return (
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
    }
  }

  const compactModeOptions: { value: CompactMode; label: string; desc: string }[] = [
    { value: 'cozy', label: 'Уютный', desc: 'Максимум пространства между элементами' },
    { value: 'default', label: 'По умолчанию', desc: 'Стандартные отступы' },
    { value: 'compact', label: 'Компактный', desc: 'Минимальные отступы для больше информации' },
  ]

  const designStyleOptions: { value: DesignStyle; label: string; desc: string }[] = [
    { value: 'default', label: 'Стандартный', desc: 'Классический стиль Dialect' },
    { value: 'modern', label: 'Современный', desc: 'Liquid Glass, Glassmorphism и прозрачность' },
  ]

  const getDesignStyleIcon = (style: DesignStyle) => {
    switch (style) {
      case 'default':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        )
      case 'modern':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        )
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Настройки внешнего вида
      </h2>

      {/* Выбор темы */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Тема
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {themeOptions.map((option) => {
            const isActive = pendingSettings.themeMode === option.value
            return (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSettingChange({ themeMode: option.value })
                }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 group ${isActive
                    ? '!border-primary-500 bg-primary-500/10 focus:!border-primary-500 ring-2 ring-primary-500/20'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 focus:border-gray-600'
                      : 'border-gray-300 bg-white hover:border-gray-400 focus:border-gray-400'
                  }`}
                style={isActive ? { borderColor: 'var(--color-primary-500, #3b82f6)', borderWidth: '2px' } : undefined}
              >
                {/* Анимированный индикатор */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-primary-500 text-white rounded-full animate-scale-in">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={`mb-3 transition-all duration-300 ${isActive ? 'text-primary-500 scale-110' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getThemeIcon(option.value)}
                </div>
                <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {option.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>


      {/* Стиль дизайна */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Стиль дизайна
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {designStyleOptions.map((option) => {
            const isActive = pendingSettings.designStyle === option.value
            return (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSettingChange({ designStyle: option.value })
                }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${isActive
                    ? '!border-primary-500 bg-primary-500/10 focus:!border-primary-500 ring-2 ring-primary-500/20'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 focus:border-gray-600'
                      : 'border-gray-300 bg-white hover:border-gray-400 focus:border-gray-400'
                  }`}
                style={isActive ? { borderColor: 'var(--color-primary-500, #3b82f6)', borderWidth: '2px' } : undefined}
              >
                {/* Анимированный индикатор */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-primary-500 text-white rounded-full animate-scale-in">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={`mb-3 transition-all duration-300 ${isActive ? 'text-primary-500 scale-110' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getDesignStyleIcon(option.value)}
                </div>
                <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {option.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Расположение меню */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Расположение меню
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {navPositionOptions.map((option) => {
            const isActive = pendingSettings.navPosition === option.value
            return (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSettingChange({ navPosition: option.value })
                }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${isActive
                    ? '!border-primary-500 bg-primary-500/10 focus:!border-primary-500 ring-2 ring-primary-500/20'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 focus:border-gray-600'
                      : 'border-gray-300 bg-white hover:border-gray-400 focus:border-gray-400'
                  }`}
                style={isActive ? { borderColor: 'var(--color-primary-500, #3b82f6)', borderWidth: '2px' } : undefined}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-primary-500 text-white rounded-full animate-scale-in">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={`mb-3 flex justify-center transition-all duration-300 ${isActive ? 'text-primary-500 scale-110' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getNavPositionIcon(option.value)}
                </div>
                <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {option.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Расположение панели чатов */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Расположение поля с чатами
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {chatsPositionOptions.map((option) => {
            const isActive = pendingSettings.chatsPosition === option.value
            return (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSettingChange({ chatsPosition: option.value })
                }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${isActive
                    ? '!border-primary-500 bg-primary-500/10 focus:!border-primary-500 ring-2 ring-primary-500/20'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 focus:border-gray-600'
                      : 'border-gray-300 bg-white hover:border-gray-400 focus:border-gray-400'
                  }`}
                style={isActive ? { borderColor: 'var(--color-primary-500, #3b82f6)', borderWidth: '2px' } : undefined}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-primary-500 text-white rounded-full animate-scale-in">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={`mb-3 flex justify-center transition-all duration-300 ${isActive ? 'text-primary-500 scale-110' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {getChatsPositionIcon(option.value)}
                </div>
                <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {option.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Режим компактности */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Плотность интерфейса
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {compactModeOptions.map((option) => {
            const isActive = pendingSettings.compactMode === option.value
            return (
              <button
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSettingChange({ compactMode: option.value })
                }}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${isActive
                    ? '!border-primary-500 bg-primary-500/10 focus:!border-primary-500 ring-2 ring-primary-500/20'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600 focus:border-gray-600'
                      : 'border-gray-300 bg-white hover:border-gray-400 focus:border-gray-400'
                  }`}
                style={isActive ? { borderColor: 'var(--color-primary-500, #3b82f6)', borderWidth: '2px' } : undefined}
              >
                {/* Анимированный индикатор */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center bg-primary-500 text-white rounded-full animate-scale-in">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {option.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Интенсивность размытия */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Интенсивность размытия фона
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="100"
              value={pendingSettings.blurIntensity}
              onChange={(e) => {
                e.stopPropagation()
                handleSettingChange({ blurIntensity: Number(e.target.value) })
              }}
              onClick={(e) => e.stopPropagation()}
              className="slider-modern w-full"
              style={{ '--slider-progress': `${pendingSettings.blurIntensity}%` } as React.CSSProperties}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>0%</span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>100%</span>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 min-w-[60px] text-center text-sm font-bold rounded-lg ${isDark ? 'bg-gray-800 text-primary-400' : 'bg-gray-100 text-primary-600'
              }`}
          >
            {pendingSettings.blurIntensity}%
          </div>
        </div>
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Контролирует силу эффекта размытия в модальных окнах и панелях
        </p>
      </div>

      {/* Расстояние между сообщениями */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Расстояние между элементами
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="20"
              value={pendingSettings.messageSpacing}
              onChange={(e) => {
                e.stopPropagation()
                handleSettingChange({ messageSpacing: Number(e.target.value) })
              }}
              onClick={(e) => e.stopPropagation()}
              className="slider-modern w-full"
              style={{ '--slider-progress': `${(pendingSettings.messageSpacing / 20) * 100}%` } as React.CSSProperties}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>0px</span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>20px</span>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 min-w-[60px] text-center text-sm font-bold rounded-lg ${isDark ? 'bg-gray-800 text-primary-400' : 'bg-gray-100 text-primary-600'
              }`}
          >
            {pendingSettings.messageSpacing}px
          </div>
        </div>
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Дополнительное пространство между сообщениями и элементами интерфейса
        </p>
      </div>

      {/* Масштаб шрифта */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Масштаб шрифта
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={pendingSettings.fontScale}
              onChange={(e) => {
                e.stopPropagation()
                handleSettingChange({ fontScale: Number(e.target.value) })
              }}
              onClick={(e) => e.stopPropagation()}
              className="slider-modern w-full"
              style={{ '--slider-progress': `${((pendingSettings.fontScale - 0.8) / (1.2 - 0.8)) * 100}%` } as React.CSSProperties}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>80%</span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>120%</span>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 min-w-[60px] text-center text-sm font-bold rounded-lg ${isDark ? 'bg-gray-800 text-primary-400' : 'bg-gray-100 text-primary-600'
              }`}
          >
            {(pendingSettings.fontScale * 100).toFixed(0)}%
          </div>
        </div>
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Изменяет размер всех текстовых элементов в интерфейсе
        </p>
      </div>

      {/* Анимации */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Анимации
            </h3>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Плавные переходы и эффекты в интерфейсе
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSettingChange({ animationsEnabled: !pendingSettings.animationsEnabled })
            }}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ease-out ${pendingSettings.animationsEnabled ? 'bg-primary-500' : isDark ? 'bg-gray-700' : 'bg-gray-300'
              }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ease-out ${pendingSettings.animationsEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Превью мессенджера */}
      <div className="mb-8">
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Предварительный просмотр мессенджера
        </h3>
        <div
          className={`overflow-hidden shadow-2xl ${isModern
              ? 'border border-white/10'
              : `border-2 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-300'}`
            }`}
          style={{
            borderRadius: isModern ? '20px' : `var(--border-radius, 0.75rem)`,
            transform: `scale(${pendingSettings.compactMode === 'compact' ? '0.95' : pendingSettings.compactMode === 'cozy' ? '1.05' : '1'})`,
            background: isModern
              ? 'linear-gradient(135deg, rgba(15, 20, 45, 0.95) 0%, rgba(20, 30, 60, 0.98) 100%)'
              : undefined,
          }}
        >
          {/* Мини-версия MessengerPage */}
          <div className={`flex ${pendingSettings.navPosition === 'bottom' ? 'flex-col h-96' : 'flex-row h-96'
            } ${pendingSettings.navPosition === 'right' ? 'flex-row-reverse' : ''
            }`}>
            {/* Wrapper для чатов и контента с возможностью изменения порядка */}
            <div className={`flex-1 flex overflow-hidden flex-row ${pendingSettings.chatsPosition === 'right' ? 'flex-row-reverse' : ''
              }`}>
              {/* Навигация - показываем только для left/right */}
              {pendingSettings.navPosition !== 'bottom' && (
                <div className={`w-14 flex-shrink-0 flex flex-col items-center justify-center ${isModern
                    ? ''
                    : `${pendingSettings.navPosition === 'right' ? 'border-l' : 'border-r'} ${isDark ? 'bg-gray-900/40 border-gray-800/50' : 'bg-gray-100/90 border-gray-300/50'}`
                  }`}>
                  <div
                    className={`flex flex-col gap-1 ${isModern ? 'p-2' : ''}`}
                    style={isModern ? {
                      background: 'linear-gradient(180deg, rgba(70, 90, 160, 0.4) 0%, rgba(55, 75, 145, 0.5) 50%, rgba(70, 90, 160, 0.4) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '24px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
                    } : undefined}
                  >
                    {['home', 'groups', 'phone', 'chat', 'settings'].map((iconName, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 flex items-center justify-center transition-all duration-300 ${isModern
                            ? `rounded-full ${i === 3 ? 'bg-white/97 text-gray-900' : 'text-white/80'}`
                            : `rounded-lg ${i === 3 ? 'text-primary-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`
                          }`}
                        style={isModern && i === 3 ? { boxShadow: '0 4px 15px rgba(255, 255, 255, 0.3)' } : undefined}
                      >
                        {getNavIcon(iconName, 'w-4 h-4')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Панель чатов */}
              <div
                className={`flex-shrink-0 flex flex-col ${pendingSettings.navPosition === 'bottom' ? 'flex-1' : 'w-48'
                  } ${pendingSettings.chatsPosition === 'right' ? 'border-l' : 'border-r'
                  } ${isModern
                    ? 'border-white/5'
                    : `${isDark ? 'bg-gray-900/40 border-gray-800/50' : 'bg-white/90 border-gray-300/50'}`
                  }`}
                style={isModern ? {
                  background: 'linear-gradient(135deg, rgba(30, 40, 80, 0.6) 0%, rgba(20, 30, 70, 0.7) 100%)',
                } : undefined}
              >
                {/* Профиль пользователя */}
                <div className="mt-2 mb-1 px-3">
                  <div className="flex items-center py-2">
                    <div className="relative flex-shrink-0 w-8 h-8">
                      <div
                        className="relative w-full h-full overflow-hidden border-2 border-green-500/60"
                        style={{ borderRadius: `var(--border-radius, 0.75rem)` }}
                      >
                        {user?.avatar_url && avatarUrl && !avatarError ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="w-full h-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                            {user?.first_name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      {/* Индикатор онлайн */}
                      <div
                        className="absolute top-0 right-0 w-2 h-2 bg-green-500 border border-white"
                        style={{ borderRadius: `var(--border-radius, 0.75rem)` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 ml-2">
                      <div
                        className={`font-semibold text-xs truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
                        style={{ fontSize: `calc(0.75rem * ${pendingSettings.fontScale})` }}
                      >
                        {user?.first_name || 'Пользователь'} {user?.last_name || ''}
                      </div>
                      <div
                        className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                        style={{ fontSize: `calc(0.65rem * ${pendingSettings.fontScale})` }}
                      >
                        {user?.status_text || '@username'}
                      </div>
                    </div>
                    <button className={`p-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Разделитель */}
                <div className={`mx-3 border-t mb-1`} style={{ borderColor: isDark ? 'rgba(31, 41, 55, 0.5)' : 'rgba(209, 213, 219, 0.5)' }} />

                {/* Поиск */}
                <div className="px-3 py-2">
                  <div
                    className={`px-2 py-1.5 flex items-center gap-2 ${isModern
                        ? 'border border-white/10'
                        : `border ${isDark ? 'bg-gray-800/30 border-gray-700/40' : 'bg-white border-gray-300/60'}`
                      }`}
                    style={{
                      borderRadius: isModern ? '12px' : `var(--border-radius, 0.75rem)`,
                      background: isModern ? 'rgba(255, 255, 255, 0.06)' : undefined,
                    }}
                  >
                    <svg className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span
                      className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      style={{ fontSize: `calc(0.75rem * ${pendingSettings.fontScale})` }}
                    >
                      Поиск
                    </span>
                  </div>
                </div>

                {/* Список чатов */}
                <div className="flex-1 overflow-hidden">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 transition-colors ${isModern
                          ? `mx-2 rounded-xl ${i === 1
                            ? 'bg-[rgba(99,130,255,0.2)] border border-[rgba(99,130,255,0.3)]'
                            : 'bg-white/[0.03]'
                          }`
                          : (i === 1
                            ? (isDark ? 'bg-primary-500/10' : 'bg-primary-500/5')
                            : (isDark ? 'hover:bg-primary-500/5' : 'hover:bg-gray-100'))
                        }`}
                      style={{ marginBottom: `calc(${pendingSettings.messageSpacing}px / 3)` }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 flex-shrink-0 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200/80'}`}
                          style={{ borderRadius: `var(--border-radius, 0.75rem)` }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium text-xs truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
                            style={{ fontSize: `calc(0.75rem * ${pendingSettings.fontScale})` }}
                          >
                            Чат {i}
                          </div>
                          <div
                            className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                            style={{ fontSize: `calc(0.65rem * ${pendingSettings.fontScale})` }}
                          >
                            Последнее сообщение...
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Область чата */}
              <div
                className={`flex-1 flex flex-col ${isModern ? '' : (isDark ? 'bg-gray-950/50' : 'bg-gray-100/50')
                  }`}
                style={isModern ? {
                  background: 'linear-gradient(135deg, rgba(8, 12, 30, 0.95) 0%, rgba(12, 18, 40, 0.98) 100%)',
                } : undefined}
              >
                {/* Заголовок чата */}
                <div className={`px-4 py-3 flex items-center gap-2 ${isModern ? 'border-b border-white/5' : `border-b ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`
                  }`}>
                  <div
                    className={`w-8 h-8 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200/80'}`}
                    style={{ borderRadius: `var(--border-radius, 0.75rem)` }}
                  />
                  <div
                    className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
                    style={{ fontSize: `calc(0.875rem * ${pendingSettings.fontScale})` }}
                  >
                    Чат 1
                  </div>
                </div>

                {/* Сообщения */}
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  {/* Входящее сообщение */}
                  <div className="flex items-end gap-2" style={{ marginBottom: `${pendingSettings.messageSpacing}px` }}>
                    <div
                      className={`w-6 h-6 flex-shrink-0 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200/80'}`}
                      style={{ borderRadius: `var(--border-radius, 0.75rem)` }}
                    />
                    <div
                      className={`px-3 py-2 max-w-xs ${isModern
                          ? 'border border-white/10'
                          : (isDark ? 'bg-gray-800/50' : 'bg-white')
                        }`}
                      style={{
                        borderRadius: isModern ? '16px' : `var(--border-radius, 0.75rem)`,
                        fontSize: `calc(0.875rem * ${pendingSettings.fontScale})`,
                        background: isModern ? 'rgba(255, 255, 255, 0.08)' : undefined,
                        backdropFilter: isModern ? 'blur(10px)' : undefined,
                      }}
                    >
                      <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Привет! А ты знал что Dialect лучше чем Max?
                      </p>
                    </div>
                  </div>

                  {/* Исходящее сообщение */}
                  <div className="flex items-end gap-2 justify-end" style={{ marginBottom: `${pendingSettings.messageSpacing}px` }}>
                    <div
                      className={`px-3 py-2 max-w-xs text-white ${isModern ? 'border border-white/15' : 'bg-primary-500'
                        }`}
                      style={{
                        borderRadius: isModern ? '16px' : `var(--border-radius, 0.75rem)`,
                        fontSize: `calc(0.875rem * ${pendingSettings.fontScale})`,
                        background: isModern
                          ? 'linear-gradient(135deg, rgba(99, 110, 200, 0.9) 0%, rgba(79, 90, 180, 1) 100%)'
                          : undefined,
                        boxShadow: isModern ? '0 4px 20px rgba(99, 110, 200, 0.4)' : undefined,
                      }}
                    >
                      <p className="text-sm">
                        Конечно знал, Dialect же не следит за своими пользователями, как некоторые!
                      </p>
                    </div>
                  </div>

                  {/* Входящее сообщение */}
                  <div className="flex items-end gap-2" style={{ marginBottom: `${pendingSettings.messageSpacing}px` }}>
                    <div
                      className={`w-6 h-6 flex-shrink-0 ${isDark ? 'bg-gray-800/50' : 'bg-gray-200/80'}`}
                      style={{ borderRadius: `var(--border-radius, 0.75rem)` }}
                    />
                    <div
                      className={`px-3 py-2 max-w-xs ${isModern
                          ? 'border border-white/10'
                          : (isDark ? 'bg-gray-800/50' : 'bg-white')
                        }`}
                      style={{
                        borderRadius: isModern ? '16px' : `var(--border-radius, 0.75rem)`,
                        fontSize: `calc(0.875rem * ${pendingSettings.fontScale})`,
                        background: isModern ? 'rgba(255, 255, 255, 0.08)' : undefined,
                        backdropFilter: isModern ? 'blur(10px)' : undefined,
                      }}
                    >
                      <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Верно сказано 😁
                      </p>
                    </div>
                  </div>
                </div>

                {/* Поле ввода */}
                <div className={`px-4 py-3 ${isModern ? 'border-t border-white/5' : `border-t ${isDark ? 'border-gray-800/50' : 'border-gray-300/50'}`
                  }`}>
                  <div
                    className={`px-3 py-2 flex items-center gap-2 ${isModern
                        ? 'border border-white/10'
                        : `border ${isDark ? 'bg-gray-800/30 border-gray-700/40' : 'bg-white border-gray-300/60'}`
                      }`}
                    style={{
                      borderRadius: isModern ? '14px' : `var(--border-radius, 0.75rem)`,
                      background: isModern ? 'rgba(255, 255, 255, 0.06)' : undefined,
                    }}
                  >
                    <span
                      className={`text-xs flex-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                      style={{ fontSize: `calc(0.75rem * ${pendingSettings.fontScale})` }}
                    >
                      Сообщение...
                    </span>
                    <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Навигация снизу - показываем только для bottom */}
            {pendingSettings.navPosition === 'bottom' && (
              <div className={`h-14 flex-shrink-0 flex items-center justify-center ${isModern
                  ? ''
                  : `border-t ${isDark ? 'bg-gray-900/40 border-gray-800/50' : 'bg-gray-100/90 border-gray-300/50'}`
                }`}>
                <div
                  className={`flex flex-row gap-1 ${isModern ? 'px-3 py-2' : ''}`}
                  style={isModern ? {
                    background: 'linear-gradient(90deg, rgba(70, 90, 160, 0.4) 0%, rgba(55, 75, 145, 0.5) 50%, rgba(70, 90, 160, 0.4) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
                  } : undefined}
                >
                  {['home', 'groups', 'phone', 'chat', 'settings'].map((iconName, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 flex items-center justify-center transition-all duration-300 ${isModern
                          ? `rounded-full ${i === 3 ? 'bg-white/97 text-gray-900' : 'text-white/80'}`
                          : `rounded-lg ${i === 3 ? 'text-primary-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`
                        }`}
                      style={isModern && i === 3 ? { boxShadow: '0 4px 15px rgba(255, 255, 255, 0.3)' } : undefined}
                    >
                      {getNavIcon(iconName, 'w-4 h-4')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className={`text-xs mt-3 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Это предварительный просмотр. Настройки применяются ко всему приложению.
        </p>
      </div>

      {/* Кнопки действий */}
      <div className={`flex items-center justify-between pt-6 border-t ${isDark ? 'border-gray-800/50' : 'border-gray-200'
        }`}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReset()
          }}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          Сбросить настройки
        </button>
        <div className="flex gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCancel()
            }}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            Отмена
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSave()
            }}
            disabled={!hasChanges}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${hasChanges
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : isDark
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
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
  const { settings: appearanceSettings } = useAppearance()
  const isDark = theme === 'dark'
  const isModern = appearanceSettings.designStyle === 'modern'

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
  const [shouldAnimateEnter, setShouldAnimateEnter] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const [indicatorTop, setIndicatorTop] = useState(0)
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})
  const appearanceSaveRef = useRef<(() => void) | null>(null)

  const getFormattedPhoneNumber = (phoneNumber?: string, countryCode?: string) => {
    if (!phoneNumber) return ''
    try {
      const phoneNumberParsed = parsePhoneNumberFromString(phoneNumber, countryCode as any)
      return phoneNumberParsed ? phoneNumberParsed.formatInternational() : phoneNumber
    } catch (error) {
      console.error('Ошибка при форматировании номера телефона:', error)
      return phoneNumber
    }
  }

  // Функция закрытия с проверкой изменений
  const handleClose = React.useCallback(() => {
    if (hasUnsavedChanges && activeTab === 'appearance') {
      setShowCloseWarning(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, activeTab, onClose])

  // Обработка ESC для закрытия
  useEffect(() => {
    if (!isOpen || showCloseWarning) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEsc, { capture: true })
    return () => window.removeEventListener('keydown', handleEsc, { capture: true })
  }, [isOpen, showCloseWarning, handleClose])

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

  // Анимация появления и закрытия
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      // Небольшая задержка для запуска анимации входа после монтирования
      const timer = setTimeout(() => {
        setShouldAnimateEnter(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      setShouldAnimateEnter(false)
      const timer = setTimeout(() => setIsAnimating(false), 400)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Функция для расчета позиции индикатора
  const calculateIndicatorPosition = React.useCallback(() => {
    const activeButton = tabRefs.current[activeTab]
    if (activeButton) {
      const parent = activeButton.parentElement
      if (parent) {
        // Используем getBoundingClientRect для точного расчета с учетом всех отступов
        const buttonRect = activeButton.getBoundingClientRect()
        const parentRect = parent.getBoundingClientRect()

        // Вычисляем относительную позицию кнопки внутри родителя
        // Учитываем scrollTop для правильного позиционирования при прокрутке
        const relativeTop = buttonRect.top - parentRect.top + parent.scrollTop

        // Высота индикатора (h-11 = 44px)
        const INDICATOR_HEIGHT = 44
        // Высота кнопки
        const BUTTON_HEIGHT = buttonRect.height

        // Центрируем индикатор относительно кнопки
        const centerOffset = (BUTTON_HEIGHT - INDICATOR_HEIGHT) / 2

        setIndicatorTop(relativeTop + centerOffset)
      }
    }
  }, [activeTab])

  // Расчёт позиции индикатора на основе реальной позиции кнопки
  useEffect(() => {
    // Добавляем небольшую задержку для полного рендера DOM
    const timeoutId = setTimeout(() => {
      calculateIndicatorPosition()
    }, 10) // Небольшая задержка для завершения рендера

    return () => clearTimeout(timeoutId)
  }, [activeTab, isOpen, calculateIndicatorPosition])

  // Пересчет позиции при прокрутке и изменении размера окна
  useEffect(() => {
    if (!isOpen) return

    const parent = tabRefs.current[activeTab]?.parentElement
    if (!parent) return

    const handleScroll = () => {
      calculateIndicatorPosition()
    }

    const handleResize = () => {
      calculateIndicatorPosition()
    }

    parent.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      parent.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, activeTab, calculateIndicatorPosition])

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
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/60'
          } ${shouldAnimateEnter && isOpen ? 'animate-backdrop-enter' : !isOpen && isAnimating ? 'animate-backdrop-exit' : 'opacity-0'}`}
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
      />

      {/* Модальное окно */}
      <div
        className={`relative w-[90vw] h-[90vh] max-w-[1200px] rounded-2xl shadow-2xl overflow-hidden ${isModern
            ? 'modern-modal'
            : (isDark
              ? 'bg-gray-900 border border-gray-800/50'
              : 'bg-white border border-gray-200')
          } ${shouldAnimateEnter && isOpen ? 'animate-modal-enter' : !isOpen && isAnimating ? 'animate-modal-exit' : 'opacity-0 scale-95 translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 z-10 p-2 rounded-lg transition-all hover:rotate-90 ${isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Модальное окно предупреждения */}
        {showCloseWarning && (
          <div
            className="absolute inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-96 p-8 rounded-2xl shadow-2xl transform transition-all scale-100 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <div className={`mx-auto w-12 h-12 mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-yellow-500/20 text-yellow-500' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Несохранённые изменения
                  </h3>
                  <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    У вас есть несохранённые изменения. Вы хотите сохранить их перед закрытием?
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Вызываем функцию сохранения, если она доступна
                      if (appearanceSaveRef.current) {
                        appearanceSaveRef.current()
                      }
                      setShowCloseWarning(false)
                      setHasUnsavedChanges(false)
                      onClose()
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Сохранить и выйти
                  </button>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCloseWarning(false)
                        setHasUnsavedChanges(false)
                        onClose()
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isDark
                          ? 'bg-gray-700 text-red-400 hover:bg-gray-600 hover:text-red-300'
                          : 'bg-gray-100 text-red-600 hover:bg-gray-200 hover:text-red-700'
                        }`}
                    >
                      Не сохранять
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCloseWarning(false)
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${isDark
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Контент настроек */}
        <div className={`flex h-full w-full ${shouldAnimateEnter && isOpen ? 'animate-modal-content-enter' : 'opacity-0'}`}>
          {/* Левая панель навигации */}
          <div className={`w-72 flex-shrink-0 border-r flex flex-col ${isModern
              ? 'modern-settings-sidebar'
              : (isDark ? 'border-gray-800/50 bg-gray-900/50' : 'border-gray-200 bg-gray-50/50')
            }`}>
            {/* Заголовок */}
            <div className={`px-6 py-6 border-b ${isDark ? 'border-gray-800/50' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Настройки
              </h2>
            </div>

            {/* Навигационные вкладки */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-thin relative">
              {/* Анимированный индикатор */}
              <div
                className={`absolute right-0 w-1 h-11 rounded-l-full transition-all duration-300 ease-out ${isModern ? 'modern-tab-indicator' : 'bg-primary-500'
                  }`}
                style={{
                  top: `${indicatorTop}px`,
                  opacity: indicatorTop > 0 ? 1 : 0,
                }}
              />

              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[tab.id] = el }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTab(tab.id)
                    }}
                    className={`w-full px-6 py-3 flex items-center gap-3 text-left transition-all duration-300 ${isModern
                        ? `modern-settings-item ${isActive ? 'active' : ''}`
                        : ''
                      } ${!isModern && (isActive
                        ? isDark
                          ? 'text-primary-400'
                          : 'text-primary-600'
                        : isDark
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50')
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
                  <div className={`relative w-full h-full rounded-full overflow-hidden border-2 ${isDark ? 'border-gray-700' : 'border-gray-300'
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
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark
                              ? 'bg-primary-500 text-white hover:bg-primary-600'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                            }`}
                        >
                          Загрузить фото
                        </button>
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark
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
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${isDark
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
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${isDark
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
                        className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${isDark
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
                      defaultValue={getFormattedPhoneNumber(user?.phone_number, user?.country || 'US')}
                      disabled
                      className={`w-full px-4 py-3 border rounded-lg cursor-not-allowed opacity-60 ${isDark
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
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${isDark
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
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${isDark
                          ? 'bg-gray-800/50 border-gray-700 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    />
                  </div>

                  {/* Кнопки сохранения и отмены */}
                  <div className={`flex items-center justify-end gap-3 pt-6 border-t mt-8 ${isDark ? 'border-gray-800/50' : 'border-gray-200'
                    }`}>
                    <button
                      onClick={onClose}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark
                          ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                      Отмена
                    </button>
                    <button
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark
                          ? 'bg-primary-500 text-white hover:bg-primary-600'
                          : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                    >
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              ) : activeTab === 'appearance' ? (
                <AppearanceTab
                  isDark={isDark}
                  onClose={onClose}
                  onSettingsChange={() => setHasUnsavedChanges(true)}
                  saveRef={appearanceSaveRef}
                />
              ) : activeTab === 'sessions' ? (
                <SessionsTab onClose={onClose} />
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