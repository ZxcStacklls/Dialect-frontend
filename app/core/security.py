from datetime import datetime, timedelta
from typing import Optional
import secrets
import hashlib

from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext

from app.core.config import settings
from app.db import schemas # Нам нужна схема TokenData

# --- 1. Настройка Хеширования Паролей ---

# Мы используем bcrypt как основную схему.
# deprecated="auto" означает, что passlib будет автоматически
# обновлять хеши, если мы в будущем сменим алгоритм.
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# --- 2. Функции для работы с Паролями ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверяет, что "чистый" пароль (от пользователя)
    соответствует хешу из базы данных.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Создает хеш из "чистого" пароля.
    Вызывается только при регистрации или смене пароля.
    """
    return pwd_context.hash(password)


# --- 3. Функции для работы с JWT (JSON Web Tokens) ---

def create_access_token(user_id: int, session_id: int = None) -> str:
    """
    Создает новый JWT access токен для пользователя.
    Включает session_id для возможности отзыва токена.
    """
    # Устанавливаем время жизни токена из настроек
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expires_delta
    
    # "sub" (subject) - это стандартное поле JWT для хранения
    # уникального идентификатора (ID пользователя).
    # "sid" - ID сессии для проверки отзыва
    to_encode = {
        "sub": str(user_id),
        "sid": session_id,
        "exp": expire
    }
    
    # Кодируем токен с нашим секретным ключом и алгоритмом
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token() -> str:
    """
    Создает безопасный случайный refresh токен.
    Возвращает строку из 43 символов (256 бит энтропии).
    """
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    """
    Хеширует refresh токен для безопасного хранения в БД.
    Используем SHA-256 (быстрый, т.к. refresh токен уже случайный).
    """
    return hashlib.sha256(token.encode()).hexdigest()


def verify_and_decode_token(token: str) -> schemas.TokenData:
    """
    Проверяет JWT токен и извлекает из него данные.
    Выбрасывает JWTError или ExpiredSignatureError при сбое.
    
    (Эту функцию будет использовать наш файл с зависимостями,
     чтобы получить "текущего пользователя".)
    """
    
    # decode() автоматически проверяет подпись (SECRET_KEY)
    # и время жизни (exp).
    payload = jwt.decode(
        token, 
        settings.SECRET_KEY, 
        algorithms=[settings.ALGORITHM]
    )
    
    # Извлекаем ID пользователя из поля "sub"
    user_id_str: str = payload.get("sub")
    session_id: int = payload.get("sid")
    
    if user_id_str is None:
        # Этого не должно случиться, если мы правильно создаем токен
        raise JWTError("Token payload is missing 'sub' (user_id) claim")
        
    # Возвращаем Pydantic-схему с данными
    return schemas.TokenData(user_id=int(user_id_str), session_id=session_id)