import { AxiosInstance } from 'axios'

type LogoutFunction = () => void
type AddToastFunction = (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void

let isInterceptorSetup = false

export const setupAxiosInterceptors = (
  apiClient: AxiosInstance,
  logout: LogoutFunction,
  addToast: AddToastFunction
) => {
  if (isInterceptorSetup) return
  isInterceptorSetup = true

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const originalRequest = error.config

      // Обработка 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true
        
        // Если ошибка связана с истекшим токеном или невалидной сессией
        logout()
        
        // Показываем уведомление, только если это не страница логина
        if (!window.location.hash.includes('/login')) {
          addToast('Сессия истекла. Пожалуйста, войдите снова.', 'error')
          // Редирект произойдет автоматически из-за изменения состояния auth
        }
        
        return Promise.reject(error)
      }

      // Обработка других ошибок, связанных с аккаунтом (например, 403 Forbidden или 404 Not Found для user/me)
      if (
        (error.response?.status === 403 || (error.response?.status === 404 && originalRequest.url.includes('/users/me'))) &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true
        logout()
        // Показываем уведомление, только если это не страница логина/регистрации
        if (!window.location.hash.includes('/login') && !window.location.hash.includes('/signup')) {
          addToast('Ошибка доступа к аккаунту. Пожалуйста, войдите снова.', 'error')
        }
        return Promise.reject(error)
      }

      // Глобальная обработка сетевых ошибок (500 и т.д.)
      if (!error.response && error.message === 'Network Error') {
        addToast('Ошибка сети. Проверьте подключение к интернету.', 'error')
      }

      return Promise.reject(error)
    }
  )
}

