from sqlalchemy.orm import Session
from sqlalchemy import update, and_, func
from typing import List
from fastapi import HTTPException, status

from app.db import models, schemas
from app.services import user_service

def check_is_participant(db: Session, chat_id: int, user_id: int):
    participant = db.query(models.ChatParticipant).filter(
        models.ChatParticipant.chat_id == chat_id,
        models.ChatParticipant.user_id == user_id
    ).first()
    if not participant:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Вы не участник")
    return participant

def create_message(
    db: Session, 
    sender_id: int, 
    msg_data: schemas.MessageCreate
) -> models.Message:
    # 1. Проверка участия
    participant = check_is_participant(db, msg_data.chat_id, sender_id)
    
    # 2. Проверка ЧС (Для ЛС)
    chat = db.query(models.Chat).filter(models.Chat.id == msg_data.chat_id).first()
    if chat.chat_type == models.ChatTypeEnum.private:
        # Ищем собеседника
        other_participant = db.query(models.ChatParticipant).filter(
            models.ChatParticipant.chat_id == msg_data.chat_id,
            models.ChatParticipant.user_id != sender_id
        ).first()
        
        if other_participant:
            # Проверяем: "Заблокировал ли СОБЕСЕДНИК (other) МЕНЯ (sender)?"
            if user_service.is_blocked(db, blocker_id=other_participant.user_id, target_id=sender_id):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Вы находитесь в черном списке этого пользователя")

    # 3. Создаем запись
    db_msg = models.Message(
        chat_id=msg_data.chat_id,
        sender_id=sender_id,
        content=msg_data.content,
        message_type=msg_data.message_type,
        status=models.MessageStatusEnum.sent,
        reply_to_id=msg_data.reply_to_id  # Ответ на сообщение
    )
    
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import update, and_, func

# ... (imports)

def get_chat_history(db: Session, chat_id: int, user_id: int, limit: int = 50, offset: int = 0) -> List[models.Message]:
    participant = check_is_participant(db, chat_id, user_id)
    # Eager load reply_to to ensure it's available for serialization
    query = db.query(models.Message).options(joinedload(models.Message.reply_to)).filter(models.Message.chat_id == chat_id)
    if participant.last_cleared_at:
        query = query.filter(models.Message.sent_at > participant.last_cleared_at)
    return query.order_by(models.Message.sent_at.desc()).limit(limit).offset(offset).all()

def get_chat_participants(db: Session, chat_id: int) -> List[int]:
    parts = db.query(models.ChatParticipant.user_id).filter(models.ChatParticipant.chat_id == chat_id).all()
    return [p[0] for p in parts]

# ⭐ ОБНОВЛЕННАЯ ФУНКЦИЯ ПРОЧТЕНИЯ
def mark_messages_as_read(db: Session, chat_id: int, user_id: int, last_message_id: int):
    """
    Помечает сообщения как прочитанные:
    1. Находит все сообщения в чате <= last_message_id, которые еще не прочитаны этим юзером.
    2. Добавляет записи в message_reads.
    3. Обновляет last_read_message_id в chat_participants (для оптимизации).
    """
    participant = check_is_participant(db, chat_id, user_id)
    
    # 1. Оптимизация: берем только сообщения новее, чем то, что мы читали в последний раз
    last_read_id = participant.last_read_message_id or 0
    
    if last_message_id <= last_read_id:
        return # Уже всё прочитано

    # 2. Находим ID сообщений, которые нужно пометить
    # (Чужие сообщения, ID > последнего прочитанного и <= текущего)
    unread_messages = db.query(models.Message.id).filter(
        models.Message.chat_id == chat_id,
        models.Message.id > last_read_id,
        models.Message.id <= last_message_id,
        models.Message.sender_id != user_id # Свои читать не надо
    ).all()
    
    # 3. Массовая вставка в message_reads
    if unread_messages:
        new_reads = [
            models.MessageRead(message_id=msg[0], user_id=user_id) 
            for msg in unread_messages
        ]
        db.add_all(new_reads)
        
        # 4. Обновляем статус самих сообщений на 'read' (для совместимости)
        # Это упрощение: ставим read, если хоть кто-то прочитал. 
        msg_ids = [m[0] for m in unread_messages]
        db.execute(
            update(models.Message)
            .where(models.Message.id.in_(msg_ids))
            .values(status=models.MessageStatusEnum.read)
        )

    # 5. Обновляем "курсор" прочтения у участника
    participant.last_read_message_id = last_message_id
    db.commit()

def get_message_read_details(db: Session, message_id: int, user_id: int) -> List[models.MessageRead]:
    """Получить список всех, кто прочитал сообщение."""
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message: return []
    
    # Проверяем доступ к чату
    check_is_participant(db, message.chat_id, user_id)
    
    return db.query(models.MessageRead).filter(
        models.MessageRead.message_id == message_id
    ).all()

def update_message(db: Session, message_id: int, user_id: int, new_content: bytes):
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message: return None
    if message.sender_id != user_id: return False
    message.content = new_content
    message.is_edited = True  # Помечаем как отредактированное
    db.commit()
    db.refresh(message)
    return message

def delete_message(db: Session, message_id: int, user_id: int):
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message: return None
    is_author = (message.sender_id == user_id)
    chat = db.query(models.Chat).filter(models.Chat.id == message.chat_id).first()
    is_owner = (chat and chat.owner_id == user_id)
    if is_author or is_owner:
        db.delete(message)
        db.commit()
        return True
    return False

def pin_message(db: Session, message_id: int, user_id: int, is_pinned: bool):
    message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not message: return None
    check_is_participant(db, message.chat_id, user_id)
    message.is_pinned = is_pinned
    db.commit()
    return True

def delete_all_messages_in_chat(db: Session, chat_id: int):
    db.query(models.Message).filter(models.Message.chat_id == chat_id).delete()
    db.commit()