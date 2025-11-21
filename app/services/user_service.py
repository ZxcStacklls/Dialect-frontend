from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime, timedelta
from PIL import Image, UnidentifiedImageError # <-- Нужен Pillow
import io

from app.db import models, schemas
from app.core.security import get_password_hash

from sqlalchemy.sql import func
from fastapi import UploadFile, HTTPException, status
import shutil
import uuid
import os

# --- КОНСТАНТЫ ---
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {"PNG", "JPEG", "JPG", "WEBP"}

# --- ХЕЛПЕРЫ ---

def _delete_old_file(file_url: str):
    """
    Удаляет старый файл с диска, если он существует.
    URL формата: /static/filename.ext -> Путь: uploads/filename.ext
    """
    if not file_url:
        return
    
    # Превращаем URL в путь к файлу
    # Отрезаем "/static/" (первые 8 символов)
    filename = file_url.replace("/static/", "")
    file_path = os.path.join("uploads", filename)
    
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")

def _validate_image(file: UploadFile, target_width: int, target_height: int):
    """
    Проверяет размер, формат и разрешение изображения.
    """
    # 1. Проверка размера файла (читаем в память)
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Файл слишком большой. Максимум {MAX_FILE_SIZE // (1024*1024)}MB.")

    # 2. Проверка изображения через Pillow
    try:
        image = Image.open(file.file)
        image.verify() 
        
        file.file.seek(0)
        image = Image.open(file.file) 
        
        if image.format.upper() not in ALLOWED_EXTENSIONS:
             raise HTTPException(status_code=400, detail="Недопустимый формат. Используйте PNG, JPG или WEBP.")
             
        width, height = image.size
        
        # ⭐ ИЗМЕНЕНИЕ ЗДЕСЬ:
        # Было: if width != target_width or height != target_height: (Строгое равенство)
        # Стало: Проверяем, чтобы картинка не превышала лимиты
        if width > target_width or height > target_height:
             raise HTTPException(
                 status_code=400, 
                 detail=f"Изображение слишком большое. Максимальное разрешение {target_width}x{target_height}px. (Загружено: {width}x{height}px)"
             )
             
        file.file.seek(0)
        
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Файл не является корректным изображением.")
        

def calculate_expiration(duration: schemas.StatusDurationEnum) -> Optional[datetime]:
    now = datetime.utcnow()
    if duration == schemas.StatusDurationEnum.forever: return None
    if duration == schemas.StatusDurationEnum.min_30: return now + timedelta(minutes=30)
    if duration == schemas.StatusDurationEnum.hour_1: return now + timedelta(hours=1)
    if duration == schemas.StatusDurationEnum.hour_5: return now + timedelta(hours=5)
    if duration == schemas.StatusDurationEnum.hour_12: return now + timedelta(hours=12)
    if duration == schemas.StatusDurationEnum.hour_24: return now + timedelta(hours=24)
    return None

def check_status_expiration(user: models.User):
    if user.status_expires_at and user.status_expires_at < datetime.utcnow():
        user.status_text = None
        user.status_expires_at = None
    return user

# --- READ ---

def get_user(db: Session, user_id: int) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user: check_status_expiration(user)
    return user

def get_user_by_phone(db: Session, phone_number: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.phone_number == phone_number).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()

# --- CREATE ---

def create_user(db: Session, user_data: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        phone_number=user_data.phone_number,
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        public_key=user_data.public_key,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def search_users(db: Session, query_str: str, limit: int = 10) -> list[models.User]:
    if not query_str: return []
    search_pattern = f"%{query_str}%"
    users = db.query(models.User).filter(
        or_(
            models.User.username.like(search_pattern),
            models.User.first_name.like(search_pattern),
            models.User.last_name.like(search_pattern),
            models.User.phone_number.like(search_pattern)
        )
    ).limit(limit).all()
    for u in users: check_status_expiration(u)
    return users

# --- UPDATE ---

def update_last_seen(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.last_seen_at = func.now()
        db.commit()

def update_user_profile(db: Session, user_id: int, update_data: schemas.UserUpdate) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: return None
    
    update_dict = update_data.model_dump(exclude_unset=True)
    if "status_duration" in update_dict:
        duration_enum = update_dict.pop("status_duration")
        if duration_enum:
            user.status_expires_at = calculate_expiration(duration_enum)

    for key, value in update_dict.items():
        if hasattr(user, key):
            setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    return user

def upload_avatar(db: Session, user_id: int, file: UploadFile) -> str:
    """Загрузка аватарки пользователя (1024x1024)."""
    user = get_user(db, user_id)
    
    # 1. Валидация (1024x1024)
    _validate_image(file, target_width=1024, target_height=1024)

    # 2. Удаление старой аватарки
    if user.avatar_url:
        _delete_old_file(user.avatar_url)

    # 3. Сохранение новой
    if not os.path.exists("uploads"): os.makedirs("uploads")
    file_ext = file.filename.split(".")[-1]
    file_name = f"avatar_{user_id}_{uuid.uuid4()}.{file_ext}"
    file_path = f"uploads/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"/static/{file_name}"
    user.avatar_url = url
    db.commit()
    db.refresh(user)
    return url

def upload_banner(db: Session, user_id: int, file: UploadFile) -> str:
    """Загрузка баннера (1024x345)."""
    user = get_user(db, user_id)
    
    # 1. Валидация (1024x345)
    _validate_image(file, target_width=1024, target_height=345)

    # 2. Удаление старого баннера
    if user.banner_url:
        _delete_old_file(user.banner_url)

    # 3. Сохранение
    if not os.path.exists("uploads"): os.makedirs("uploads")
    file_ext = file.filename.split(".")[-1]
    file_name = f"banner_{user_id}_{uuid.uuid4()}.{file_ext}"
    file_path = f"uploads/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"/static/{file_name}"
    user.banner_url = url
    db.commit()
    db.refresh(user)
    return url


def delete_avatar(db: Session, user_id: int):
    """Удаляет аватарку пользователя."""
    user = get_user(db, user_id)
    if not user: return
    
    # Удаляем файл с диска
    if user.avatar_url:
        _delete_old_file(user.avatar_url)
        
    # Очищаем поле в БД
    user.avatar_url = None
    db.commit()
    db.refresh(user)
    return user

def delete_banner(db: Session, user_id: int):
    """Удаляет баннер пользователя."""
    user = get_user(db, user_id)
    if not user: return
    
    if user.banner_url:
        _delete_old_file(user.banner_url)
        
    user.banner_url = None
    db.commit()
    db.refresh(user)
    return user

def register_device(db: Session, user_id: int, fcm_token: str, device_type: str):
    """Сохраняет токен устройства для пушей."""
    # Проверяем, есть ли уже такой токен (может быть у другого юзера, если перелогинился)
    existing = db.query(models.UserDevice).filter(models.UserDevice.fcm_token == fcm_token).first()
    
    if existing:
        existing.user_id = user_id
        existing.device_type = device_type
        existing.last_active_at = func.now()
    else:
        new_device = models.UserDevice(
            user_id=user_id,
            fcm_token=fcm_token,
            device_type=device_type
        )
        db.add(new_device)
    
    db.commit()

# --- ЧЕРНЫЙ СПИСОК ---
def block_user(db: Session, blocker_id: int, blocked_id: int):
    if blocker_id == blocked_id:
        raise HTTPException(400, "Нельзя заблокировать себя")
        
    # Проверка существования
    if not get_user(db, blocked_id):
        raise HTTPException(404, "Пользователь не найден")
        
    # Проверка дубликата
    existing = db.query(models.UserBlock).filter_by(blocker_id=blocker_id, blocked_id=blocked_id).first()
    if existing:
        return # Уже заблокирован
        
    block = models.UserBlock(blocker_id=blocker_id, blocked_id=blocked_id)
    db.add(block)
    db.commit()

def unblock_user(db: Session, blocker_id: int, blocked_id: int):
    block = db.query(models.UserBlock).filter_by(blocker_id=blocker_id, blocked_id=blocked_id).first()
    if block:
        db.delete(block)
        db.commit()

def is_blocked(db: Session, blocker_id: int, target_id: int) -> bool:
    """Проверяет, заблокировал ли blocker_id пользователя target_id."""
    return db.query(models.UserBlock).filter_by(blocker_id=blocker_id, blocked_id=target_id).first() is not None