import apiClient from './client'

export interface RegisterData {
  phone_number: string
  username?: string
  first_name: string
  last_name?: string
  password: string
  public_key: string
}

export interface LoginData {
  phone_number: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  username?: string
  first_name: string
  last_name?: string
  avatar_url?: string
  bio?: string
  is_online: boolean
}

export const authAPI = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post('/v1/auth/register', data)
    return response.data
  },

  login: async (data: LoginData): Promise<TokenResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', data.phone_number)
    formData.append('password', data.password)

    const response = await apiClient.post('/v1/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  checkPhoneExists: async (phone_number: string): Promise<boolean> => {
    try {
      // Используем безопасный эндпоинт для проверки номера без создания пользователя
      const response = await apiClient.post('/v1/auth/check-phone', {
        phone_number
      })
      return response.data.exists || false
    } catch (error: any) {
      // Если произошла ошибка, считаем что номер свободен
      // чтобы не блокировать регистрацию из-за временных проблем
      console.warn('Ошибка при проверке номера телефона:', error)
      return false
    }
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post('/v1/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

