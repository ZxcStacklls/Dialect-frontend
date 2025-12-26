import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light' | 'auto'
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'red'
export type BorderRadius = 'small' | 'medium' | 'large'
export type CompactMode = 'default' | 'compact' | 'cozy'
export type DesignStyle = 'default' | 'modern' | 'classic'
export type NavPosition = 'left' | 'right' | 'bottom'
export type ChatsPosition = 'left' | 'right'

interface AppearanceSettings {
  themeMode: ThemeMode
  accentColor: AccentColor
  borderRadius: BorderRadius
  compactMode: CompactMode
  designStyle: DesignStyle
  navPosition: NavPosition
  chatsPosition: ChatsPosition
  blurIntensity: number // 0-100
  messageSpacing: number // 0-20
  animationsEnabled: boolean
  fontScale: number // 0.8-1.2
}

interface AppearanceContextType {
  settings: AppearanceSettings
  updateSettings: (newSettings: Partial<AppearanceSettings>) => void
  resetSettings: () => void
  currentTheme: 'dark' | 'light'
}

const defaultSettings: AppearanceSettings = {
  themeMode: 'dark',
  accentColor: 'blue',
  borderRadius: 'medium',
  compactMode: 'default',
  designStyle: 'default',
  navPosition: 'left',
  chatsPosition: 'left',
  blurIntensity: 60,
  messageSpacing: 12,
  animationsEnabled: true,
  fontScale: 1,
}

// Цветовые палитры для акцентных цветов
export const accentColors = {
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

export const useAppearance = () => {
  const context = useContext(AppearanceContext)
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider')
  }
  return context
}

interface AppearanceProviderProps {
  children: ReactNode
}

export const AppearanceProvider: React.FC<AppearanceProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppearanceSettings>(() => {
    const saved = localStorage.getItem('appearanceSettings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Merge with defaultSettings to ensure new fields (like navPosition) exist
        return { ...defaultSettings, ...parsed }
      } catch {
        return defaultSettings
      }
    }
    return defaultSettings
  })

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark')

  // Определяем актуальную тему с учётом режима auto
  useEffect(() => {
    const determineTheme = () => {
      if (settings.themeMode === 'auto') {
        const hour = new Date().getHours()
        // Тёмная тема с 18:00 до 6:00, светлая с 6:00 до 18:00
        return hour >= 18 || hour < 6 ? 'dark' : 'light'
      }
      return settings.themeMode
    }

    const theme = determineTheme()

    // Мгновенная смена темы без анимации
    const applyThemeInstantly = () => {
      // Применяем новую тему
      document.documentElement.setAttribute('data-theme', theme)
      document.body.setAttribute('data-theme', theme)
      const root = document.getElementById('root')
      if (root) {
        root.setAttribute('data-theme', theme)
      }

      // Прямая манипуляция DOM для nav-panel для мгновенного изменения
      const navPanel = document.querySelector('.nav-panel')
      if (navPanel) {
        const bgColor = theme === 'light'
          ? 'rgba(243, 244, 246, 0.95)'
          : 'rgba(17, 24, 39, 0.95)'
          ; (navPanel as HTMLElement).style.backgroundColor = bgColor
      }

      setCurrentTheme(theme)
    }

    applyThemeInstantly()

    // Если режим auto, проверяем каждую минуту
    if (settings.themeMode === 'auto') {
      const interval = setInterval(() => {
        const newTheme = determineTheme()
        if (newTheme !== currentTheme) {
          // Тема изменится при следующем рендере через useEffect
          setCurrentTheme(newTheme)
        }
      }, 60000) // Проверяем каждую минуту

      return () => clearInterval(interval)
    }
  }, [settings.themeMode])

  // Применяем настройки к CSS переменным
  useEffect(() => {
    const root = document.documentElement
    const colors = accentColors[settings.accentColor]

    // Применяем акцентный цвет
    Object.entries(colors).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color)
    })

    // Применяем радиус скругления
    const radiusMap = {
      small: '0.5rem', // 8px
      medium: '0.75rem', // 12px
      large: '1rem', // 16px
    }
    root.style.setProperty('--border-radius', radiusMap[settings.borderRadius])

    // Применяем интенсивность размытия
    root.style.setProperty('--blur-intensity', `${settings.blurIntensity / 10}px`)

    // Применяем расстояние между сообщениями
    root.style.setProperty('--message-spacing', `${settings.messageSpacing}px`)

    // Применяем режим компактности
    const compactMap = {
      default: '1',
      compact: '0.9',
      cozy: '1.1',
    }
    root.style.setProperty('--ui-scale', compactMap[settings.compactMode])

    // Применяем масштаб шрифта
    root.style.setProperty('--font-scale', `${settings.fontScale}`)

    // Применяем стиль дизайна
    root.setAttribute('data-design-style', settings.designStyle)

    // Применяем или отключаем анимации
    if (!settings.animationsEnabled) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }

    // Сохраняем в localStorage
    localStorage.setItem('appearanceSettings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (newSettings: Partial<AppearanceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  const value: AppearanceContextType = {
    settings,
    updateSettings,
    resetSettings,
    currentTheme,
  }

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}