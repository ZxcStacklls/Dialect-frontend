from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.db import database, models, schemas
from app.api.deps import get_current_active_user
from app.services import chat_service

router = APIRouter(
    prefix="/v1/chats",
    tags=["Chats"],
    dependencies=[Depends(get_current_active_user)]
)

# --- ХЕЛПЕР ДЛЯ ДИНАМИЧЕСКОГО ИМЕНИ И АВАТАРКИ ---
def _format_chat_response(chat: models.Chat, current_user_id: int) -> schemas.Chat:
    """
    Формирует ответ для фронтенда:
    - Private: Имя = Имя собеседника, Аватар = Аватар собеседника.
    - Group: Имя = Название группы, Аватар = Аватар группы.
    """
    participants = [link.user for link in chat.participant_links]
    
    # 1. По умолчанию берем данные из самой группы (для Group)
    display_name = chat.chat_name
    display_avatar = chat.avatar_url 

    # 2. Если это ЛС, переписываем данные данными собеседника
    if chat.chat_type == models.ChatTypeEnum.private:
        # Ищем того, кто НЕ я
        other_user = next((u for u in participants if u.id != current_user_id), None)
        if other_user:
            display_name = f"{other_user.first_name} {other_user.last_name or ''}".strip()
            display_avatar = other_user.avatar_url 
        else:
            display_name = "Неизвестный"

    return schemas.Chat(
        id=chat.id,
        chat_type=chat.chat_type,
        chat_name=display_name,   # Итоговое имя
        avatar_url=display_avatar, # Итоговая аватарка
        owner_id=chat.owner_id,
        participants=[schemas.UserPublic.from_orm(p) for p in participants]
    )


# 1. СОЗДАТЬ ЛИЧНЫЙ ЧАТ (Private)
@router.post("/private", response_model=schemas.Chat)
def create_private_chat(
    chat_data: schemas.ChatCreatePrivate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    new_chat = chat_service.create_private_chat(db, current_user, chat_data.target_user_id)
    return _format_chat_response(new_chat, current_user.id)


# 2. СОЗДАТЬ ГРУППУ (Group)
@router.post("/group", response_model=schemas.Chat)
def create_group_chat(
    chat_data: schemas.ChatCreateGroup,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    new_chat = chat_service.create_group_chat(db, current_user, chat_data)
    return _format_chat_response(new_chat, current_user.id)


# 3. ПОЛУЧИТЬ СПИСОК (С правильными именами)
@router.get("/", response_model=List[schemas.Chat])
def get_my_chats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    chats = chat_service.get_user_chats(db, user_id=current_user.id)
    # Применяем форматирование ко всем чатам
    return [_format_chat_response(chat, current_user.id) for chat in chats]


# 4. ЗАГРУЗИТЬ АВАТАРКУ ГРУППЫ
@router.post("/{chat_id}/avatar", response_model=schemas.Chat)
def upload_group_avatar(
    chat_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if not file.content_type.startswith("image/"):
         raise HTTPException(400, detail="Файл должен быть изображением")
         
    chat_service.upload_chat_avatar(db, chat_id, current_user.id, file)
    
    # Возвращаем обновленный чат
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    return _format_chat_response(chat, current_user.id)


@router.post("/{chat_id}/users", status_code=status.HTTP_201_CREATED)
def add_user(
    chat_id: int,
    user_id: int, # Кого добавляем (передаем через Query параметр ?user_id=...)
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Добавить пользователя в группу."""
    chat_service.add_user_to_chat(db, chat_id, user_id, requester_id=current_user.id)
    return {"message": "User added successfully"}

@router.delete("/{chat_id}/users/{target_user_id}", status_code=status.HTTP_200_OK)
def remove_user(
    chat_id: int,
    target_user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Удалить участника (или выйти самому)."""
    chat_service.remove_user_from_chat(
        db, chat_id, user_id_to_remove=target_user_id, requester_id=current_user.id
    )
    return {"message": "User removed/left"}

@router.put("/{chat_id}/users/{user_id}/nickname", status_code=status.HTTP_200_OK)
def set_nickname(
    chat_id: int,
    user_id: int,
    nickname: str = Query(..., min_length=1, max_length=50),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Установить кастомный никнейм в группе."""
    chat_service.set_custom_nickname(
        db, chat_id, target_user_id=user_id, nickname=nickname, requester_id=current_user.id
    )
    return {"message": "Nickname updated"}

@router.put("/{chat_id}/name", status_code=status.HTTP_200_OK)
def rename_chat(
    chat_id: int,
    name: str = Query(..., min_length=1, max_length=100),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Переименовать группу (только для владельца)."""
    chat_service.update_chat_name(
        db, chat_id, new_name=name, requester_id=current_user.id
    )
    return {"message": "Chat renamed successfully"}


@router.delete("/{chat_id}", status_code=status.HTTP_200_OK)
def delete_chat_endpoint(
    chat_id: int,
    for_everyone: bool = Query(False), # ?for_everyone=true/false
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Удалить чат целиком.
    - for_everyone=false (default): Удалить у себя (выйти).
    - for_everyone=true: Удалить у всех (удалить чат физически).
    """
    chat_service.delete_chat(db, chat_id, current_user.id, for_everyone)
    return {"message": "Chat deleted"}


@router.delete("/{chat_id}/messages", status_code=status.HTTP_200_OK)
def clear_history_endpoint(
    chat_id: int,
    for_everyone: bool = Query(False),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Очистить историю сообщений.
    - for_everyone=false: Скрыть старые сообщения только для себя.
    - for_everyone=true: Удалить сообщения физически.
    """
    chat_service.clear_chat_history(db, chat_id, current_user.id, for_everyone)
    return {"message": "History cleared"}

@router.delete("/{chat_id}/avatar", response_model=schemas.Chat)
def delete_group_avatar(
    chat_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Удалить аватарку группы (только для владельца)."""
    updated_chat = chat_service.delete_chat_avatar(db, chat_id, current_user.id)
    return _format_chat_response(updated_chat, current_user.id) # Используем хеллпер для форматирования