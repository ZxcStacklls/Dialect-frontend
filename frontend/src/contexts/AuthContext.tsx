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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
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
    } catch (error) {
      console.error('Ошибка при загрузке данных пользователя:', error)
      setUser(null)
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

  // Автоматическое обновление профиля каждые 30 секунд
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
    }, 30000) // Обновляем каждые 30 секунд

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

