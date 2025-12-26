from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Словарь: user_id -> Список WebSocket соединений
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Принимает соединение и запоминает пользователя."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Удаляет соединение из списка активных."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # Если список пуст, удаляем ключ
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        """
        Отправляет сообщение пользователю на ВСЕ его активные соединения.
        """
        if user_id in self.active_connections:
            # Отправляем всем соединениям пользователя
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                     # Можно добавить логирование или очистку мертвых соединений
                     pass
            return True
        return False
    
    def is_user_online(self, user_id: int) -> bool:
        """Проверяет, подключен ли пользователь."""
        return user_id in self.active_connections

# Создаем глобальный экземпляр менеджера
manager = ConnectionManager()