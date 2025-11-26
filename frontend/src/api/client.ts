import axios from 'axios'
import { getApiBaseUrl } from '../utils/platform'

const API_BASE_URL = getApiBaseUrl()

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor для добавления токена к запросам
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Не перенаправляем на странице входа/регистрации - там 401 это нормальная ошибка
      const currentPath = window.location.hash.replace('#', '') || window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/signup') {
        localStorage.removeItem('access_token')
        // Используем hash routing для Electron
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient

