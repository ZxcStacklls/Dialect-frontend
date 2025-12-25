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
                Активные сессии
            </h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Здесь показаны все устройства, на которых выполнен вход в ваш аккаунт.
                Вы можете завершить любую сессию, если подозреваете несанкционированный доступ.
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
                    <span className={`ml-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Загрузка сессий...
                    </span>
                </div>
            ) : (
                <>
                    {/* Кнопка "Завершить все другие сессии" */}
                    {otherSessionsCount > 0 && (
                        <button
                            onClick={terminateAllOthers}
                            disabled={terminatingAll}
                            className={`w-full mb-6 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${terminatingAll
                                    ? 'opacity-50 cursor-not-allowed'
                                    : isDark
                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                        : 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-200'
                                }`}
                        >
                            {terminatingAll ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                    Завершение...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Завершить все другие сессии ({otherSessionsCount})
                                </>
                            )}
                        </button>
                    )}

                    {/* Список сессий */}
                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`p-4 rounded-xl border transition-all ${session.is_current
                                        ? isModern
                                            ? 'bg-primary-500/10 border-primary-500/30'
                                            : isDark
                                                ? 'bg-primary-500/10 border-primary-500/30'
                                                : 'bg-primary-50 border-primary-200'
                                        : isModern
                                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                            : isDark
                                                ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Иконка устройства */}
                                    <div className={`flex-shrink-0 p-2 rounded-lg ${session.is_current
                                            ? 'bg-primary-500/20 text-primary-400'
                                            : isDark
                                                ? 'bg-gray-700/50 text-gray-400'
                                                : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {getDeviceIcon(session.device_type)}
                                    </div>

                                    {/* Информация о сессии */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {session.device_name || 'Неизвестное устройство'}
                                            </span>
                                            {session.is_current && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-green-100 text-green-600'
                                                    }`}>
                                                    Текущая
                                                </span>
                                            )}
                                        </div>

                                        <div className={`text-sm space-y-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {session.ip_address && (
                                                <p className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                    </svg>
                                                    IP: {session.ip_address}
                                                </p>
                                            )}
                                            {session.location && (
                                                <p className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {session.location}
                                                </p>
                                            )}
                                            <p className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Последняя активность: {formatDate(session.last_used_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Кнопка завершения */}
                                    {!session.is_current && (
                                        <button
                                            onClick={() => terminateSession(session.id)}
                                            disabled={terminatingId === session.id}
                                            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all ${terminatingId === session.id
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : isDark
                                                        ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                                                        : 'text-red-600 hover:bg-red-100 hover:text-red-700'
                                                }`}
                                        >
                                            {terminatingId === session.id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                            ) : (
                                                'Завершить'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Пустой список */}
                    {sessions.length === 0 && !loading && (
                        <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <p>Нет активных сессий</p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default SessionsTab
