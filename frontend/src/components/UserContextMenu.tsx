import React, { useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface UserContextMenuProps {
    isOpen: boolean
    x: number
    y: number
    user: {
        id: number
        username?: string
        first_name: string
        last_name?: string
    }
    onClose: () => void
    onSendMessage: (userId: number) => void
    onCopyUsername?: (username: string) => void
}

const UserContextMenu: React.FC<UserContextMenuProps> = ({
    isOpen,
    x,
    y,
    user,
    onClose,
    onSendMessage,
    onCopyUsername
}) => {
    const { theme } = useTheme()
    const menuRef = useRef<HTMLDivElement>(null)
    const isDark = theme === 'dark'

    // Закрытие меню при клике вне него
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        // Небольшая задержка, чтобы не закрыть меню сразу после открытия
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }, 10)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // Корректировка позиции меню, чтобы не выходило за границы экрана
    useEffect(() => {
        if (!isOpen || !menuRef.current) return

        const menu = menuRef.current
        const rect = menu.getBoundingClientRect()
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        let adjustedX = x
        let adjustedY = y

        // Корректировка по горизонтали
        if (x + rect.width > windowWidth - 10) {
            adjustedX = windowWidth - rect.width - 10
        }

        // Корректировка по вертикали
        if (y + rect.height > windowHeight - 10) {
            adjustedY = windowHeight - rect.height - 10
        }

        menu.style.left = `${adjustedX}px`
        menu.style.top = `${adjustedY}px`
    }, [isOpen, x, y])

    if (!isOpen) return null

    return (
        <div
            ref={menuRef}
            className={`fixed z-[9999] min-w-[180px] rounded-xl shadow-2xl overflow-hidden animate-scale-in ${isDark
                    ? 'bg-gray-900/95 border border-gray-800/50 backdrop-blur-xl'
                    : 'bg-white/95 border border-gray-200/50 backdrop-blur-xl'
                }`}
            style={{
                left: x,
                top: y,
            }}
        >
            <div className="py-1">
                {/* Написать сообщение */}
                <button
                    onClick={() => {
                        onSendMessage(user.id)
                        onClose()
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${isDark
                            ? 'text-gray-200 hover:bg-primary-500/20'
                            : 'text-gray-700 hover:bg-primary-500/10'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Написать сообщение
                </button>

                {/* Скопировать username */}
                {user.username && onCopyUsername && (
                    <button
                        onClick={() => {
                            onCopyUsername(user.username!)
                            onClose()
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${isDark
                                ? 'text-gray-200 hover:bg-primary-500/20'
                                : 'text-gray-700 hover:bg-primary-500/10'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Скопировать @{user.username}
                    </button>
                )}

                <div className={`border-t my-1 ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}></div>

                {/* Посмотреть профиль */}
                <button
                    onClick={() => {
                        // TODO: открыть профиль пользователя
                        onClose()
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${isDark
                            ? 'text-gray-400 hover:bg-white/5'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Профиль
                </button>
            </div>
        </div>
    )
}

export default UserContextMenu
