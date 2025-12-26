import enum
from sqlalchemy import (
    Column, Integer, String, ForeignKey, Enum, TIMESTAMP, TEXT, BLOB, BIGINT,
    create_engine, UniqueConstraint, Boolean, Date
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class ChatTypeEnum(str, enum.Enum):
    private = 'private'
    group = 'group'

class MessageStatusEnum(str, enum.Enum):
    sent = 'sent'
    delivered = 'delivered'
    read = 'read'

# ⭐ НОВЫЙ ENUM: Тип сообщения
class MessageTypeEnum(str, enum.Enum):
    text = 'text'
    image = 'image'
    video = 'video'
    audio = 'audio'
    file = 'file'

# --- Основные Модели ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    public_key = Column(TEXT, nullable=False)
    country = Column(String(10), nullable=True)  # Код страны (например, 'RU', 'KZ', 'BY')
    
    avatar_url = Column(String(255), nullable=True)
    banner_url = Column(String(255), nullable=True)
    bio = Column(String(500), nullable=True)
    birth_date = Column(Date, nullable=True)
    
    status_text = Column(String(100), nullable=True)
    status_expires_at = Column(TIMESTAMP, nullable=True)


    last_seen_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    chat_links = relationship("ChatParticipant", back_populates="user")
    sent_messages = relationship("Message", back_populates="sender")
    owned_chats = relationship("Chat", back_populates="owner")
    read_receipts = relationship("MessageRead", back_populates="user")
    
    # Связь с устройствами, ЧС и сессиями
    devices = relationship("UserDevice", back_populates="user")
    blocked_users = relationship("UserBlock", foreign_keys="UserBlock.blocker_id", back_populates="blocker")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_online(self) -> bool:
        """Считает пользователя онлайн, если last_seen_at < 5 минут назад (как Telegram)."""
        from datetime import datetime, timedelta
        if not self.last_seen_at:
            return False
        return datetime.utcnow() - self.last_seen_at < timedelta(minutes=5)


class UserSession(Base):
    """Таблица активных сессий (refresh токенов) пользователя"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Хеш refresh токена (не храним сам токен!)
    refresh_token_hash = Column(String(255), unique=True, nullable=False, index=True)
    
    # Информация об устройстве
    device_name = Column(String(100), nullable=True)  # "Chrome on Windows"
    device_type = Column(String(50), nullable=True)   # "desktop", "mobile", "tablet"
    ip_address = Column(String(45), nullable=True)    # IPv4/IPv6
    location = Column(String(100), nullable=True)     # "Moscow, Russia"
    
    # Время жизни
    created_at = Column(TIMESTAMP, server_default=func.now())
    last_used_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    expires_at = Column(TIMESTAMP, nullable=False)
    
    # Флаг активности (для soft-delete)
    is_active = Column(Boolean, default=True, nullable=False)
    
    user = relationship("User", back_populates="sessions")


class UserDevice(Base):
    """Таблица устройств пользователя для Push-уведомлений"""
    __tablename__ = "user_devices"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    fcm_token = Column(String(500), nullable=False, unique=True) # Токен от Firebase
    device_type = Column(String(50), nullable=True) # 'android', 'ios', 'web'
    last_active_at = Column(TIMESTAMP, server_default=func.now())
    
    user = relationship("User", back_populates="devices")


class UserBlock(Base):
    """Черный список"""
    __tablename__ = "user_blocks"
    id = Column(Integer, primary_key=True)
    blocker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    __table_args__ = (UniqueConstraint('blocker_id', 'blocked_id', name='_user_block_uc'),)
    
    blocker = relationship("User", foreign_keys=[blocker_id], back_populates="blocked_users")


class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    chat_type = Column(Enum(ChatTypeEnum), nullable=False, default=ChatTypeEnum.private)
    chat_name = Column(String(255), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    participant_links = relationship("ChatParticipant", back_populates="chat", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    owner = relationship("User", back_populates="owned_chats")


class ChatParticipant(Base):
    __tablename__ = "chat_participants"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    custom_nickname = Column(String(100), nullable=True)
    joined_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    last_cleared_at = Column(TIMESTAMP, nullable=True) 
    last_read_message_id = Column(BIGINT, default=0)

    __table_args__ = (UniqueConstraint('user_id', 'chat_id', name='_user_chat_uc'),)
    user = relationship("User", back_populates="chat_links")
    chat = relationship("Chat", back_populates="participant_links")


class Message(Base):
    __tablename__ = "messages"
    id = Column(BIGINT, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Теперь контент может быть ссылкой на файл, а тип указывает, как его отображать
    content = Column(BLOB, nullable=False) 
    
    # Тип сообщения
    message_type = Column(Enum(MessageTypeEnum), default=MessageTypeEnum.text, nullable=False)
    
    sent_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    status = Column(Enum(MessageStatusEnum), nullable=False, default=MessageStatusEnum.sent)
    is_pinned = Column(Boolean, default=False, nullable=False)
    
    # ⭐ Ответ на сообщение (self-referencing FK)
    reply_to_id = Column(BIGINT, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    
    # ⭐ Флаг редактирования
    is_edited = Column(Boolean, default=False, nullable=False)

    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    read_by = relationship("MessageRead", back_populates="message", cascade="all, delete-orphan")
    
    # Связь с ответом (для легкого доступа к цитируемому сообщению)
    reply_to = relationship("Message", remote_side=[id], foreign_keys=[reply_to_id])


class MessageRead(Base):
    __tablename__ = "message_reads"
    id = Column(BIGINT, primary_key=True, index=True)
    message_id = Column(BIGINT, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    __table_args__ = (UniqueConstraint('message_id', 'user_id', name='_msg_user_read_uc'),)
    message = relationship("Message", back_populates="read_by")
    user = relationship("User", back_populates="read_receipts")