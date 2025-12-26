from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from sqlalchemy import func
from typing import List
from PIL import Image, UnidentifiedImageError
import shutil
import uuid
import os
import datetime

from app.db import models, schemas
from app.services import user_service

# --- ВАЛИДАТОР (Дублируем или импортируем, если бы был utils.py) ---
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"PNG", "JPEG", "JPG", "WEBP"}

def _delete_old_file(file_url: str):
    if not file_url: return
    filename = file_url.replace("/static/", "")
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

def _validate_image(file: UploadFile, target_width: int, target_height: int):
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Файл слишком большой (макс {MAX_FILE_SIZE//1024//1024}MB)")

    try:
        image = Image.open(file.file)
        image.verify()
        file.file.seek(0)
        image = Image.open(file.file)
        
        if image.format.upper() not in ALLOWED_EXTENSIONS:
             raise HTTPException(status_code=400, detail="Недопустимый формат (PNG/JPG).")
             
        width, height = image.size
        if width != target_width or height != target_height:
             raise HTTPException(400, f"Разрешение должно быть {target_width}x{target_height}px")
             
        file.file.seek(0)
    except UnidentifiedImageError:
        raise HTTPException(400, "Файл не является изображением")


# --- ЛОГИКА ЧАТОВ (Без изменений в логике, только код) ---

def create_private_chat(db: Session, creator: models.User, target_user_id: int) -> models.Chat:
    if creator.id == target_user_id:
        raise HTTPException(status_code=400, detail="Нельзя создать чат с самим собой")

    user1_id, user2_id = creator.id, target_user_id
    existing_chat = db.query(models.Chat).join(models.ChatParticipant).filter(
        models.Chat.chat_type == models.ChatTypeEnum.private,
        models.ChatParticipant.user_id.in_([user1_id, user2_id])
    ).group_by(models.Chat.id).having(func.count(models.ChatParticipant.user_id) == 2).first()

    if existing_chat:
        parts = [p.user_id for p in existing_chat.participant_links]
        if set(parts) == set([user1_id, user2_id]):
            return existing_chat

    target_user = user_service.get_user(db, target_user_id)
    if not target_user: raise HTTPException(404, "Пользователь не найден")

    db_chat = models.Chat(chat_type=models.ChatTypeEnum.private, chat_name=None, owner_id=None)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)

    db.add(models.ChatParticipant(user_id=creator.id, chat_id=db_chat.id))
    db.add(models.ChatParticipant(user_id=target_user.id, chat_id=db_chat.id))
    
    db.commit()
    db.refresh(db_chat)
    return db_chat

def create_group_chat(db: Session, creator: models.User, group_data: schemas.ChatCreateGroup) -> models.Chat:
    participant_ids = group_data.participant_ids
    if creator.id not in participant_ids: participant_ids.append(creator.id)
    participant_ids = list(set(participant_ids))

    if len(participant_ids) > 30: raise HTTPException(400, "Максимум 30 участников.")

    for uid in participant_ids:
        if not user_service.get_user(db, uid): raise HTTPException(404, f"User {uid} not found")

    db_chat = models.Chat(chat_type=models.ChatTypeEnum.group, chat_name=group_data.chat_name, owner_id=creator.id)
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)

    for uid in participant_ids:
        db.add(models.ChatParticipant(user_id=uid, chat_id=db_chat.id))
    
    db.commit()
    db.refresh(db_chat)
    return db_chat


# --- ОБНОВЛЕННАЯ ЗАГРУЗКА АВАТАРКИ ГРУППЫ ---
def upload_chat_avatar(db: Session, chat_id: int, user_id: int, file: UploadFile) -> str:
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    
    if chat.chat_type != models.ChatTypeEnum.group:
        raise HTTPException(400, "Аватарки только для групп")
        
    if chat.owner_id != user_id:
        raise HTTPException(403, "Только владелец может менять аватарку группы")

    # 1. Валидация (Допустим для группы тоже 1024x1024)
    _validate_image(file, 1024, 1024)

    # 2. Удаление старой
    if chat.avatar_url:
        _delete_old_file(chat.avatar_url)

    if not os.path.exists("uploads"): os.makedirs("uploads")
    
    file_ext = file.filename.split(".")[-1]
    file_name = f"chat_{chat_id}_{uuid.uuid4()}.{file_ext}"
    file_path = f"uploads/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    url = f"/static/{file_name}"
    chat.avatar_url = url
    db.commit()
    return url

def delete_chat_avatar(db: Session, chat_id: int, user_id: int) -> models.Chat:
    """Удаляет аватарку группы и файл с диска."""
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(404, "Chat not found")
        
    if chat.chat_type != models.ChatTypeEnum.group:
        raise HTTPException(400, "Удаление аватарки возможно только для групп")
        
    # Права: только владелец
    if chat.owner_id != user_id:
        raise HTTPException(403, "Только владелец может удалять аватарку группы")
        
    # Удаление старого файла
    if chat.avatar_url:
        _delete_old_file(chat.avatar_url)
        
    # Очистка ссылки в БД
    chat.avatar_url = None
    db.commit()
    return chat

def get_user_chats(db: Session, user_id: int) -> List[models.Chat]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    return [link.chat for link in user.chat_links]

def add_user_to_chat(db: Session, chat_id: int, user_id: int, requester_id: int):
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    if chat.chat_type == models.ChatTypeEnum.private: raise HTTPException(400, "Private chat error")
    
    is_member = db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=requester_id).first()
    if not is_member: raise HTTPException(403, "Not member")
    
    count = db.query(func.count(models.ChatParticipant.id)).filter_by(chat_id=chat_id).scalar()
    if count >= 30: raise HTTPException(400, "Full group")
    
    if db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=user_id).first():
        raise HTTPException(400, "User already in chat")
        
    db.add(models.ChatParticipant(chat_id=chat_id, user_id=user_id))
    db.commit()
    return True

def remove_user_from_chat(db: Session, chat_id: int, user_id_to_remove: int, requester_id: int):
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    if user_id_to_remove != requester_id and chat.owner_id != requester_id:
        raise HTTPException(403, "Owner only")
    
    part = db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=user_id_to_remove).first()
    if not part: raise HTTPException(404, "Not found")
    db.delete(part)
    db.commit()
    return True

def set_custom_nickname(db: Session, chat_id: int, target_user_id: int, nickname: str, requester_id: int):
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    if target_user_id != requester_id and chat.owner_id != requester_id:
        raise HTTPException(403, "Permission denied")
        
    part = db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=target_user_id).first()
    if not part: raise HTTPException(404, "Not found")
    part.custom_nickname = nickname
    db.commit()
    return True

def update_chat_name(db: Session, chat_id: int, new_name: str, requester_id: int):
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    if chat.chat_type != models.ChatTypeEnum.group: raise HTTPException(400, "Group only")
    if chat.owner_id != requester_id: raise HTTPException(403, "Owner only")
    chat.chat_name = new_name
    db.commit()
    return True

def delete_chat(db: Session, chat_id: int, user_id: int, for_everyone: bool) -> List[int]:
    """
    Удаляет чат и возвращает список ID пользователей, которых нужно уведомить.
    """
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    
    affected_users = []

    if for_everyone:
        if chat.chat_type == models.ChatTypeEnum.group and chat.owner_id != user_id:
            raise HTTPException(403, "Owner only")
        if chat.chat_type == models.ChatTypeEnum.private and not db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=user_id).first():
            raise HTTPException(403, "Not member")
            
        # Собираем всех участников для уведомления
        participants = db.query(models.ChatParticipant).filter(models.ChatParticipant.chat_id == chat_id).all()
        affected_users = [p.user_id for p in participants]
        
        db.delete(chat)
    else:
        part = db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=user_id).first()
        if part: 
            db.delete(part)
            affected_users = [user_id]
            
    db.commit()
    return affected_users

def clear_chat_history(db: Session, chat_id: int, user_id: int, for_everyone: bool) -> List[int]:
    """
    Очищает историю и возвращает список ID пользователей для уведомления.
    """
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(404, "Chat not found")
    
    from app.services import message_service 
    
    affected_users = []

    if for_everyone:
        if chat.chat_type == models.ChatTypeEnum.group and chat.owner_id != user_id:
             raise HTTPException(403, "Owner only")
        if not db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=user_id).first():
             raise HTTPException(403, "Not member")
             
        message_service.delete_all_messages_in_chat(db, chat_id)
        
        # Уведомляем всех участников
        participants = db.query(models.ChatParticipant).filter(models.ChatParticipant.chat_id == chat_id).all()
        affected_users = [p.user_id for p in participants]

    else:
        part = db.query(models.ChatParticipant).filter_by(chat_id=chat_id, user_id=user_id).first()
        if not part: raise HTTPException(404, "Not member")
        part.last_cleared_at = func.now()
        affected_users = [user_id]
        
        db.commit()
    return affected_users