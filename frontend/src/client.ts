import axios from 'axios'
import { getApiBaseUrl } from './utils/platform'

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

// Interceptor для обработки ошибок (детальная обработка в axiosInterceptors.ts)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Основная логика 401/refresh находится в axiosInterceptors.ts
    // Здесь оставляем только базовую обработку для случаев когда interceptors еще не настроены
    return Promise.reject(error)
  }
)

export default apiClient

