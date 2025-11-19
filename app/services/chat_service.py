from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from sqlalchemy import and_, func

from app.db import models, schemas
from app.services import user_service

def create_new_chat(
    db: Session, 
    creator: models.User, 
    chat_data: schemas.ChatCreate
) -> models.Chat:
    """
    Создает новый чат или возвращает существующий (для ЛС).
    """
    # 1. Подготовка списка участников (добавляем себя, убираем дубли)
    participant_ids = chat_data.participant_ids
    if creator.id not in participant_ids:
        participant_ids.append(creator.id)
    participant_ids = list(set(participant_ids))

    # --- ЛОГИКА ДЛЯ ЛИЧНЫХ ЧАТОВ (PRIVATE) ---
    if chat_data.chat_type == models.ChatTypeEnum.private:
        if len(participant_ids) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Личный чат должен иметь ровно двух участников."
            )
        
        # Проверка на существование ЛС
        user1_id, user2_id = participant_ids
        
        existing_chat = db.query(models.Chat).join(models.ChatParticipant).filter(
            models.Chat.chat_type == models.ChatTypeEnum.private,
            models.ChatParticipant.user_id.in_([user1_id, user2_id])
        ).group_by(models.Chat.id).having(func.count(models.ChatParticipant.user_id) == 2).first()

        if existing_chat:
            # Доп. проверка состава участников
            participants = [p.user_id for p in existing_chat.participant_links]
            if set(participants) == set(participant_ids):
                return existing_chat

    # --- ЛОГИКА ДЛЯ ГРУПП (GROUP) ---
    owner_id = None
    
    if chat_data.chat_type == models.ChatTypeEnum.group:
        # Проверка лимита
        if len(participant_ids) > 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Максимум 30 участников в группе"
            )
        # ⭐ ВАЖНО: Назначаем владельца
        owner_id = creator.id

    # --- СОЗДАНИЕ ЧАТА (ОБЩЕЕ) ---
    
    # 1. Проверка существования всех юзеров
    participants_objs = []
    for uid in participant_ids:
        user = user_service.get_user(db, user_id=uid)
        if not user:
             raise HTTPException(status_code=404, detail=f"User {uid} not found")
        participants_objs.append(user)

    # 2. Создаем объект чата (один раз!)
    db_chat = models.Chat(
        chat_type=chat_data.chat_type,
        chat_name=chat_data.chat_name,
        owner_id=owner_id  # <-- Здесь передается ID создателя
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)

    # 3. Добавляем участников
    for user in participants_objs:
        participant_link = models.ChatParticipant(
            user_id=user.id,
            chat_id=db_chat.id
        )
        db.add(participant_link)
    
    db.commit()
    db.refresh(db_chat)
    
    return db_chat


def get_user_chats(db: Session, user_id: int) -> List[models.Chat]:
    """Возвращает список всех чатов пользователя."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return [link.chat for link in user.chat_links]


def add_user_to_chat(db: Session, chat_id: int, user_id: int, requester_id: int):
    """Добавить пользователя в группу."""
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.chat_type == models.ChatTypeEnum.private:
        raise HTTPException(status_code=400, detail="Нельзя добавить участника в ЛС")

    # Проверка лимита
    current_count = db.query(func.count(models.ChatParticipant.id)).filter(
        models.ChatParticipant.chat_id == chat_id
    ).scalar()
    
    if current_count >= 30:
        raise HTTPException(status_code=400, detail="Группа переполнена (макс. 30)")

    # Проверка прав (участник чата)
    is_member = db.query(models.ChatParticipant).filter(
        models.ChatParticipant.chat_id == chat_id,
        models.ChatParticipant.user_id == requester_id
    ).first()
    if not is_member:
         raise HTTPException(status_code=403, detail="Вы не участник чата")

    # Проверка на дубликат
    existing = db.query(models.ChatParticipant).filter(
        models.ChatParticipant.chat_id == chat_id,
        models.ChatParticipant.user_id == user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь уже в чате")

    new_participant = models.ChatParticipant(chat_id=chat_id, user_id=user_id)
    db.add(new_participant)
    db.commit()
    return True


def remove_user_from_chat(db: Session, chat_id: int, user_id_to_remove: int, requester_id: int):
    """Удалить участника."""
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(status_code=404, detail="Chat not found")

    # Если удаляем кого-то другого, нужно быть владельцем
    if user_id_to_remove != requester_id:
        if chat.owner_id != requester_id:
            raise HTTPException(status_code=403, detail="Только владелец может удалять участников")

    participant = db.query(models.ChatParticipant).filter(
        models.ChatParticipant.chat_id == chat_id,
        models.ChatParticipant.user_id == user_id_to_remove
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Участник не найден")
        
    db.delete(participant)
    db.commit()
    return True


def set_custom_nickname(db: Session, chat_id: int, target_user_id: int, nickname: str, requester_id: int):
    """Установить никнейм."""
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(status_code=404, detail="Chat not found")

    if target_user_id != requester_id:
        if chat.owner_id != requester_id:
            raise HTTPException(status_code=403, detail="Только владелец может менять чужие никнеймы")

    participant = db.query(models.ChatParticipant).filter(
        models.ChatParticipant.chat_id == chat_id,
        models.ChatParticipant.user_id == target_user_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    participant.custom_nickname = nickname
    db.commit()
    return True


def update_chat_name(db: Session, chat_id: int, new_name: str, requester_id: int):
    """Переименовать группу (только владелец)."""
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat: raise HTTPException(status_code=404, detail="Chat not found")
    
    if chat.chat_type != models.ChatTypeEnum.group:
        raise HTTPException(status_code=400, detail="Можно переименовывать только группы")

    if chat.owner_id != requester_id:
        raise HTTPException(status_code=403, detail="Только владелец может переименовывать группу")

    chat.chat_name = new_name
    db.commit()
    return True