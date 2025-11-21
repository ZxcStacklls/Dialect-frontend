from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Dict, List

from app.db import database, models, schemas
from app.api.deps import get_current_active_user
from app.services import user_service
from app.services.connection_manager import manager
from ...core.bloom_filter import bloom_service

router = APIRouter(
    prefix="/v1/users",
    tags=["Users"]
)

@router.get("/me", response_model=schemas.UserPublic)
def read_users_me(
    current_user: models.User = Depends(get_current_active_user)
):
    current_user.is_online = True 
    return current_user

@router.patch("/me", response_model=schemas.UserPublic)
def update_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """
    Обновить профиль и статус.
    Чтобы поставить статус на время, передайте 'status_expires_at' (UTC timestamp).
    Чтобы поставить навсегда, передайте 'status_expires_at': null (или не передавайте).
    """
    updated_user = user_service.update_user_profile(db, current_user.id, user_update)
    return updated_user

@router.post("/me/avatar", response_model=schemas.UserPublic)
def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if not file.content_type.startswith("image/"):
         raise HTTPException(400, detail="Файл должен быть изображением")
    user_service.upload_avatar(db, current_user.id, file)
    db.refresh(current_user)
    return current_user

# ⭐ НОВЫЙ ЭНДПОИНТ: ЗАГРУЗКА БАННЕРА
@router.post("/me/banner", response_model=schemas.UserPublic)
def upload_my_banner(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Загрузить баннер профиля."""
    if not file.content_type.startswith("image/"):
         raise HTTPException(400, detail="Файл должен быть изображением")
    
    user_service.upload_banner(db, current_user.id, file)
    db.refresh(current_user)
    return current_user

@router.get("/check-username/{username}", response_model=Dict[str, bool])
def check_username_availability(
    username: str,
    db: Session = Depends(database.get_db)
):
    if not username or len(username) < 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Юзернейм слишком короткий.")
    is_available = True
    if bloom_service.contains(username):
        if user_service.get_user_by_username(db, username=username) is not None:
            is_available = False
    return {"is_available": is_available}

@router.get("/search", response_model=List[schemas.UserPublic])
def search_for_users(
    q: str,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    if len(q) < 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Запрос слишком короткий")
    return user_service.search_users(db, query_str=q)

@router.get("/{user_id}", response_model=schemas.UserPublic)
def read_user_by_id(
    user_id: int, 
    db: Session = Depends(database.get_db)
):
    user = user_service.get_user(db, user_id)
    if not user: raise HTTPException(404, "User not found")

    user_public = schemas.UserPublic.from_orm(user)
    user_public.is_online = manager.is_user_online(user.id)
    return user_public

@router.delete("/me/avatar", response_model=schemas.UserPublic)
def delete_my_avatar(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Удалить текущую аватарку."""
    user_service.delete_avatar(db, current_user.id)
    # Обновляем объект пользователя для корректного ответа
    db.refresh(current_user)
    return current_user

@router.delete("/me/banner", response_model=schemas.UserPublic)
def delete_my_banner(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Удалить текущий баннер."""
    user_service.delete_banner(db, current_user.id)
    db.refresh(current_user)
    return current_user

@router.post("/device", status_code=200)
def register_device(
    device: schemas.DeviceCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Регистрация FCM токена для пушей."""
    user_service.register_device(db, current_user.id, device.fcm_token, device.device_type)
    return {"message": "Device registered"}

@router.post("/block/{user_id}", status_code=200)
def block_user(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Заблокировать пользователя."""
    user_service.block_user(db, current_user.id, user_id)
    return {"message": "User blocked"}

@router.delete("/block/{user_id}", status_code=200)
def unblock_user(
    user_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(database.get_db)
):
    """Разблокировать пользователя."""
    user_service.unblock_user(db, current_user.id, user_id)
    return {"message": "User unblocked"}