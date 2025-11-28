import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI, User } from '../api/auth'

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
  useEffect(() => {
    if (!token) return

    const interval = setInterval(async () => {
      try {
        await loadUser(token)
      } catch (error) {
        console.error('Ошибка при автообновлении профиля:', error)
      }
    }, 30000) // Обновляем каждые 30 секунд

    return () => clearInterval(interval)
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

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
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

