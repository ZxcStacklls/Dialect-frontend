import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DefaultAvatar from '../components/DefaultAvatar'

const MessengerPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [selectedChat, setSelectedChat] = useState<number | null>(null)
  // TODO: Заменить на реальные данные из API
  const chats: any[] = [] // Пока пустой массив для демонстрации

  const hasChats = chats.length > 0
  const hasSelectedChat = selectedChat !== null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Верхняя панель с аватаркой пользователя */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          {user && (
            <>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.first_name} ${user.last_name || ''}`}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                />
              ) : (
                <DefaultAvatar
                  firstName={user.first_name}
                  lastName={user.last_name}
                  size={40}
                />
              )}
              <div className="flex flex-col">
                <span className="text-white font-semibold text-base">
                  {user.first_name} {user.last_name || ''}
                </span>
                {user.username && (
                  <span className="text-gray-400 text-sm">@{user.username}</span>
                )}
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors text-sm font-medium"
        >
          Выйти
        </button>
      </div>

      {/* Основная область */}
      <div className="flex flex-1 overflow-hidden">
        {/* Боковая панель со списком чатов (будет реализована позже) */}
        <div className="w-80 bg-gray-800/30 border-r border-gray-700/50 flex-shrink-0">
          {/* TODO: Список чатов */}
        </div>

        {/* Центральная область - чат или пустое состояние */}
        <div className="flex-1 flex items-center justify-center bg-gray-900/50">
          {hasSelectedChat ? (
            // TODO: Область открытого чата
            <div className="text-center">
              <p className="text-gray-400">Чат открыт</p>
            </div>
          ) : hasChats ? (
            // Есть чаты, но ни один не выбран
            <div className="text-center px-8">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <svg
                    className="w-24 h-24 mx-auto text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Выберите чат
                </h2>
                <p className="text-gray-400 text-lg">
                  Выберите чат, чтобы начать общаться
                </p>
              </div>
            </div>
          ) : (
            // Нет чатов - показываем кнопку "Найти друзей"
            <div className="text-center px-8">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <svg
                    className="w-24 h-24 mx-auto text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  Начните общение
                </h2>
                <p className="text-gray-400 text-lg mb-6">
                  У вас пока нет чатов. Найдите друзей и начните общаться, чтобы делиться моментами и обмениваться сообщениями.
                </p>
                <button
                  onClick={() => {
                    // TODO: Реализовать переход к поиску друзей
                    console.log('Найти друзей')
                  }}
                  className="px-8 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors text-white font-semibold text-base shadow-lg shadow-primary-500/20"
                >
                  Найти друзей
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessengerPage

