from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Dict
from pydantic import BaseModel

from app.db import schemas, database
from app.services import auth_service, user_service, session_service
from app.core.security import create_access_token


class PhoneCheckRequest(BaseModel):
    phone_number: str


# Создаем "роутер" - мини-приложение FastAPI для этого модуля.
# prefix="/v1/auth" означает, что все URL в этом файле
# будут начинаться с /api/v1/auth/...
router = APIRouter(
    prefix="/v1/auth",
    tags=["Auth"]  # Тег для авто-документации (Swagger UI)
)


def _get_device_info(request: Request) -> dict:
    """Извлекает информацию об устройстве из запроса"""
    user_agent = request.headers.get("user-agent", "Unknown")
    
    # Определяем тип устройства по User-Agent
    device_type = "desktop"
    if "Mobile" in user_agent or "Android" in user_agent:
        device_type = "mobile"
    elif "Tablet" in user_agent or "iPad" in user_agent:
        device_type = "tablet"
    
    # Формируем читаемое название устройства
    if "Windows" in user_agent:
        os_name = "Windows"
    elif "Mac" in user_agent:
        os_name = "macOS"
    elif "Linux" in user_agent:
        os_name = "Linux"
    elif "Android" in user_agent:
        os_name = "Android"
    elif "iPhone" in user_agent or "iPad" in user_agent:
        os_name = "iOS"
    else:
        os_name = "Unknown OS"
    
    if "Chrome" in user_agent and "Edg" not in user_agent:
        browser = "Chrome"
    elif "Firefox" in user_agent:
        browser = "Firefox"
    elif "Safari" in user_agent and "Chrome" not in user_agent:
        browser = "Safari"
    elif "Edg" in user_agent:
        browser = "Edge"
    elif "Electron" in user_agent:
        browser = "Dialect Desktop"
    else:
        browser = "Unknown Browser"
    
    device_name = f"{browser} on {os_name}"
    
    # Получаем IP адрес
    ip_address = request.client.host if request.client else None
    
    return {
        "device_name": device_name,
        "device_type": device_type,
        "ip_address": ip_address,
        "location": None  # TODO: добавить геолокацию по IP
    }


@router.post("/register", response_model=schemas.UserPublic)
def register_user(
    user_data: schemas.UserCreate, 
    db: Session = Depends(database.get_db)
):
    """
    Эндпоинт для регистрации нового пользователя.
    
    Принимает JSON с данными пользователя (схему UserCreate).
    Возвращает публичные данные пользователя (схему UserPublic).
    
    FastAPI автоматически обработает HTTPException, 
    если auth_service его вызовет (н.п. "юзернейм занят").
    """
    new_user = auth_service.register_new_user(db=db, user_data=user_data)
    
    # Мы НЕ возвращаем new_user (т.к. это модель SQLAlchemy с хешем),
    # а возвращаем Pydantic-схему UserPublic, которая сама
    # отфильтрует нужные поля (id, username, first_name и т.д.).
    return new_user


@router.post("/check-phone", response_model=Dict[str, bool])
def check_phone_exists(
    phone_data: PhoneCheckRequest,
    db: Session = Depends(database.get_db)
):
    """
    Эндпоинт для проверки существования номера телефона.
    Не создает пользователя, только проверяет наличие номера в БД.
    
    Принимает JSON: {"phone_number": "+79123456789"}
    Возвращает: {"exists": true/false}
    """
    if not phone_data.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Номер телефона обязателен"
        )
    
    user = user_service.get_user_by_phone(db, phone_number=phone_data.phone_number)
    exists = user is not None
    
    return {"exists": exists}


@router.post("/token", response_model=schemas.TokenPair)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    """
    Эндпоинт для входа (аутентификации) и получения пары токенов.
    
    Возвращает:
    - access_token: JWT токен для авторизации запросов (живет 15 минут)
    - refresh_token: Токен для обновления access_token (живет 30 дней)
    
    - form_data.username: Это поле содержит номер телефона.
    - form_data.password: Это поле содержит пароль.
    """
    
    # ВАЖНО: Мы используем `form_data.username` как `phone_number`
    # для аутентификации, т.к. OAuth2PasswordRequestForm
    # ожидает поле 'username' по стандарту.
    user = auth_service.authenticate_user(
        db=db, 
        phone_number=form_data.username, 
        password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный номер телефона или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Получаем информацию об устройстве
    device_info = _get_device_info(request)
    
    # Создаем сессию и получаем refresh токен
    refresh_token, session = session_service.create_session(
        db=db,
        user_id=user.id,
        **device_info
    )
    
    # Создаем access токен с привязкой к сессии
    access_token = create_access_token(user_id=user.id, session_id=session.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=schemas.TokenPair)
def refresh_access_token(
    request: Request,
    token_request: schemas.RefreshTokenRequest,
    db: Session = Depends(database.get_db)
):
    """
    Обновляет access токен по refresh токену.
    
    Если refresh токен валиден:
    - Создает новый access токен
    - Возвращает ту же пару (access + тот же refresh)
    
    Если refresh токен невалиден или истек:
    - Возвращает 401 Unauthorized
    """
    # Проверяем refresh токен
    session = session_service.validate_refresh_token(db, token_request.refresh_token)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истекший refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем новый access токен
    access_token = create_access_token(user_id=session.user_id, session_id=session.id)
    
    # Возвращаем тот же refresh токен (он еще действителен)
    return {
        "access_token": access_token,
        "refresh_token": token_request.refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
def logout(
    token_request: schemas.RefreshTokenRequest,
    db: Session = Depends(database.get_db)
):
    """
    Завершает текущую сессию (отзывает refresh токен).
    
    После этого:
    - Refresh токен больше не будет работать
    - Access токен продолжит работать до истечения (15 мин)
    """
    session = session_service.validate_refresh_token(db, token_request.refresh_token)
    
    if session:
        session_service.revoke_session(db, session.id, session.user_id)
    
    return {"message": "Успешный выход из системы"}