import React, { useState, useEffect } from 'react'
import apiClient from '../api/client'
import { useTheme } from '../contexts/ThemeContext'
import { useAppearance } from '../contexts/AppearanceContext'

interface Session {
    id: number
    device_name: string | null
    device_type: string | null
    ip_address: string | null
    location: string | null
    created_at: string
    last_used_at: string
    is_current: boolean
}

interface SessionsTabProps {
    onClose: () => void
}

const SessionsTab: React.FC<SessionsTabProps> = ({ onClose }) => {
    const { theme } = useTheme()
    const { settings: appearanceSettings } = useAppearance()
    const isDark = theme === 'dark'
    const isModern = appearanceSettings.designStyle === 'modern'

    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [terminatingId, setTerminatingId] = useState<number | null>(null)
    const [terminatingAll, setTerminatingAll] = useState(false)

    // Загрузка списка сессий
    const loadSessions = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await apiClient.get('/v1/sessions/')
            setSessions(response.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Ошибка загрузки сессий')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSessions()
    }, [])

    // Завершить конкретную сессию
    const terminateSession = async (sessionId: number) => {
        try {
            setTerminatingId(sessionId)
            await apiClient.delete(`/v1/sessions/${sessionId}`)
            setSessions(sessions.filter(s => s.id !== sessionId))
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Ошибка завершения сессии')
        } finally {
            setTerminatingId(null)
        }
    }

    // Завершить все сессии кроме текущей
    const terminateAllOthers = async () => {
        try {
            setTerminatingAll(true)
            await apiClient.delete('/v1/sessions/')
            // Оставляем только текущую сессию
            setSessions(sessions.filter(s => s.is_current))
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Ошибка завершения сессий')
        } finally {
            setTerminatingAll(false)
        }
    }

    // Форматирование даты
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Только что'
        if (diffMins < 60) return `${diffMins} мин. назад`
        if (diffHours < 24) return `${diffHours} ч. назад`
        if (diffDays < 7) return `${diffDays} дн. назад`

        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
    }

    // Иконка устройства
    const getDeviceIcon = (deviceType: string | null) => {
        const iconClass = 'w-8 h-8'
        switch (deviceType) {
            case 'mobile':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                )
            case 'tablet':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                )
            default: // desktop
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                )
        }
    }

    const otherSessionsCount = sessions.filter(s => !s.is_current).length

    return (

        <div className="p-8 h-full overflow-y-auto scrollbar-thin">
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Устройства
            </h2>
            <p className={`text-sm mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Если вы заметили подозрительную активность, вы можете завершить сессию.
            </p>

            {/* Ошибка */}
            {error && (
                <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 underline hover:no-underline"
                    >
                        Скрыть
                    </button>
                </div>
            )}

            {/* Загрузка */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Текущее устройство */}
                    {sessions.some(s => s.is_current) && (
                        <div>
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Текущее устройство
                            </h3>
                            {sessions.filter(s => s.is_current).map((session) => (
                                <div key={session.id} className="flex items-center gap-4">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        {getDeviceIcon(session.device_type)}
                                    </div>
                                    <div>
                                        <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {session.device_name}
                                        </div>
                                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {session.location || 'Unknown Location'} • <span className="text-green-500">Online</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Другие устройства */}
                    {sessions.filter(s => !s.is_current).length > 0 && (
                        <div>
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Другие устройства
                            </h3>
                            <div className="space-y-1">
                                {sessions
                                    .filter(s => !s.is_current)
                                    .sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime())
                                    .map((session) => (
                                        <div
                                            key={session.id}
                                            className={`group flex items-center justify-between p-3 rounded-lg transition-colors ${isDark
                                                ? 'hover:bg-gray-800/50 border-b border-gray-800'
                                                : 'hover:bg-gray-100 border-b border-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
                                                    {getDeviceIcon(session.device_type)}
                                                </div>
                                                <div>
                                                    <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {session.device_name}
                                                    </div>
                                                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {session.location || 'Unknown Location'} • {formatDate(session.last_used_at)}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => terminateSession(session.id)}
                                                disabled={terminatingId === session.id}
                                                className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDark
                                                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
                                                    }`}
                                                title="Завершить сессию"
                                            >
                                                {terminatingId === session.id ? (
                                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Кнопка выхода из всех устройств */}
                    {otherSessionsCount > 0 && (
                        <div className="pt-8 mt-4 border-t border-gray-800/20">
                            <button
                                onClick={terminateAllOthers}
                                disabled={terminatingAll}
                                className={`w-full group relative py-3.5 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 ${terminatingAll
                                    ? 'opacity-70 cursor-not-allowed bg-gray-100 text-gray-400'
                                    : isDark
                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 active:bg-red-500/30'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200'
                                    }`}
                            >
                                {terminatingAll ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                                ) : (
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                )}
                                <span>{terminatingAll ? 'Завершение...' : 'Выйти на всех других устройствах'}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SessionsTab
