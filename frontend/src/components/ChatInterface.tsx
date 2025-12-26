import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { fetchChatHistory } from '../api/chats'
import DefaultAvatar from './DefaultAvatar'

interface ChatInterfaceProps {
    chatId: number
    initialData?: {
        title: string
        avatarUrl?: string | null
        isOnline?: boolean
        type: 'private' | 'group'
    }
    isAppOnline?: boolean
    onClose?: () => void
}

interface Message {
    id: number
    content: string
    message_type: 'text' | 'image' | 'video' | 'audio' | 'file'
    sent_at: string
    sender_id: number
    chat_id: number
    status: 'sending' | 'sent' | 'delivered' | 'read'
    is_pinned?: boolean
    is_edited?: boolean
    reply_to_id?: number
    reply_to?: { id: number; content: string; sender_id: number } | null
}

// Получаем базовый URL для статических файлов (без /api)
const getStaticBaseUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL
    if (envUrl) {
        return envUrl.replace('/api', '')
    }
    return 'http://localhost:8000'
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatId, initialData, isAppOnline = true }) => {
    const { user, token } = useAuth()
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const [messages, setMessages] = useState<Message[]>([])
    // Initial loading from cache for current chatId
    useEffect(() => {
        if (!chatId) return

        try {
            const cached = localStorage.getItem(`cached_messages_${chatId}`)
            if (cached) {
                setMessages(JSON.parse(cached))
                setIsLoading(false) // Show cached content immediately
            } else {
                setMessages([])
                setIsLoading(true)
            }
        } catch {
            setMessages([])
            setIsLoading(true)
        }
    }, [chatId])
    const [isLoading, setIsLoading] = useState(true)
    const [inputValue, setInputValue] = useState('')
    const [isConnected, setIsConnected] = useState(false)
    const [avatarLoaded, setAvatarLoaded] = useState(false)
    const [avatarError, setAvatarError] = useState(false)

    // Edit mode state
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
    const [editContent, setEditContent] = useState('')

    // Reply mode state
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

    // Delete animation state
    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())

    // Context menu state (with sender info for menu options)
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean
        x: number
        y: number
        messageId: number | null
        senderId: number | null
        message: Message | null
    }>({ isOpen: false, x: 0, y: 0, messageId: null, senderId: null, message: null })

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesAreaRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const contextMenuRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const avatarRef = useRef<HTMLImageElement>(null)
    const messagesRef = useRef<Message[]>([])

    // Update ref whenever messages change
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    // Правильная обработка URL аватара
    const getFullAvatarUrl = (url?: string | null) => {
        if (!url) return null
        if (url.startsWith('http')) return url
        const baseUrl = getStaticBaseUrl()
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
    }

    // Сброс состояния аватара при смене чата
    useEffect(() => {
        setAvatarLoaded(false)
        setAvatarError(false)
        setEditingMessageId(null)
        setReplyToMessage(null)
    }, [chatId, initialData?.avatarUrl])

    // Fix for cached images not triggering onLoad
    useEffect(() => {
        if (!avatarLoaded && avatarRef.current?.complete && avatarRef.current?.naturalHeight !== 0) {
            setAvatarLoaded(true)
        }
    })

    // Загрузка истории
    useEffect(() => {
        const loadHistory = async () => {
            // If we already have messages (from cache), don't show full loader, maybe just small indicator or nothing
            if (messages.length === 0) {
                setIsLoading(true)
            }

            try {
                const history = await fetchChatHistory(chatId, 50, 0)
                const reversedHistory = history.reverse()
                setMessages(reversedHistory)
                // Cache the loaded history
                localStorage.setItem(`cached_messages_${chatId}`, JSON.stringify(reversedHistory))
            } catch (error) {
                console.error('Failed to load history:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (chatId) {
            // Don't clear messages here, as we might have loaded them from cache
            loadHistory()
        }
    }, [chatId])

    // WebSocket Connection Logic with Auto-Reconnect
    useEffect(() => {
        if (!chatId || !token) return

        let ws: WebSocket | null = null
        let reconnectTimeout: NodeJS.Timeout
        let reconnectAttempts = 0
        const maxReconnectAttempts = 5

        const connect = () => {
            const baseUrl = getStaticBaseUrl().replace('http', 'ws')
            const wsUrl = `${baseUrl}/api/v1/messages/ws?token=${token}`

            ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('WS Connected')
                setIsConnected(true)
                reconnectAttempts = 0

                // Re-check unread messages on connection
                checkUnreadMessages()
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    handleWsMessage(data)
                } catch (error) {
                    console.error('WS Parse Error:', error)
                }
            }

            ws.onclose = () => {
                console.log('WS Disconnected')
                setIsConnected(false)

                // Attempt reconnect if not intentionally closed
                if (reconnectAttempts < maxReconnectAttempts) {
                    const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
                    reconnectAttempts++
                    console.log(`Reconnecting in ${timeout}ms... (Attempt ${reconnectAttempts})`)
                    reconnectTimeout = setTimeout(connect, timeout)
                }
            }

            ws.onerror = (err) => {
                console.error('WS Error:', err)
                ws?.close()
            }
        }

        connect()

        return () => {
            if (ws) {
                ws.onclose = null // Prevent reconnect loop on cleanup
                ws.close()
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout)
        }
    }, [chatId, token])

    // Helper to check and mark unread messages
    const checkUnreadMessages = () => {
        if (!messages.length || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        // Find the last unread message from partner
        // We only need to ack the LAST one, backend handles range.
        const lastMsg = messages[messages.length - 1]

        // Ensure window is visible/focused or we just treat 'open chat' as reading?
        // "Like TG": If chat is open and focused, it reads.
        const canRead = document.visibilityState === 'visible' && document.hasFocus()

        if (canRead && lastMsg.sender_id !== user?.id && lastMsg.status !== 'read') {
            // console.log('DEBUG: Sending read receipt for', lastMsg.id)
            wsRef.current.send(JSON.stringify({
                type: 'read',
                chat_id: chatId,
                message_id: lastMsg.id
            }))
        }
    }

    // Effect to check unread on messages change, focus, or visibility change
    useEffect(() => {
        const handleActivity = () => {
            checkUnreadMessages()
        }

        window.addEventListener('focus', handleActivity)
        document.addEventListener('visibilitychange', handleActivity)

        // Check immediately (debounced/throttled by react?)
        checkUnreadMessages()

        return () => {
            window.removeEventListener('focus', handleActivity)
            document.removeEventListener('visibilitychange', handleActivity)
        }
    }, [messages, user?.id, isConnected]) // Re-run when messages update or we reconnect

    const handleWsMessage = (data: any) => {
        if (data.type === 'new_message') {
            if (data.chat_id === chatId) {
                const newMessage: Message = {
                    id: data.id,
                    content: data.content,
                    message_type: data.message_type || 'text',
                    sent_at: data.sent_at,
                    sender_id: data.sender_id,
                    chat_id: data.chat_id,
                    status: 'sent',
                    is_edited: false,
                    reply_to: data.reply_to // Store the reply object from WS
                }

                setMessages(prev => {
                    // 1. Remove optimistic message if this is our own message
                    if (data.sender_id === user?.id) {
                        // Find an optimistic message with same content (simple heuristic)
                        const optimisticIndex = prev.findIndex(m => m.status === 'sending' && m.content === data.content)
                        if (optimisticIndex !== -1) {
                            const newArr = [...prev]
                            newArr[optimisticIndex] = newMessage
                            return newArr
                        }
                    }
                    // 2. Prevent duplicates (by ID)
                    if (prev.some(m => m.id === data.id)) return prev

                    const newMessages = [...prev, newMessage]
                    // Update cache with new message
                    localStorage.setItem(`cached_messages_${chatId}`, JSON.stringify(newMessages))
                    return newMessages
                })

                // If the message is not ours, mark it as read immediately if window is focused
                if (data.sender_id !== user?.id && document.visibilityState === 'visible') {
                    wsRef.current?.send(JSON.stringify({
                        type: 'read',
                        chat_id: chatId,
                        message_id: data.id
                    }))
                }
            }
        } else if (data.type === 'message_deleted') {
            if (data.chat_id === chatId) {
                // Animate deletion
                setDeletingIds(prev => new Set(prev).add(data.message_id))
                setTimeout(() => {
                    setMessages(prev => {
                        // 1. Remove the deleted message
                        const filtered = prev.filter(m => m.id !== data.message_id)

                        // 2. Mark replies as deleted instead of removing
                        return filtered.map(m => {
                            if (m.reply_to?.id === data.message_id || m.reply_to_id === data.message_id) {
                                return {
                                    ...m,
                                    reply_to: {
                                        ...(m.reply_to || { id: data.message_id, sender_id: 0 }),
                                        content: '🚫 Сообщение удалено'
                                    }
                                }
                            }
                            return m
                        })
                    })

                    setDeletingIds(prev => {
                        const next = new Set(prev)
                        next.delete(data.message_id)
                        return next
                    })
                }, 300)
            }
        } else if (data.type === 'message_edited') {
            if (data.chat_id === chatId) {
                setMessages(prev => prev.map(m =>
                    m.id === data.message_id
                        ? { ...m, content: data.new_content, is_edited: true }
                        : m
                ))
            }
        } else if (data.type === 'message_read') {
            // Ensure IDs are compared as numbers/strings safely
            if (String(data.chat_id) === String(chatId)) {
                setMessages(prev => prev.map(m => {
                    const lastReadId = Number(data.last_read_id || data.message_id)
                    const msgId = Number(m.id)
                    // Update if own message AND (id matches OR id <= last_read_id)
                    if (m.sender_id === user?.id && msgId <= lastReadId && m.status !== 'read') {
                        return { ...m, status: 'read' as const }
                    }
                    return m
                }))
            }
        } else if (data.type === 'chat_deleted') {
            if (data.chat_id === chatId) {
                // Chat deleted. Clear messages. 
                // The parent component (MessengerPage) should ideally unmount this,
                // but we clear state just in case or for smooth transition.
                setMessages([])
                setDeletingIds(new Set())
                closeContextMenu()
            }
        } else if (data.type === 'chat_history_cleared') {
            if (data.chat_id === chatId) {
                setMessages([])
                closeContextMenu()
            }
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading, chatId])

    // Resend pending messages when connection is restored
    useEffect(() => {
        // Only run when we become connected
        if (isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Use ref to avoid dependency on 'messages' state which causes loop
            const pendingMessages = messagesRef.current.filter(m => m.status === 'sending')

            if (pendingMessages.length > 0) {
                console.log(`Resending ${pendingMessages.length} pending messages...`)
                pendingMessages.forEach(msg => {
                    const payload: any = {
                        type: 'new_message',
                        chat_id: chatId,
                        content: msg.content,
                        message_type: msg.message_type,
                        temp_id: msg.id
                    }
                    if (msg.reply_to) {
                        payload.reply_to_id = msg.reply_to.id
                    }
                    wsRef.current?.send(JSON.stringify(payload))
                })
            }
        }
    }, [isConnected, chatId])

    // Handle send or edit message
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!inputValue.trim()) return

        if (editingMessageId) {
            // Editing existing message
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const payload = {
                    type: 'edit',
                    message_id: editingMessageId,
                    content: inputValue.trim()
                }
                wsRef.current.send(JSON.stringify(payload))
            } else {
                console.warn('WS not connected, cannot edit')
                // Optionally show error to user
                return
            }

            // Optimistic update for edit
            setMessages(prev => prev.map(m =>
                m.id === editingMessageId
                    ? { ...m, content: inputValue.trim(), is_edited: true }
                    : m
            ))

            setEditingMessageId(null)
            setEditContent('')
        } else {
            // New message
            const tempId = Date.now() // Temporary ID
            const content = inputValue.trim()

            // Optimistic Append FIRST
            const optimisticMsg: Message = {
                id: tempId, // Temporary
                content: content,
                message_type: 'text',
                sent_at: new Date().toISOString(),
                sender_id: user?.id || 0,
                chat_id: chatId,
                status: 'sending' as any,
                reply_to: replyToMessage ? {
                    id: replyToMessage.id,
                    content: replyToMessage.content,
                    sender_id: replyToMessage.sender_id
                } : undefined
            }

            setMessages(prev => {
                const updated = [...prev, optimisticMsg]
                localStorage.setItem(`cached_messages_${chatId}`, JSON.stringify(updated))
                return updated
            })
            setReplyToMessage(null)

            // Try to send via WS
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const payload: any = {
                    type: 'new_message',
                    chat_id: chatId,
                    content: content,
                    message_type: 'text',
                    temp_id: tempId
                }

                if (replyToMessage) {
                    payload.reply_to_id = replyToMessage.id
                }
                wsRef.current.send(JSON.stringify(payload))
            } else {
                console.warn('WS not connected, message will remain sending')
                // Ideally queue it or mark as failed
            }
        }

        setInputValue('')
    }

    const handleDeleteMessage = () => {
        if (!contextMenu.messageId || !wsRef.current) return
        const payload = { type: 'delete', message_id: contextMenu.messageId }
        wsRef.current.send(JSON.stringify(payload))
        closeContextMenu()
    }

    const handleEditMessage = () => {
        if (!contextMenu.message) return
        setEditingMessageId(contextMenu.message.id)
        setEditContent(contextMenu.message.content)
        setInputValue(contextMenu.message.content)
        closeContextMenu()
        inputRef.current?.focus()
    }

    const handleReplyMessage = () => {
        if (!contextMenu.message) return
        setReplyToMessage(contextMenu.message)
        closeContextMenu()
        inputRef.current?.focus()
    }

    const cancelEdit = () => {
        setEditingMessageId(null)
        setEditContent('')
        setInputValue('')
    }

    const cancelReply = () => {
        setReplyToMessage(null)
    }

    // Double-click handler
    const handleDoubleClick = (msg: Message) => {
        if (msg.sender_id === user?.id) {
            // Own message - edit
            setEditingMessageId(msg.id)
            setEditContent(msg.content)
            setInputValue(msg.content)
            inputRef.current?.focus()
        } else {
            // Other's message - reply
            setReplyToMessage(msg)
            inputRef.current?.focus()
        }
    }

    // Context menu with bounds checking
    const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
        e.preventDefault()


        let x = e.clientX
        let y = e.clientY

        // Use messages area bounds to constrain menu within chat area only
        const menuWidth = 200
        const menuHeight = msg.sender_id === user?.id ? 140 : 60
        const padding = 10

        if (messagesAreaRef.current) {
            const rect = messagesAreaRef.current.getBoundingClientRect()

            // Constrain X within messages area
            if (x + menuWidth > rect.right - padding) {
                x = rect.right - menuWidth - padding
            }
            if (x < rect.left + padding) {
                x = rect.left + padding
            }

            // Constrain Y within messages area
            if (y + menuHeight > rect.bottom - padding) {
                y = rect.bottom - menuHeight - padding
            }
            if (y < rect.top + padding) {
                y = rect.top + padding
            }
        }

        setContextMenu({
            isOpen: true,
            x,
            y,
            messageId: msg.id,
            senderId: msg.sender_id,
            message: msg
        })
    }

    const closeContextMenu = () => {
        setContextMenu({ isOpen: false, x: 0, y: 0, messageId: null, senderId: null, message: null })
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenu.isOpen && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                closeContextMenu()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [contextMenu.isOpen])

    // Скелетон загрузки
    const renderMessageSkeleton = () => (
        <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-2xl ${i % 2 === 0 ? 'rounded-br-sm' : 'rounded-bl-sm'} ${isDark ? 'bg-gray-800' : 'bg-gray-200'
                        }`} style={{ width: `${120 + i * 30}px`, height: '44px' }} />
                </div>
            ))}
        </div>
    )

    const renderMessage = (msg: Message) => {
        const isOwn = msg.sender_id === user?.id
        const isRead = msg.status === 'read'
        const isDeleting = deletingIds.has(msg.id)
        const isEditing = editingMessageId === msg.id

        // Use reply_to object from message (comes from backend)
        const repliedMessage = msg.reply_to || (msg.reply_to_id
            ? messages.find(m => m.id === msg.reply_to_id)
            : null)

        return (
            <div
                key={msg.id}
                className={`flex w-full mb-2 group transition-all duration-300 ${isOwn ? 'justify-end' : 'justify-start'
                    } ${isDeleting ? 'opacity-0 scale-95 -translate-y-2' : 'animate-fade-in'}`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                onDoubleClick={() => handleDoubleClick(msg)}
            >
                <div
                    className={`max-w-[70%] px-4 py-2 relative transition-all duration-200 cursor-pointer
                        ${isOwn
                            ? 'bg-primary-500 text-white rounded-2xl rounded-br-sm'
                            : isDark
                                ? 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-sm'
                                : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm'
                        }
                        ${isEditing ? 'ring-2 ring-primary-400 ring-opacity-50' : ''}
                        flex flex-wrap items-end gap-x-2
                    `}
                >
                    {/* Reply quote */}
                    {repliedMessage && (
                        <div className={`w-full mb-2 pl-2 border-l-2 ${isOwn ? 'border-white/50' : 'border-primary-500'}`}>
                            <div className={`text-xs font-medium ${isOwn ? 'text-white/80' : 'text-primary-500'}`}>
                                {repliedMessage.content === '🚫 Сообщение удалено' ? 'Удалено' : (repliedMessage.sender_id ? (repliedMessage.sender_id === user?.id ? 'Вы' : initialData?.title || 'Собеседник') : 'Удаленный аккаунт')}
                            </div>
                            <div className={`text-xs truncate ${isOwn ? 'text-white/60' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {repliedMessage.content === '🚫 Сообщение удалено' ? <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Сообщение удалено</span> : repliedMessage.content}
                            </div>
                        </div>
                    )}

                    <div className="text-[15px] whitespace-pre-wrap leading-relaxed break-words break-all relative z-0 max-w-full">
                        {msg.content}
                    </div>

                    <div className={`text-[11px] ml-auto flex-shrink-0 flex items-center gap-1 select-none ${isOwn ? 'text-white/70' : isDark ? 'text-gray-500' : 'text-gray-400'
                        }`} style={{ marginBottom: '2px' }}>
                        {msg.is_edited && (
                            <span className="italic">изм.</span>
                        )}
                        {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isOwn && (
                            msg.status === 'sending' ? (
                                <div className="flex gap-[2px] items-center h-4 ml-0.5">
                                    <div className="w-[3px] h-[3px] bg-white rounded-full animate-bounce-slight" style={{ animationDelay: '0s' }} />
                                    <div className="w-[3px] h-[3px] bg-white rounded-full animate-bounce-slight" style={{ animationDelay: '0.15s' }} />
                                    <div className="w-[3px] h-[3px] bg-white rounded-full animate-bounce-slight" style={{ animationDelay: '0.3s' }} />
                                </div>
                            ) : isRead ? (
                                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L7 17l-5-5" />
                                    <path d="M22 10l-7.5 7.5L13 16" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                            )
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (!chatId) return null

    const chatTitle = initialData?.title || 'Чат'
    const avatarUrl = getFullAvatarUrl(initialData?.avatarUrl)
    const isOnline = (initialData?.isOnline === true) && isAppOnline
    const showDefaultAvatar = !avatarUrl || avatarError

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full relative">
            {/* Header */}
            <div className={`h-16 flex-shrink-0 flex items-center justify-between px-6 border-b transition-colors duration-300 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                } z-20`}>
                <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                            {showDefaultAvatar ? (
                                <DefaultAvatar firstName={chatTitle?.charAt(0) || '?'} size={40} />
                            ) : (
                                <>
                                    {!avatarLoaded && (
                                        <div className={`absolute inset-0 rounded-full animate-pulse ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                                    )}
                                    <img
                                        ref={avatarRef}
                                        src={avatarUrl!}
                                        className={`w-full h-full object-cover transition-opacity duration-200 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
                                        alt={chatTitle}
                                        onLoad={() => setAvatarLoaded(true)}
                                        onError={() => setAvatarError(true)}
                                    />
                                </>
                            )}
                        </div>
                        {isOnline && (
                            <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ${isDark ? 'border-gray-900' : 'border-white'}`} />
                        )}
                    </div>
                    <div>
                        <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {chatTitle}
                        </div>
                        <div className={`text-xs ${isOnline ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {isOnline ? 'В сети' : 'Был(а) недавно'}
                        </div>
                    </div>
                </div>

                <button className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesAreaRef}
                className={`flex-1 overflow-y-auto px-4 py-4 custom-scrollbar relative flex flex-col ${isDark ? 'bg-gray-950' : 'bg-gray-100'
                    }`}>
                <div className="flex-1" />

                <div className="flex flex-col justify-end min-h-0 z-10 max-w-3xl w-full mx-auto pb-2">
                    {isLoading ? (
                        renderMessageSkeleton()
                    ) : messages.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-2">👋</div>
                            <div className={isDark ? 'text-gray-500' : 'text-gray-400'}>Напишите первое сообщение</div>
                        </div>
                    ) : (
                        messages.map(renderMessage)
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Edit/Reply indicator */}
            {(editingMessageId || replyToMessage) && (
                <div className={`px-4 py-2 border-t flex items-center justify-between ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-1 h-8 rounded-full ${editingMessageId ? 'bg-blue-500' : 'bg-primary-500'}`} />
                        <div>
                            <div className={`text-xs font-medium ${editingMessageId ? 'text-blue-500' : 'text-primary-500'}`}>
                                {editingMessageId ? 'Редактирование' : 'Ответ'}
                            </div>
                            <div className={`text-sm truncate max-w-[300px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {editingMessageId ? editContent : replyToMessage?.content}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={editingMessageId ? cancelEdit : cancelReply}
                        className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className={`p-3 ${isDark ? 'bg-gray-900' : 'bg-white'} z-20 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 max-w-3xl mx-auto ${isDark ? 'bg-gray-800 focus-within:bg-gray-750' : 'bg-gray-100 focus-within:bg-gray-50 focus-within:ring-1 focus-within:ring-primary-500/30'
                    }`}>
                    <button type="button" className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage()
                            }
                            if (e.key === 'Escape') {
                                if (editingMessageId) cancelEdit()
                                if (replyToMessage) cancelReply()
                            }
                        }}
                        placeholder={editingMessageId ? "Редактировать сообщение..." : "Написать сообщение..."}
                        className={`flex-1 bg-transparent border-none outline-none text-[15px] py-2 ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                            }`}
                    />

                    <button
                        type="submit"
                        disabled={!inputValue.trim() || !isConnected}
                        onClick={handleSendMessage}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0 ${inputValue.trim()
                            ? editingMessageId
                                ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                                : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-95'
                            : isDark ? 'text-gray-600' : 'text-gray-400'
                            }`}
                    >
                        {editingMessageId ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.isOpen && (
                <div
                    ref={contextMenuRef}
                    className={`fixed z-[9999] min-w-[180px] rounded-xl shadow-xl overflow-hidden py-1 animate-scale-in ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                        }`}
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {/* Reply option - available for all messages */}
                    <button
                        onClick={handleReplyMessage}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Ответить
                    </button>

                    {/* Edit option - only for own messages */}
                    {contextMenu.senderId === user?.id && (
                        <button
                            onClick={handleEditMessage}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Редактировать
                        </button>
                    )}

                    {/* Delete option - only for own messages */}
                    {contextMenu.senderId === user?.id && (
                        <button
                            onClick={handleDeleteMessage}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 text-red-500 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-red-50'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Удалить
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default ChatInterface
