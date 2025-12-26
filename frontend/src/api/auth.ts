import apiClient from './client'

export interface RegisterData {
  phone_number: string
  username?: string
  first_name: string
  last_name?: string
  password: string
  public_key: string
  country?: string  // Код страны (например, 'RU', 'KZ', 'BY')
}

export interface LoginData {
  phone_number: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
}

export interface User {
  id: number
  username?: string
  first_name: string
  last_name?: string
  avatar_url?: string
  bio?: string
  status_text?: string
  is_online: boolean
  phone_number?: string // Добавляем сюда
  country?: string // Добавляем сюда
  birth_date?: string
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

  checkUsernameAvailability: async (username: string): Promise<boolean> => {
    try {
      if (!username || username.length < 3) {
        return false
      }
      const response = await apiClient.get(`/v1/users/check-username/${encodeURIComponent(username)}`)
      return response.data.is_available || false
    } catch (error: any) {
      // Если произошла ошибка, считаем что username недоступен
      console.warn('Ошибка при проверке уникальности username:', error)
      return false
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/v1/users/me')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch('/v1/users/me', data)
    return response.data
  },

  sendCode: async (phone_number: string, forRegistration: boolean = false): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/v1/auth/send-code', {
      phone_number,
      for_registration: forRegistration
    })
    return response.data
  },

  verifyCode: async (phone_number: string, code: string, forRegistration: boolean = false): Promise<TokenResponse | { success: boolean; message: string }> => {
    const response = await apiClient.post('/v1/auth/verify-code', { phone_number, code, for_registration: forRegistration })
    return response.data
  },

  logout: async (refresh_token: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/v1/auth/logout', { refresh_token })
    return response.data
  },
}

