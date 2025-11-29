import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { authAPI, User } from '../api/auth'
import apiClient from '../api/client'
import { setupAxiosInterceptors } from '../utils/axiosInterceptors'
import { useToast } from './ToastContext'
import { canSendRequests, useVisibilityChange, useOnlineStatus } from '../utils/appState'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (phone_number: string, password: string) => Promise<void>
  register: (data: {
    phone_number: string
    username?: string
    first_name: string
    last_name?: string
    password: string
    public_key: string
  }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

const USER_STORAGE_KEY = 'dialect_user_data'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Загружаем данные пользователя из localStorage при инициализации
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY)
      if (storedUser) {
        return JSON.parse(storedUser)
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных пользователя из localStorage:', error)
    }
    return null
  })
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  // Сохраняем данные пользователя в localStorage при изменении
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      } catch (error) {
        console.error('Ошибка при сохранении данных пользователя в localStorage:', error)
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [user])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem(USER_STORAGE_KEY)
    setToken(null)
    setUser(null)
    // Редирект на страницу логина
    if (!window.location.hash.includes('/login') && !window.location.hash.includes('/signup')) {
      window.location.hash = '#/login'
    }
  }, [])

  // Настройка interceptors при монтировании
  useEffect(() => {
    setupAxiosInterceptors(apiClient, logout, addToast)
  }, [logout, addToast])

  const loadUser = async (token: string) => {
    try {
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
      // Сохраняем в localStorage при успешной загрузке
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
      } catch (error) {
        console.error('Ошибка при сохранении данных пользователя:', error)
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных пользователя:', error)
      // Не сбрасываем пользователя при ошибке - используем кешированные данные
      // setUser(null) - убрано, чтобы профиль не пропадал
    }
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token')
    if (storedToken) {
      setToken(storedToken)
      loadUser(storedToken)
    }
    setLoading(false)
  }, [])

  // Автоматическое обновление профиля каждые 60 секунд
  // НЕ отправляет запросы, если приложение закрыто или нет интернета
  useEffect(() => {
    if (!token) return

    const interval = setInterval(async () => {
      // Проверяем, можно ли отправлять запросы
      if (!canSendRequests()) {
        console.log('Пропуск обновления профиля: приложение не видно или нет интернета')
        return
      }

      try {
        await loadUser(token)
      } catch (error) {
        console.error('Ошибка при автообновлении профиля:', error)
      }
    }, 60000) // Обновляем каждые 60 секунд

    // Обновляем профиль при возврате приложения в фокус
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && canSendRequests()) {
        loadUser(token).catch(err => 
          console.error('Ошибка при обновлении профиля после возврата в фокус:', err)
        )
      }
    }

    // Обновляем профиль при восстановлении интернета
    const handleOnline = () => {
      if (canSendRequests()) {
        loadUser(token).catch(err => 
          console.error('Ошибка при обновлении профиля после восстановления интернета:', err)
        )
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const login = async (phone_number: string, password: string) => {
    try {
      const response = await authAPI.login({ phone_number, password })
      const accessToken = response.access_token
      localStorage.setItem('access_token', accessToken)
      setToken(accessToken)
      await loadUser(accessToken)
    } catch (error) {
      throw error
    }
  }

  const register = async (data: {
    phone_number: string
    username?: string
    first_name: string
    last_name?: string
    password: string
    public_key: string
  }) => {
    try {
      await authAPI.register(data)
      // После регистрации автоматически входим
      await login(data.phone_number, data.password)
    } catch (error) {
      throw error
    }
  }

  const refreshUser = async () => {
    if (token) {
      await loadUser(token)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!token,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

