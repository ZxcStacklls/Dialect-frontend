import React from 'react'

interface DefaultAvatarProps {
  firstName: string
  lastName?: string
  size?: number
  className?: string
}

/**
 * Компонент для генерации аватара по умолчанию
 * Создает серый фон с первыми буквами имени и фамилии белого цвета
 * Аватар генерируется динамически и не сохраняется на сервере
 */
const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  firstName,
  lastName,
  size = 48,
  className = '',
}) => {
  // Получаем первую букву имени
  const firstLetter = firstName?.charAt(0).toUpperCase() || ''
  
  // Получаем первую букву фамилии (если есть)
  const secondLetter = lastName?.charAt(0).toUpperCase() || ''
  
  // Формируем инициалы (максимум 2 буквы)
  const initials = `${firstLetter}${secondLetter}`.slice(0, 2)

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gray-600 text-white font-semibold ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {initials}
    </div>
  )
}

export default DefaultAvatar

