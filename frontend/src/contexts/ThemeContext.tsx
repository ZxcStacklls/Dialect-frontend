import { useAppearance } from './AppearanceContext'

export type Theme = 'dark' | 'light'

// Хук для обратной совместимости с существующим кодом
export const useTheme = () => {
  const { currentTheme, settings, updateSettings } = useAppearance()
  
  return {
    theme: currentTheme,
    toggleTheme: () => {
      const newMode = currentTheme === 'dark' ? 'light' : 'dark'
      updateSettings({ themeMode: newMode })
    },
    setTheme: (theme: Theme) => {
      updateSettings({ themeMode: theme })
    },
  }
}

