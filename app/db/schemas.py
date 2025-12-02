from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
import enum

from .models import ChatTypeEnum, MessageStatusEnum, MessageTypeEnum

class StatusDurationEnum(str, enum.Enum):
    forever = "forever"
    min_30 = "30m"
    hour_1 = "1h"
    hour_5 = "5h"
    hour_12 = "12h"
    hour_24 = "24h"

# --- User ---
class UserBase(BaseModel):
    phone_number: str
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    public_key: str
    country: Optional[str] = None  # Код страны (например, 'RU', 'KZ', 'BY')

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    status_text: Optional[str] = None
    status_duration: Optional[StatusDurationEnum] = None 

class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phone_number: str # Добавляем номер телефона
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    public_key: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None
    status_text: Optional[str] = None
    status_expires_at: Optional[datetime] = None
    last_seen_at: datetime
    is_online: bool = False

class UserInDB(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    public_key: str
    created_at: datetime

# --- Devices & Blocks ---
class DeviceCreate(BaseModel):
    fcm_token: str
    device_type: str = "android"

class BlockCreate(BaseModel):
    blocked_user_id: int

# --- Chat ---
class ChatParticipantPublic(BaseModel):
    user_id: int
    custom_nickname: Optional[str] = None

class ChatCreatePrivate(BaseModel):
    target_user_id: int

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

# --- Message ---
class ReadReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    read_at: datetime

class MessageBase(BaseModel):
    content: bytes
    
class MessageCreate(BaseModel):
    chat_id: int
    content: bytes
    # ⭐ НОВОЕ: Тип сообщения (по умолчанию text)
    message_type: MessageTypeEnum = MessageTypeEnum.text

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
    message_type: MessageTypeEnum

# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None