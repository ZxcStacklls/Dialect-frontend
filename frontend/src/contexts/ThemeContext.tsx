import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Загружаем тему из localStorage или используем темную по умолчанию
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const initialTheme = savedTheme || 'dark'
    
    // Применяем тему сразу при инициализации
    document.documentElement.setAttribute('data-theme', initialTheme)
    document.body.setAttribute('data-theme', initialTheme)
    const root = document.getElementById('root')
    if (root) {
      root.setAttribute('data-theme', initialTheme)
    }
    
    return initialTheme
  })

  useEffect(() => {
    // Применяем тему к документу и body при изменении
    document.documentElement.setAttribute('data-theme', theme)
    document.body.setAttribute('data-theme', theme)
    const root = document.getElementById('root')
    if (root) {
      root.setAttribute('data-theme', theme)
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

