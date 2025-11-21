import firebase_admin
from firebase_admin import messaging, credentials
from sqlalchemy.orm import Session
import logging

from app.db import models

logger = logging.getLogger(__name__)

# Инициализация Firebase (будет вызвана в main.py)
# В продакшене путь к файлу ключа лучше брать из .env
def init_firebase():
    try:
        # Пытаемся найти ключ. Если нет - пуши не будут работать, но сервер не упадет.
        # Вам нужно скачать serviceAccountKey.json из консоли Firebase
        cred = credentials.Certificate("serviceAccountKey.json") 
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin initialized successfully")
    except Exception as e:
        logger.warning(f"Firebase init failed (Push notifications won't work): {e}")

def send_push_to_user(db: Session, user_id: int, title: str, body: str, data: dict = None):
    """
    Отправляет пуш на ВСЕ устройства пользователя.
    """
    # 1. Получаем токены пользователя
    devices = db.query(models.UserDevice).filter(models.UserDevice.user_id == user_id).all()
    if not devices:
        return

    tokens = [d.fcm_token for d in devices]
    
    if not tokens:
        return

    # 2. Формируем сообщение
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {}, # Доп. данные (id чата и т.д.) для обработки клика
        tokens=tokens,
    )

    # 3. Отправляем
    try:
        response = messaging.send_multicast(message)
        logger.info(f"Push sent to user {user_id}: {response.success_count} success")
        
        # (Опционально) Удалить невалидные токены на основе response.responses
    except Exception as e:
        logger.error(f"Error sending push: {e}")