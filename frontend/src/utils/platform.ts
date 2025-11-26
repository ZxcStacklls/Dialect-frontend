/**
 * Утилиты для определения платформы и работы с Electron
 */

// Расширяем Window интерфейс для TypeScript
declare global {
  interface Window {
    electron?: {
      platform: string
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
      onWindowMaximized: (callback: (isMaximized: boolean) => void) => void
      isElectron: boolean
    }
    isElectron?: boolean
  }
}

/**
 * Проверяет, запущено ли приложение в Electron
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         (window.electron !== undefined || window.isElectron === true)
}

/**
 * Проверяет, запущено ли приложение в браузере
 */
export const isWeb = (): boolean => {
  return !isElectron()
}

/**
 * Получает информацию о платформе
 */
export const getPlatform = (): string => {
  if (isElectron() && window.electron) {
    return window.electron.platform || 'unknown'
  }
  return 'web'
}

/**
 * Безопасная навигация (работает и в Web и в Electron)
 */
export const navigate = (path: string): void => {
  if (isElectron()) {
    // В Electron используем hash routing для совместимости
    window.location.hash = path
    // Или можно использовать React Router напрямую
  } else {
    // В Web используем обычную навигацию
    window.location.href = path
  }
}

/**
 * Получает базовый URL для API
 * В Electron может отличаться от Web версии
 */
export const getApiBaseUrl = (): string => {
  // В Electron можно использовать переменную окружения или конфиг
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  
  // По умолчанию localhost
  return 'http://localhost:8000/api'
}

