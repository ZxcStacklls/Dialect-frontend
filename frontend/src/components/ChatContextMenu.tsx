import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { deleteChat } from '../api/chats'
import { useTheme } from '../contexts/ThemeContext'

interface ChatContextMenuProps {
    isOpen: boolean
    x: number
    y: number
    chatId: number
    chatName?: string
    onClose: () => void
    onDeleteChat: (chatId: number) => void
}

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
    isOpen,
    x,
    y,
    chatId,
    chatName = 'Чат',
    onClose,
    onDeleteChat
}) => {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const menuRef = useRef<HTMLDivElement>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteForEveryone, setDeleteForEveryone] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Adjusted position to stay within bounds
    const [adjustedPos, setAdjustedPos] = useState({ x, y })

    // Calculate adjusted position when menu opens or position changes
    useEffect(() => {
        if (isOpen && menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect()
            const padding = 10
            let newX = x
            let newY = y

            // Adjust if overflows right
            if (x + menuRect.width > window.innerWidth - padding) {
                newX = window.innerWidth - menuRect.width - padding
            }
            // Adjust if overflows bottom
            if (y + menuRect.height > window.innerHeight - padding) {
                newY = window.innerHeight - menuRect.height - padding
            }
            // Ensure not off-screen left/top
            if (newX < padding) newX = padding
            if (newY < padding) newY = padding

            setAdjustedPos({ x: newX, y: newY })
        }
    }, [isOpen, x, y])

    // Закрытие при клике вне меню
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen && !showDeleteModal) {
            document.addEventListener('mousedown', handleClickOutside)
            window.addEventListener('resize', onClose)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('resize', onClose)
        }
    }, [isOpen, showDeleteModal, onClose])

    // Сброс при закрытии
    useEffect(() => {
        if (!isOpen) {
            setShowDeleteModal(false)
            setDeleteForEveryone(false)
        }
    }, [isOpen])

    const handleDeleteClick = () => {
        setShowDeleteModal(true)
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteChat(chatId, deleteForEveryone)
            onDeleteChat(chatId)
            onClose()
        } catch (error: any) {
            console.error('Failed to delete chat:', error)
            // Если 404 - чат уже удален, просто обновим UI
            if (error?.response?.status === 404) {
                onDeleteChat(chatId)
                onClose()
            }
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCancelDelete = () => {
        setShowDeleteModal(false)
        setDeleteForEveryone(false)
    }

    if (!isOpen) return null

    return (
        <>
            {/* Context Menu */}
            <div
                ref={menuRef}
                className={`fixed z-[9999] min-w-[180px] rounded-xl shadow-2xl overflow-hidden animate-scale-in ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}
                style={{ left: adjustedPos.x, top: adjustedPos.y }}
            >
                <div className="py-1">
                    <button
                        onClick={handleDeleteClick}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-red-500 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-red-50'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Удалить чат
                    </button>
                </div>
            </div>

            {/* Delete Modal (Portal) */}
            {showDeleteModal && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center select-none">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleCancelDelete}
                    />

                    {/* Modal */}
                    <div className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'
                        }`}>
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4">
                            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Удалить чат?
                            </h3>
                            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Вы уверены, что хотите удалить чат с <span className="font-medium">{chatName}</span>?
                            </p>
                        </div>

                        {/* Красивый чекбокс */}
                        <div className="px-6 pb-4">
                            <label className="flex items-center gap-3 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={deleteForEveryone}
                                        onChange={(e) => setDeleteForEveryone(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${deleteForEveryone
                                        ? 'bg-red-500 border-red-500'
                                        : isDark
                                            ? 'border-gray-600 group-hover:border-gray-500'
                                            : 'border-gray-300 group-hover:border-gray-400'
                                        }`}>
                                        {deleteForEveryone && (
                                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none">
                                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Удалить у всех участников
                                </span>
                            </label>
                        </div>

                        {/* Actions */}
                        <div className={`px-6 py-4 flex gap-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button
                                onClick={handleCancelDelete}
                                disabled={isDeleting}
                                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${isDark
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Удаление...
                                    </div>
                                ) : (
                                    'Удалить'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

export default ChatContextMenu
