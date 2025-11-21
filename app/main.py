import logging
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# --- Импорты наших компонентов ---
from app.db import database, models
from app.core.bloom_filter import bloom_service
from app.services import user_service
from app.services.notification_service import init_firebase # <--- Импорт

# --- Импорты наших роутеров (API) ---
from app.api.v1 import auth as auth_v1
from app.api.v1 import users as users_v1
from app.api.v1 import chats as chats_v1
from app.api.v1 import messages as messages_v1

# Настраиваем базовый логгер
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not os.path.exists("uploads"):
    os.makedirs("uploads")

# --- События "при старте" / "при выключении" ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Контекстный менеджер Lifespan.
    Выполняется при старте и остановке приложения.
    """
    logger.info("Приложение запускается...")

    # 1. Инициализация Firebase (Push-уведомления)
    init_firebase()

    # 2. Создание таблиц БД
    logger.info("Проверка и создание таблиц в БД...")
    database.create_all_tables()
    
    # 3. Синхронизация Фильтра Блума
    logger.info("Загрузка юзернеймов в Фильтр Блума...")
    db = database.SessionLocal()
    try:
        users_with_usernames = db.query(models.User.username).filter(models.User.username.isnot(None)).all()
        all_usernames = [u[0] for u in users_with_usernames]
        bloom_service.sync_from_db(all_usernames)
    except Exception as e:
        logger.error(f"Ошибка при синхронизации Фильтра Блума: {e}")
    finally:
        db.close()

    yield

    logger.info("Приложение останавливается...")


# --- Создание основного приложения ---

app = FastAPI(
    title="Dialect Messenger API",
    version="1.0.0",
    lifespan=lifespan
)

# --- CORS (Разрешаем запросы с фронтенда/Swagger) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Подключение API-роутеров ---
app.include_router(auth_v1.router, prefix="/api")
app.include_router(users_v1.router, prefix="/api")
app.include_router(chats_v1.router, prefix="/api")
app.include_router(messages_v1.router, prefix="/api")

# Подключаем раздачу файлов
app.mount("/static", StaticFiles(directory="uploads"), name="static")

@app.get("/")
def read_root():
    return {"message": "Welcome to Dialect Messenger API V1"}