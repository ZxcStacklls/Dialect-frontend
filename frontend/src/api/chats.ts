import apiClient from './client'

export interface ChatParticipant {
    id: number
    username?: string
    first_name: string
    last_name?: string
    avatar_url?: string
    is_online?: boolean
}

export interface Chat {
    id: number
    chat_type: 'private' | 'group'
    chat_name?: string
    avatar_url?: string
    owner_id?: number
    participants: ChatParticipant[]
    last_message?: {
        content: string
        sent_at: string
        sender_id: number
    }
    unread_count?: number
}

/**
 * Получить список чатов текущего пользователя
 */
export async function fetchChats(): Promise<Chat[]> {
    const response = await apiClient.get('/v1/chats/')
    return response.data
}

/**
 * Создать приватный чат с пользователем
 * Если чат уже существует, вернется существующий
 */
export async function createPrivateChat(targetUserId: number): Promise<Chat> {
    const response = await apiClient.post('/v1/chats/private', {
        target_user_id: targetUserId
    })
    return response.data
}

/**
 * Создать групповой чат
 */
export async function createGroupChat(chatName: string, participantIds: number[]): Promise<Chat> {
    const response = await apiClient.post('/v1/chats/group', {
        chat_name: chatName,
        participant_ids: participantIds
    })
    return response.data
}

/**
 * Найти существующий приватный чат с пользователем
 */
export function findExistingPrivateChat(chats: Chat[], userId: number): Chat | undefined {
    return chats.find(chat =>
        chat.chat_type === 'private' &&
        chat.participants.some(p => p.id === userId)
    )
}

/**
 * Получить историю сообщений чата
 */
export async function fetchChatHistory(chatId: number, limit: number = 50, offset: number = 0) {
    const response = await apiClient.get(`/v1/messages/history/${chatId}`, {
        params: { limit, offset }
    })
    return response.data
}

/**
 * Удалить чат
 */
export async function deleteChat(chatId: number, forEveryone: boolean = false): Promise<void> {
    await apiClient.delete(`/v1/chats/${chatId}`, {
        params: { for_everyone: forEveryone }
    })
}

/**
 * Очистить историю чата
 */
export async function clearChatHistory(chatId: number, forEveryone: boolean = false): Promise<void> {
    await apiClient.delete(`/v1/chats/${chatId}/messages`, {
        params: { for_everyone: forEveryone }
    })
}
