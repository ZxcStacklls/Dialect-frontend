"""
Сервис для управления сессиями пользователя.
Обеспечивает создание, валидацию и отзыв refresh токенов.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db import models
from app.core.config import settings
from app.core.security import create_refresh_token, hash_refresh_token


def create_session(
    db: Session, 
    user_id: int, 
    device_name: str = None,
    device_type: str = None,
    ip_address: str = None,
    location: str = None
) -> tuple[str, models.UserSession]:
    """
    Создает новую сессию для пользователя.
    Возвращает кортеж (refresh_token, session_object).
    
    ВАЖНО: refresh_token возвращается только здесь и должен быть
    отправлен клиенту. В БД хранится только хеш токена.
    """
    # Генерируем новый refresh токен
    refresh_token = create_refresh_token()
    token_hash = hash_refresh_token(refresh_token)
    
    # Вычисляем время истечения
    expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Создаем запись сессии
    # Сначала отзываем старые сессии с того же устройства и IP
    existing_session = db.query(models.UserSession).filter(
        and_(
            models.UserSession.user_id == user_id,
            models.UserSession.device_name == device_name,
            models.UserSession.ip_address == ip_address,
            models.UserSession.is_active == True
        )
    ).first()
    
    if existing_session:
        existing_session.is_active = False
        # Не делаем commit здесь, он будет сделан при добавлении новой сессии
    
    session = models.UserSession(
        user_id=user_id,
        refresh_token_hash=token_hash,
        device_name=device_name,
        device_type=device_type,
        ip_address=ip_address,
        location=location,
        expires_at=expires_at,
        is_active=True
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return refresh_token, session


def validate_refresh_token(db: Session, refresh_token: str) -> Optional[models.UserSession]:
    """
    Проверяет refresh токен и возвращает сессию если токен валиден.
    
    Токен считается валидным если:
    1. Хеш токена существует в БД
    2. Сессия активна (is_active = True)
    3. Срок действия не истек (expires_at > now)
    
    При успешной валидации обновляет last_used_at.
    """
    token_hash = hash_refresh_token(refresh_token)
    
    session = db.query(models.UserSession).filter(
        and_(
            models.UserSession.refresh_token_hash == token_hash,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        )
    ).first()
    
    if session:
        # Обновляем время последнего использования
        session.last_used_at = datetime.utcnow()
        db.commit()
    
    return session


def revoke_session(db: Session, session_id: int, user_id: int) -> bool:
    """
    Отзывает (деактивирует) конкретную сессию.
    Проверяет, что сессия принадлежит указанному пользователю.
    
    Возвращает True если сессия была отозвана, False если не найдена.
    """
    session = db.query(models.UserSession).filter(
        and_(
            models.UserSession.id == session_id,
            models.UserSession.user_id == user_id,
            models.UserSession.is_active == True
        )
    ).first()
    
    if not session:
        return False
    
    session.is_active = False
    db.commit()
    return True


def revoke_all_sessions(db: Session, user_id: int, except_session_id: int = None) -> int:
    """
    Отзывает все активные сессии пользователя.
    Опционально можно исключить текущую сессию (except_session_id).
    
    Возвращает количество отозванных сессий.
    """
    query = db.query(models.UserSession).filter(
        and_(
            models.UserSession.user_id == user_id,
            models.UserSession.is_active == True
        )
    )
    
    if except_session_id:
        query = query.filter(models.UserSession.id != except_session_id)
    
    sessions = query.all()
    count = len(sessions)
    
    for session in sessions:
        session.is_active = False
    
    db.commit()
    return count


def get_user_sessions(db: Session, user_id: int) -> List[models.UserSession]:
    """
    Получает список всех активных сессий пользователя.
    Отсортировано по last_used_at (новые первые).
    """
    return db.query(models.UserSession).filter(
        and_(
            models.UserSession.user_id == user_id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > datetime.utcnow()
        )
    ).order_by(models.UserSession.last_used_at.desc()).all()


def cleanup_expired_sessions(db: Session) -> int:
    """
    Удаляет все истекшие сессии из базы данных.
    Можно вызывать периодически через cron-задачу.
    
    Возвращает количество удаленных сессий.
    """
    result = db.query(models.UserSession).filter(
        models.UserSession.expires_at <= datetime.utcnow()
    ).delete()
    
    db.commit()
    return result


def get_session_by_id(db: Session, session_id: int, user_id: int) -> Optional[models.UserSession]:
    """
    Получает сессию по ID с проверкой принадлежности пользователю.
    Используется для проверки валидности access токена.
    """
    return db.query(models.UserSession).filter(
        and_(
            models.UserSession.id == session_id,
            models.UserSession.user_id == user_id,
            models.UserSession.is_active == True
        )
    ).first()
