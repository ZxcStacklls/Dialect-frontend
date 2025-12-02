/**
 * Утилиты для проверки состояния приложения
 * Используется для оптимизации запросов к серверу
 */

/**
 * Проверяет, видно ли приложение пользователю
 * @returns true если приложение видно, false если скрыто/свернуто
 */
export const isAppVisible = (): boolean => {
  // Page Visibility API - работает в браузере и Electron
  if (typeof document !== 'undefined' && document.visibilityState !== undefined) {
    return document.visibilityState === 'visible'
  }
  // Если API недоступен, считаем что приложение видно
  return true
}

/**
 * Проверяет, есть ли подключение к интернету
 * @returns true если есть интернет, false если нет
 */
export const isOnline = (): boolean => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine
  }
  // Если API недоступен, считаем что есть интернет
  return true
}

/**
 * Проверяет доступность сервера
 * @returns Promise<boolean> true если сервер доступен, false если нет
 */
let serverCheckCache: { result: boolean; timestamp: number } | null = null
const SERVER_CHECK_CACHE_DURATION = 10000 // Кешируем результат на 10 секунд

export const isServerAvailable = async (): Promise<boolean> => {
  // Проверяем кеш
  if (serverCheckCache && Date.now() - serverCheckCache.timestamp < SERVER_CHECK_CACHE_DURATION) {
    return serverCheckCache.result
  }

  // Сначала проверяем базовое подключение к интернету
  if (!isOnline()) {
    serverCheckCache = { result: false, timestamp: Date.now() }
    return false
  }

  try {
    // Импортируем getApiBaseUrl динамически, чтобы избежать циклических зависимостей
    const { getApiBaseUrl } = await import('./platform')
    const apiBaseUrl = getApiBaseUrl()
    
    // Убираем /api из базового URL, чтобы получить корневой URL сервера
    const baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '')
    
    // Используем корневой эндпоинт "/" для проверки доступности сервера
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // Таймаут 3 секунды
    
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET', // Используем GET вместо HEAD, так как HEAD возвращает 405
      signal: controller.signal,
      cache: 'no-cache'
    }).catch(() => null)
    
    clearTimeout(timeoutId)
    
    // Сервер доступен, если получили успешный ответ
    const isAvailable = response !== null && response.ok
    serverCheckCache = { result: isAvailable, timestamp: Date.now() }
    return isAvailable
  } catch (error) {
    serverCheckCache = { result: false, timestamp: Date.now() }
    return false
  }
}

/**
 * Проверяет, можно ли отправлять запросы к серверу
 * @returns true если можно отправлять запросы, false если нельзя
 */
export const canSendRequests = (): boolean => {
  return isAppVisible() && isOnline()
}

/**
 * Хук для отслеживания изменений видимости приложения
 * @param callback Функция, которая будет вызвана при изменении видимости
 */
export const useVisibilityChange = (callback: (isVisible: boolean) => void) => {
  if (typeof document === 'undefined') return

  const handleVisibilityChange = () => {
    callback(document.visibilityState === 'visible')
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

/**
 * Хук для отслеживания изменений состояния сети
 * @param callback Функция, которая будет вызвана при изменении состояния сети
 */
export const useOnlineStatus = (callback: (isOnline: boolean) => void) => {
  if (typeof window === 'undefined') return

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}







