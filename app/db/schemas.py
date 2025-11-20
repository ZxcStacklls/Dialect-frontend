from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
import enum

from .models import ChatTypeEnum, MessageStatusEnum

# --- Enum для длительности статуса ---
class StatusDurationEnum(str, enum.Enum):
    forever = "forever"
    min_30 = "30m"
    hour_1 = "1h"
    hour_5 = "5h"
    hour_12 = "12h"
    hour_24 = "24h"

# --- Схемы Пользователя ---

class UserBase(BaseModel):
    phone_number: str
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    public_key: str

class UserUpdate(BaseModel):
    """Схема для обновления профиля"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    
    # Статус
    status_text: Optional[str] = None
    # Вместо даты клиент присылает длительность
    status_duration: Optional[StatusDurationEnum] = None 

class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    public_key: str
    
    # Профиль
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None
    
    # Статус (отдаем уже рассчитанное время окончания)
    status_text: Optional[str] = None
    status_expires_at: Optional[datetime] = None
    
    # Активность
    last_seen_at: datetime
    is_online: bool = False

class UserInDB(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    public_key: str
    created_at: datetime


# --- Остальные схемы (без изменений) ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

class ChatParticipantPublic(BaseModel):
    user_id: int
    custom_nickname: Optional[str] = None

# 1. Схема для создания ЛС (только ID собеседника)
class ChatCreatePrivate(BaseModel):
    target_user_id: int

# 2. Схема для создания Группы (название + список ID)
class ChatCreateGroup(BaseModel):
    chat_name: str
    participant_ids: List[int]

class ChatBase(BaseModel):
    chat_type: ChatTypeEnum
    chat_name: Optional[str] = None

class Chat(ChatBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    owner_id: Optional[int] = None
    avatar_url: Optional[str] = None
    participants: List[UserPublic] = [] 
class MessageBase(BaseModel):
    content: bytes
    
class MessageCreate(BaseModel):
    chat_id: int
    content: bytes

class MessageUpdate(BaseModel):
    message_id: int
    content: bytes

class Message(MessageBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chat_id: int
    sender_id: Optional[int]
    sent_at: datetime
    status: MessageStatusEnum
    is_pinned: bool = False

class ReadReceipt(BaseModel):
    """Информация о том, кто и когда прочитал"""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: int
    read_at: datetime
    user: UserPublic