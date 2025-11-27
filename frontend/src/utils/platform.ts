/**
 * Утилиты для работы с Electron
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
    }
  }
}

/**
 * Получает информацию о платформе
 */
export const getPlatform = (): Promise<string> => {
  if (window.electron?.getPlatform) {
    return window.electron.getPlatform()
  }
  return Promise.resolve('unknown')
}

/**
 * Получает базовый URL для API
 */
export const getApiBaseUrl = (): string => {
  // Используем переменную окружения или конфиг
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  
  // По умолчанию localhost
  return 'http://localhost:8000/api'
}

