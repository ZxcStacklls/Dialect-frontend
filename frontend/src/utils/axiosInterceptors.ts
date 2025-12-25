import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { getApiBaseUrl } from './platform'

type LogoutFunction = () => void
type AddToastFunction = (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void

let isInterceptorSetup = false
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else if (token) {
      resolve(token)
    }
  })
  failedQueue = []
}

export const setupAxiosInterceptors = (
  apiClient: AxiosInstance,
  logout: LogoutFunction,
  addToast: AddToastFunction
) => {
  if (isInterceptorSetup) return
  isInterceptorSetup = true

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      // Пропускаем ошибки без response или на странице логина
      if (!error.response || !originalRequest) {
        return Promise.reject(error)
      }

      // Обработка 401 Unauthorized
      if (error.response.status === 401 && !originalRequest._retry) {
        // Если это запрос на refresh - сразу logout
        if (originalRequest.url?.includes('/auth/refresh')) {
          logout()
          if (!window.location.hash.includes('/login')) {
            addToast('Сессия истекла. Пожалуйста, войдите снова.', 'error')
          }
          return Promise.reject(error)
        }

        // Если уже идет процесс обновления токена - ставим запрос в очередь
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return apiClient(originalRequest)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        const refreshToken = localStorage.getItem('refresh_token')

        // Если нет refresh токена - сразу logout
        if (!refreshToken) {
          isRefreshing = false
          logout()
          if (!window.location.hash.includes('/login')) {
            addToast('Сессия истекла. Пожалуйста, войдите снова.', 'error')
          }
          return Promise.reject(error)
        }

        try {
          // Вызываем refresh эндпоинт
          const API_BASE_URL = getApiBaseUrl()
          const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
            refresh_token: refreshToken
          })

          const { access_token, refresh_token: newRefreshToken } = response.data

          // Сохраняем новые токены
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', newRefreshToken)

          // Обрабатываем очередь запросов
          processQueue(null, access_token)

          // Повторяем оригинальный запрос
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh не удался - logout
          processQueue(refreshError as Error, null)
          logout()
          if (!window.location.hash.includes('/login')) {
            addToast('Сессия истекла. Пожалуйста, войдите снова.', 'error')
          }
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // Обработка других ошибок, связанных с аккаунтом
      if (
        (error.response.status === 403 ||
          (error.response.status === 404 && originalRequest.url?.includes('/users/me'))) &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true
        logout()
        if (!window.location.hash.includes('/login') && !window.location.hash.includes('/signup')) {
          addToast('Ошибка доступа к аккаунту. Пожалуйста, войдите снова.', 'error')
        }
        return Promise.reject(error)
      }

      // Сетевые ошибки - не показываем toast
      if (!error.response) {
        return Promise.reject(error)
      }

      // Серверные ошибки (5xx) - не показываем toast
      if (error.response.status >= 500 && error.response.status < 600) {
        return Promise.reject(error)
      }

      return Promise.reject(error)
    }
  )
}
