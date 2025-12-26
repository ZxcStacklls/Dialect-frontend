from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any
from pydantic import ValidationError
import uuid
import os
import shutil

from app.db import database, schemas, models
from app.services import message_service, user_service, notification_service, chat_service
from app.services.connection_manager import manager
from app.core import security
from app.api.deps import get_current_active_user

router = APIRouter(
    prefix="/v1/messages",
    tags=["Messages"]
)

# --- Хелпер для авторизации в WebSocket ---
def get_user_from_token(token: str, db: Session):
    """Проверяет токен из URL и возвращает user_id."""
    try:
        payload = security.verify_and_decode_token(token)
        return payload.user_id
    except Exception as e:
        print(f"❌ ОШИБКА АВТОРИЗАЦИИ WEBSOCKET: {e}")
        return None

# --- Helpers for Status Broadcasting ---
async def broadcast_status_change(db: Session, user_id: int, is_online: bool):
    """
    Рассылает всем собеседникам уведомление о смене статуса.
    """
    # 1. Находим все чаты, где есть этот юзер
    # Оптимизация: Можно использовать RAW SQL для скорости, но пока так
    chats = chat_service.get_user_chats(db, user_id)
    
    # 2. Собираем уникальные ID собеседников
    recipient_ids = set()
    for chat in chats:
        for p in chat.participant_links:
            if p.user_id != user_id:
                recipient_ids.add(p.user_id)
    
    # 3. Отправляем уведомление
    payload = {
        "type": "user_status",
        "user_id": user_id,
        "is_online": is_online
    }
    
    for rid in recipient_ids:
        await manager.send_personal_message(payload, rid)


# 🔵 HTTP Эндпоинт: Загрузка истории
@router.get("/history/{chat_id}", response_model=List[schemas.Message])
def get_chat_history(
    chat_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    return message_service.get_chat_history(db, chat_id, current_user.id, limit, offset)


# 🔵 HTTP Эндпоинт: Детали прочтения
@router.get("/{message_id}/reads", response_model=List[schemas.ReadReceipt])
def get_message_reads(
    message_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    return message_service.get_message_read_details(db, message_id, current_user.id)


# 🔵 HTTP Эндпоинт: Загрузка вложения (Картинка/Файл)
@router.post("/upload", status_code=200)
def upload_message_attachment(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Загружает файл и возвращает URL.
    Клиент должен отправить этот URL в WebSocket как content с типом 'image'/'file'.
    """
    # Простая валидация размера (например 50МБ)
    file.file.seek(0, os.SEEK_END)
    if file.file.tell() > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large (Max 50MB)")
    file.file.seek(0)

    if not os.path.exists("uploads"):
        os.makedirs("uploads")
    
    # Генерируем уникальное имя
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    file_name = f"attachment_{uuid.uuid4()}.{file_ext}"
    file_path = f"uploads/{file_name}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/static/{file_name}", "filename": file.filename}


# 🟢 WebSocket Эндпоинт (Живое общение)
@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...), 
    db: Session = Depends(database.get_db)
):
    # 1. Проверка авторизации
    user_id = get_user_from_token(token, db)
    if user_id is None:
        await websocket.close(code=1008)
        return

    # 2. Подключаем пользователя
    await manager.connect(websocket, user_id)
    
    # 📢 Уведомляем всех, что мы ОНЛАЙН
    await broadcast_status_change(db, user_id, is_online=True)
    
    try:
        while True:
            # 3. Ждем сообщение
            data: Dict[str, Any] = await websocket.receive_json()
            event_type = data.get("type")
            
            # --- РОУТИНГ СОБЫТИЙ ---
            
            # === 1. НОВОЕ СООБЩЕНИЕ ===
            if event_type in (None, "new_message"):
                try:
                    # Конвертация строки в байты (для Pydantic)
                    raw_content = data.get("content")
                    if isinstance(raw_content, str):
                        raw_content = raw_content.encode('utf-8')

                    # Получаем тип сообщения (text, image, file), по умолчанию text
                    msg_type_str = data.get("message_type", "text")
                    
                    # Получаем reply_to_id если это ответ на сообщение
                    reply_to_id = data.get("reply_to_id")
                    if reply_to_id:
                        reply_to_id = int(reply_to_id)

                    msg_create = schemas.MessageCreate(
                        chat_id=data.get("chat_id"),
                        content=raw_content,
                        message_type=msg_type_str,
                        reply_to_id=reply_to_id
                    )
                    
                    # Сохраняем в БД (здесь же внутри проверяется ЧС)
                    new_msg = message_service.create_message(
                        db=db, 
                        sender_id=user_id, 
                        msg_data=msg_create
                    )

                    # Формируем ответ для WebSocket
                    # Получаем данные ответа на сообщение если есть
                    reply_to_data = None
                    if new_msg.reply_to_id:
                        replied_msg = db.query(models.Message).filter(models.Message.id == new_msg.reply_to_id).first()
                        if replied_msg:
                            reply_to_data = {
                                "id": replied_msg.id,
                                "content": replied_msg.content.decode('utf-8') if isinstance(replied_msg.content, bytes) else replied_msg.content,
                                "sender_id": replied_msg.sender_id
                            }
                    
                    response_data = {
                        "type": "new_message",
                        "id": new_msg.id,
                        "chat_id": new_msg.chat_id,
                        "sender_id": user_id,
                        "content": new_msg.content.decode('utf-8') if isinstance(new_msg.content, bytes) else new_msg.content,
                        "message_type": new_msg.message_type,
                        "sent_at": new_msg.sent_at.isoformat(),
                        "status": "sent",
                        "reply_to_id": new_msg.reply_to_id,
                        "reply_to": reply_to_data,
                        "is_edited": new_msg.is_edited
                    }

                    participant_ids = message_service.get_chat_participants(db, chat_id=new_msg.chat_id)
                    
                    # Получаем инфо об отправителе для Пуша
                    sender = db.query(models.User).filter(models.User.id == user_id).first()
                    sender_name = f"{sender.first_name} {sender.last_name or ''}".strip()

                    # Рассылка (WS + Push)
                    for pid in participant_ids:
                        # 1. WebSocket (мгновенно)
                        await manager.send_personal_message(response_data, pid)
                        
                        # 2. Push-уведомление (если это не мы сами)
                        if pid != user_id:
                            # Текст пуша зависит от типа
                            push_body = "Новое сообщение"
                            if new_msg.message_type == models.MessageTypeEnum.text:
                                try:
                                    push_body = new_msg.content.decode('utf-8')
                                except:
                                    push_body = "Текст"
                            elif new_msg.message_type == models.MessageTypeEnum.image:
                                push_body = "📷 Изображение"
                            elif new_msg.message_type == models.MessageTypeEnum.file:
                                push_body = "📁 Файл"
                            elif new_msg.message_type == models.MessageTypeEnum.audio:
                                push_body = "🎤 Голосовое сообщение"

                            # Отправляем пуш (Fire-and-forget)
                            notification_service.send_push_to_user(
                                db, pid, 
                                title=sender_name, 
                                body=push_body,
                                data={"chat_id": str(new_msg.chat_id)}
                            )
                        
                except Exception as e:
                    # Если ошибка (например, ЧС), отправляем её только отправителю
                    await websocket.send_json({"error": f"Message error: {str(e)}"})


            # === 2. ПРОЧИТАНО (READ) ===
            elif event_type == "read":
                chat_id = data.get("chat_id")
                msg_id = data.get("message_id")
                
                if chat_id and msg_id:
                    message_service.mark_messages_as_read(db, chat_id, user_id, msg_id)
                    read_notification = {
                        "type": "message_read",
                        "chat_id": chat_id,
                        "user_id": user_id,
                        "last_read_id": msg_id
                    }
                    parts = message_service.get_chat_participants(db, chat_id=chat_id)
                    for pid in parts:
                        # Broadcast to EVERYONE (including self) to sync read status across devices
                        await manager.send_personal_message(read_notification, pid)


            # === 3. РЕДАКТИРОВАНИЕ (EDIT) ===
            elif event_type == "edit":
                try:
                    msg_id = data.get("message_id")
                    new_text = data.get("content")
                    
                    if not msg_id or not new_text:
                        raise ValueError("Fields 'message_id' and 'content' are required")

                    if isinstance(msg_id, float): msg_id = int(msg_id)
                    if isinstance(new_text, str): new_text = new_text.encode('utf-8')

                    updated_msg = message_service.update_message(db, msg_id, user_id, new_text)
                    
                    if updated_msg:
                        edit_notify = {
                            "type": "message_edited",
                            "chat_id": updated_msg.chat_id,
                            "message_id": updated_msg.id,
                            "new_content": updated_msg.content.decode('utf-8')
                        }
                        parts = message_service.get_chat_participants(db, chat_id=updated_msg.chat_id)
                        for pid in parts:
                            await manager.send_personal_message(edit_notify, pid)
                    else:
                        await websocket.send_json({"error": "Edit failed: Not found or forbidden"})
                
                except Exception as e:
                    await websocket.send_json({"error": f"Edit error: {str(e)}"})


            # === 4. УДАЛЕНИЕ (DELETE) ===
            elif event_type == "delete":
                try:
                    msg_id = data.get("message_id")
                    if not msg_id:
                        raise ValueError("Field 'message_id' is required")
                        
                    if isinstance(msg_id, float): msg_id = int(msg_id)

                    msg_obj = db.query(models.Message).filter(models.Message.id == msg_id).first()

                    if msg_obj and msg_obj.sender_id == user_id:
                        target_chat_id = msg_obj.chat_id
                        success = message_service.delete_message(db, msg_id, user_id)
                        
                        if success:
                            delete_notify = {
                                "type": "message_deleted",
                                "chat_id": target_chat_id,
                                "message_id": msg_id
                            }
                            parts = message_service.get_chat_participants(db, chat_id=target_chat_id)
                            for pid in parts:
                                await manager.send_personal_message(delete_notify, pid)
                    else:
                         await websocket.send_json({"error": "Delete failed: Not found or forbidden"})

                except Exception as e:
                    await websocket.send_json({"error": f"Delete error: {str(e)}"})

            # === 5. ЗАКРЕПЛЕНИЕ (PIN) ===
            elif event_type == "pin":
                try:
                    msg_id = data.get("message_id")
                    is_pinned = data.get("is_pinned")
                    
                    if msg_id is None or is_pinned is None:
                         raise ValueError("Fields 'message_id' and 'is_pinned' required")
                         
                    if isinstance(msg_id, float): msg_id = int(msg_id)

                    success = message_service.pin_message(db, msg_id, user_id, is_pinned)
                    
                    if success:
                        msg_obj = db.query(models.Message).filter(models.Message.id == msg_id).first()
                        pin_notify = {
                            "type": "message_pinned",
                            "chat_id": msg_obj.chat_id,
                            "message_id": msg_id,
                            "is_pinned": is_pinned
                        }
                        parts = message_service.get_chat_participants(db, msg_obj.chat_id)
                        for pid in parts:
                            await manager.send_personal_message(pin_notify, pid)
                    else:
                        await websocket.send_json({"error": "Pin failed"})
                        
                except Exception as e:
                    await websocket.send_json({"error": f"Pin error: {str(e)}"})

            # === 6. НЕИЗВЕСТНЫЙ ТИП ===
            else:
                await websocket.send_json({"error": f"Unknown event type: {event_type}"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # При разрыве соединения сразу ставим статус "Офлайн"
        user_service.update_last_seen(db, user_id, force_offline=True)
        # 📢 Уведомляем всех, что мы ОФЛАЙН
        await broadcast_status_change(db, user_id, is_online=False)
        
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket, user_id)
        user_service.update_last_seen(db, user_id, force_offline=True)
        # 📢 Уведомляем всех, что мы ОФЛАЙН
        await broadcast_status_change(db, user_id, is_online=False)