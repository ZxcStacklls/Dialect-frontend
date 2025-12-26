from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Dict
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import logging

from app.db import schemas, database
from app.services import auth_service, user_service, session_service
from app.core.security import create_access_token

# Настройка логирования для вывода SMS кода
logger = logging.getLogger("uvicorn.error")

# In-memory хранилище SMS кодов: {phone_number: {"code": str, "expires_at": datetime}}
sms_codes_storage: Dict[str, dict] = {}


class PhoneCheckRequest(BaseModel):
    phone_number: str


class SendCodeRequest(BaseModel):
    phone_number: str
    for_registration: bool = False  # If True, skip user existence check


class VerifyCodeRequest(BaseModel):
    phone_number: str
    code: str
    for_registration: bool = False  # If True, just verify code without getting user


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
    
    # Определяем локацию
    location = "Unknown Location"
    if ip_address:
        if ip_address in ["127.0.0.1", "::1", "localhost"]:
             location = "Local System"
        else:
            try:
                # Используем urllib для избежания внешних зависимостей типа requests
                from urllib.request import urlopen
                import json
                # Тайм-аут 2 секунды чтобы не блокировать надолго
                with urlopen(f"http://ip-api.com/json/{ip_address}?fields=status,city,country", timeout=2) as url:
                    data = json.loads(url.read().decode())
                    if data.get("status") == "success":
                        city = data.get("city", "")
                        country = data.get("country", "")
                        location = f"{city}, {country}" if city and country else city or country
            except Exception as e:
                logger.warning(f"Failed to resolve location for IP {ip_address}: {e}")
                pass

    return {
        "device_name": device_name,
        "device_type": device_type,
        "ip_address": ip_address,
        "location": location
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


@router.post("/send-code")
def send_sms_code(
    code_request: SendCodeRequest,
    db: Session = Depends(database.get_db)
):
    """
    Отправляет SMS код для входа (MOCK - выводит в консоль).
    
    Генерирует 6-значный код, сохраняет в памяти с истечением через 5 минут,
    и выводит в консоль uvicorn.
    """
    phone = code_request.phone_number
    
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Номер телефона обязателен"
        )
    
    # Проверяем, существует ли пользователь (только для входа, не для регистрации)
    user = user_service.get_user_by_phone(db, phone_number=phone)
    if not code_request.for_registration and not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь с таким номером не найден"
        )
    
    # Для регистрации: проверяем, что пользователь НЕ существует
    if code_request.for_registration and user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким номером уже зарегистрирован"
        )
    
    # Генерируем 6-значный код
    code = str(random.randint(100000, 999999))
    
    # Сохраняем код с временем истечения (5 минут)
    sms_codes_storage[phone] = {
        "code": code,
        "expires_at": datetime.now() + timedelta(minutes=5)
    }
    
    # Выводим код в консоль uvicorn
    logger.info("=" * 50)
    logger.info(f"📱 SMS КОД ДЛЯ {phone}: {code}")
    logger.info("=" * 50)
    print(f"\n{'='*50}")
    print(f"📱 SMS КОД ДЛЯ {phone}: {code}")
    print(f"{'='*50}\n")
    
    return {"success": True, "message": "Код отправлен"}


@router.post("/verify-code")
def verify_sms_code(
    request: Request,
    verify_request: VerifyCodeRequest,
    db: Session = Depends(database.get_db)
):
    """
    Проверяет SMS код. 
    Для регистрации (for_registration=True) - просто подтверждает код.
    Для входа (for_registration=False) - выдает токены.
    """
    phone = verify_request.phone_number
    code = verify_request.code
    for_registration = verify_request.for_registration
    
    if not phone or not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Номер телефона и код обязательны"
        )
    
    # Проверяем, есть ли код для этого номера
    stored = sms_codes_storage.get(phone)
    
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код не был запрошен для этого номера"
        )
    
    # Проверяем, не истек ли код
    if datetime.now() > stored["expires_at"]:
        del sms_codes_storage[phone]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код истек. Запросите новый код."
        )
    
    # Проверяем совпадение кода
    if stored["code"] != code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный код"
        )
    
    # Код верный - удаляем из хранилища
    del sms_codes_storage[phone]
    
    # Для регистрации - просто возвращаем успех, не нужны токены
    if for_registration:
        return {"success": True, "message": "Код подтвержден"}
    
    # Для входа - получаем пользователя и создаем токены
    user = user_service.get_user_by_phone(db, phone_number=phone)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
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