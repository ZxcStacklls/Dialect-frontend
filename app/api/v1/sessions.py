"""
API эндпоинты для управления сессиями пользователя.
Позволяет просматривать активные сессии и завершать их.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db import schemas, database
from app.services import session_service
from app.api.deps import get_current_user_and_session
from app.db.models import User, UserSession


router = APIRouter(
    prefix="/v1/sessions",
    tags=["Sessions"]
)


@router.get("/", response_model=List[schemas.SessionInfo])
def get_my_sessions(
    current_user: User = Depends(get_current_user_and_session),
    db: Session = Depends(database.get_db)
):
    """
    Получить список всех активных сессий текущего пользователя.
    
    Возвращает информацию об устройстве, IP, времени входа и последней активности.
    Текущая сессия помечена флагом is_current=True.
    """
    # Получаем ID текущей сессии из токена
    current_session_id = getattr(current_user, '_current_session_id', None)
    
    sessions = session_service.get_user_sessions(db, current_user.id)
    
    # Преобразуем в схему с пометкой текущей сессии
    result = []
    for session in sessions:
        session_info = schemas.SessionInfo.model_validate(session)
        session_info.is_current = (session.id == current_session_id)
        result.append(session_info)
    
    return result


@router.delete("/{session_id}")
def revoke_session(
    session_id: int,
    current_user: User = Depends(get_current_user_and_session),
    db: Session = Depends(database.get_db)
):
    """
    Завершить конкретную сессию (на другом устройстве).
    
    Нельзя завершить текущую сессию через этот эндпоинт.
    Для выхода из текущей сессии используйте /auth/logout.
    """
    current_session_id = getattr(current_user, '_current_session_id', None)
    
    if session_id == current_session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя завершить текущую сессию. Используйте /auth/logout"
        )
    
    success = session_service.revoke_session(db, session_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сессия не найдена"
        )
    
    return {"message": "Сессия успешно завершена"}


@router.delete("/")
def revoke_all_other_sessions(
    current_user: User = Depends(get_current_user_and_session),
    db: Session = Depends(database.get_db)
):
    """
    Завершить все сессии кроме текущей.
    
    Полезно для "выйти на всех устройствах" после смены пароля
    или при подозрении на взлом аккаунта.
    """
    current_session_id = getattr(current_user, '_current_session_id', None)
    
    count = session_service.revoke_all_sessions(
        db, 
        current_user.id, 
        except_session_id=current_session_id
    )
    
    return {"message": f"Завершено сессий: {count}"}
