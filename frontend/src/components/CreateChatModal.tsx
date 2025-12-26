import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import apiClient from '../api/client'
import DefaultAvatar from './DefaultAvatar'
import { getApiBaseUrl } from '../utils/platform'

interface CreateChatModalProps {
    isOpen: boolean
    onClose: () => void
    onUserSelected: (userId: number) => void
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({ isOpen, onClose, onUserSelected }) => {
    const { theme } = useTheme()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const isDark = theme === 'dark'

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        } else {
            setQuery('')
            setResults([])
        }
    }, [isOpen])

    useEffect(() => {
        const searchUsers = async () => {
            if (!query.trim()) {
                setResults([])
                return
            }

            setIsSearching(true)
            try {
                const response = await apiClient.get('/v1/users/search', {
                    params: { q: query.trim() }
                })

                // Фильтрация (аналогично MessengerPage)
                const allResults = response.data || []
                const queryLower = query.trim().toLowerCase()
                const filteredResults = allResults.filter((user: any) => {
                    const username = (user.username || '').toLowerCase()
                    const firstName = (user.first_name || '').toLowerCase()
                    const lastName = (user.last_name || '').toLowerCase()
                    const phoneNumber = (user.phone_number || '').replace(/\D/g, '')
                    const queryDigits = queryLower.replace(/\D/g, '')

                    return (
                        username.includes(queryLower) ||
                        firstName.includes(queryLower) ||
                        lastName.includes(queryLower) ||
                        (queryDigits.length >= 3 && phoneNumber.includes(queryDigits))
                    )
                })

                setResults(filteredResults)
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsSearching(false)
            }
        }

        const timeoutId = setTimeout(searchUsers, 300)
        return () => clearTimeout(timeoutId)
    }, [query])

    const getAvatarUrl = (avatarUrl?: string | null): string | null => {
        if (!avatarUrl || avatarUrl.trim() === '') return null
        if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl
        if (avatarUrl.startsWith('/static/')) return avatarUrl
        const apiBaseUrl = getApiBaseUrl()
        let baseUrl = apiBaseUrl.replace('/api', '').replace(/\/$/, '')
        return `${baseUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'
                    }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-800' : 'border-gray-100'
                    }`}>
                    <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Новый чат</h3>
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Input */}
                <div className="p-4">
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-colors ${isDark
                            ? 'bg-gray-950 border-gray-800 focus-within:border-primary-500/50'
                            : 'bg-gray-50 border-gray-200 focus-within:border-primary-500/50'
                        }`}>
                        <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Поиск людей"
                            className={`flex-1 bg-transparent border-none outline-none text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                                }`}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="h-[400px] overflow-y-auto content-start custom-scrollbar">
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center h-40">
                            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-primary-500' : 'border-primary-600'
                                }`} />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="flex flex-col">
                            {results.map(user => {
                                const avatarUrl = getAvatarUrl(user.avatar_url)
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => onUserSelected(user.id)}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors text-left ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="relative w-12 h-12 flex-shrink-0">
                                            <div className={`w-full h-full rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'
                                                }`}>
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <DefaultAvatar
                                                        firstName={user.first_name}
                                                        lastName={user.last_name}
                                                        size={48}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                                {user.first_name} {user.last_name}
                                            </div>
                                            <div className={`text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                @{user.username || 'unknown'}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    ) : query ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                            <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                                Пользователи не найдены
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                            <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                                Введите имя или @username для поиска
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CreateChatModal
