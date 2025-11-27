# 🌟 Dialect — Messenger API  

> **v1.0** — Первая версия. Это только **фундамент** для чего-то большого! 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-00a651.svg)](https://fastapi.tiangolo.com/)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-brightgreen.svg)]()

---

## 📖 О проекте  

**Dialect** — это moderne серверная часть мессенджера на **FastAPI** с поддержкой real-time обмена сообщениями через **WebSocket**. 

Проект находится в **активной разработке**. Текущая версия (**v1.0**) — это **стабильная база**, которая закладывает фундамент для будущих масштабных расширений.

### ✨ Основные возможности v1:
- ✅ **JWT аутентификация** — вход по номеру телефона
- ✅ **Personal & Group Chats** — личные и групповые чаты
- ✅ **Real-time WebSocket** — live обмен сообщениями
- ✅ **Push Notifications** — уведомления через Firebase
- ✅ **Media Upload** — загрузка аватарок и файлов
- ✅ **Read Receipts** — отметки о прочтении
- ✅ **Blacklist System** — система блокировок
- ✅ **Optimized Architecture** — готовность к масштабированию
- ✅ **Open Source** — открытый исходный код

---

## 🛠️ Технологический стек  

| Компонент | Технология | Статус |
|-----------|-----------|--------|
| **Backend Framework** | FastAPI 0.104+ | ✅ Готово |
| **Real-time** | WebSocket + Connection Manager | ✅ Готово |
| **Database** | MySQL 8.0+ + SQLAlchemy | ✅ Готово |
| **Authentication** | JWT (PyJWT) + Argon2 | ✅ Готово |
| **Push Notifications** | Firebase Admin SDK | ✅ Готово |
| **File Storage** | Local uploads/ | ✅ Готово |
| **Optimization** | Bloom Filter (pybloom-live) | ✅ Готово |
| **Android Frontend** | Kotlin + Jetpack Compose | ✅ Готово |
| **Testing** | Pytest + HTTP тесты | 🔄 В разработке |
| **CI/CD** | GitHub Actions | 📋 Планируется |
| **Deployment** | Docker | 📋 Планируется |

---

## 🚀 Быстрый старт

### Требования
Python 3.11+ MySQL 8.0+ Git

### Установка (3 шага)

**1️⃣ Клонируйте репозиторий**
```bash
git clone https://github.com/yourusername/dialect-messenger.git
cd dialect-messenger
```

**2️⃣ Настройка окружения**
```bash
# Создайте виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установите зависимости
pip install -r requirements.txt
```

**3️⃣ Конфигурация**
```bash
# Скопируйте .env файл и заполните данные
cp .env.example .env
```

### Содержимое .env:
```
# Database
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dialect_db

# JWT
SECRET_KEY=your_super_secret_key_here_min_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Firebase (для пушей)
FIREBASE_CREDENTIALS_PATH=./serviceAccountKey.json
```

**4️⃣ Запуск**
```bash
# Инициализация БД
python -c "from app.db import database; database.create_all_tables()"

# Запуск сервера
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### ✅ Готово! Сервер доступен: http://localhost:8000

## 📱 Android Frontend

Проект включает полноценный Android клиент на Kotlin с Jetpack Compose!

### Быстрый старт Android приложения

1. **Откройте проект в Android Studio:**
   ```bash
   cd frontend
   # Откройте папку frontend в Android Studio
   ```

2. **Настройте BASE_URL:**
   - Откройте `app/src/main/java/com/dialect/messenger/data/api/ApiClient.kt`
   - Для эмулятора: `http://10.0.2.2:8000/api/` (уже настроено)
   - Для реального устройства: замените на IP вашего компьютера

3. **Запустите бэкенд:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Запустите приложение в Android Studio**

📖 **Подробная инструкция:** См. [frontend/README.md](frontend/README.md)


## 📚 API Документация
### 📖 Интерактивные документы

wagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

### 🔑 Основные эндпоинты

**🔐 Аутентификация**
```
POST   /api/v1/auth/register          — Регистрация
POST   /api/v1/auth/token             — Вход (получить JWT)
```

**👤 Профиль пользователя**
```
GET    /api/v1/users/me               — Мой профиль
PATCH  /api/v1/users/me               — Обновить профиль
POST   /api/v1/users/me/avatar        — Загрузить аватарку
GET    /api/v1/users/{user_id}        — Профиль пользователя
GET    /api/v1/users/search?q=name    — Поиск пользователей
POST   /api/v1/users/block/{user_id}  — Заблокировать
```

**💬 Чаты**
```
GET    /api/v1/users/me               — Мой профиль
PATCH  /api/v1/users/me               — Обновить профиль
POST   /api/v1/users/me/avatar        — Загрузить аватарку
GET    /api/v1/users/{user_id}        — Профиль пользователя
GET    /api/v1/users/search?q=name    — Поиск пользователей
POST   /api/v1/users/block/{user_id}  — Заблокировать
```

**📨 Сообщения (Real-time)**
```
WS     /api/v1/messages/ws?token=...  — WebSocket подключение
GET    /api/v1/messages/history/{id}  — История сообщений
POST   /api/v1/messages/upload        — Загрузить файл
```

### WebSocket события
```json
// Отправить сообщение
{
  "type": "new_message",
  "chat_id": 1,
  "content": "Hello world!",
  "message_type": "text"
}

// Отметить как прочитано
{
  "type": "message_read",
  "message_id": 42,
  "chat_id": 1
}
```

## 🏗️ Структура проекта
```
dialect/
├── 📁 app/                        # Backend (FastAPI)
│   ├── main.py                    # Точка входа
│   ├── 📁 api/v1/
│   │   ├── auth.py               # Аутентификация
│   │   ├── users.py              # Профили
│   │   ├── chats.py              # Чаты
│   │   └── messages.py           # Сообщения (WebSocket)
│   ├── 📁 core/
│   │   ├── config.py             # Конфигурация
│   │   ├── security.py           # JWT & Хеширование
│   │   └── bloom_filter.py       # Оптимизация
│   ├── 📁 db/
│   │   ├── database.py           # Подключение БД
│   │   ├── models.py             # SQLAlchemy модели
│   │   └── schemas.py            # Pydantic схемы
│   └── 📁 services/
│       ├── auth_service.py       # Бизнес-логика
│       ├── chat_service.py       # Работа с чатами
│       ├── message_service.py    # Работа с сообщениями
│       ├── connection_manager.py # WebSocket управление
│       └── notification_service.py # Push-уведомления
├── 📁 frontend/                   # Android Frontend
│   ├── 📁 app/
│   │   └── src/main/java/com/dialect/messenger/
│   │       ├── data/             # API клиент, модели, репозитории
│   │       ├── ui/               # Jetpack Compose UI
│   │       └── util/             # Утилиты
│   └── README.md                 # Инструкция по запуску
├── 📁 tests/
│   └── websocket-test.http       # HTTP тесты
├── 📁 uploads/                    # Хранилище файлов
├── requirements.txt              # Зависимости
├── .env                          # Переменные окружения
└── README.md                     # Документация
```

## 🚧 Дорожная карта
**✅ v1.0 (Текущая версия)**
* <input checked="" disabled="" type="checkbox"> Базовая архитектура FastAPI
* <input checked="" disabled="" type="checkbox"> JWT аутентификация
* <input checked="" disabled="" type="checkbox"> Личные и групповые чаты
* <input checked="" disabled="" type="checkbox"> WebSocket real-time
* <input checked="" disabled="" type="checkbox"> Загрузка файлов
* <input checked="" disabled="" type="checkbox"> Push-уведомления (Firebase)
* <input checked="" disabled="" type="checkbox"> Android приложение (Kotlin + Compose)

**v1.1 (В разработке)**
* <input disabled="" type="checkbox"> Unit & Integration тесты
* <input disabled="" type="checkbox"> Docker & Docker Compose
* <input disabled="" type="checkbox"> GitHub Actions CI/CD
* <input disabled="" type="checkbox"> Документация API на Swagger
* <input disabled="" type="checkbox"> Rate limiting
* <input disabled="" type="checkbox"> Database миграции (Alembic)

**📋 v1.2+**
* <input disabled="" type="checkbox"> Голосовые сообщения
* <input disabled="" type="checkbox"> Видео-звонки (WebRTC)
* <input disabled="" type="checkbox"> Групповые звонки
* <input disabled="" type="checkbox"> Реакции на сообщения 😊
* <input disabled="" type="checkbox"> История сообщений (архив)
* <input disabled="" type="checkbox"> Шифрование end-to-end
* <input disabled="" type="checkbox"> Каналы (channels)
* <input disabled="" type="checkbox"> Истории (stories)
* <input disabled="" type="checkbox"> 2FA (двухфакторная аутентификация)
* <input disabled="" type="checkbox"> Восстановление аккаунта через SMS

## 🔒 Безопасность
* 🔐 JWT токены — 60 минут жизни
* 🔐 Argon2 хеширование — защита паролей
* 🔐 CORS — защита от cross-origin запросов
* 🔐 WebSocket валидация — проверка токена при подключении
* 🔐 SQL Injection защита — использование SQLAlchemy ORM
* 🔐 Rate limiting — планируется в v1.1

## ⚡ Производительность
* Bloom Filter — O(1) проверка юзернеймов
* Connection Pooling — пулинг соединений к БД
* In-memory кэш — статусы пользователей
* Асинхронные операции — async/await во всем коде
* Оптимизированные SQL — индексы на ключевых полях

## 🧪 Тестирование
### REST Client (VS Code)
Установите расширение REST Client и используйте файл tests/websocket-test.http

```
### Регистрация
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "phone": "+79991234567",
  "password": "SecurePass123!",
  "username": "john_doe"
}

### Вход
POST http://localhost:8000/api/v1/auth/token
Content-Type: application/x-www-form-urlencoded

username=+79991234567&password=SecurePass123!

### WebSocket подключение
GET http://localhost:8000/api/v1/messages/ws?token=YOUR_JWT_TOKEN
```

**Pytest (планируется)**
```bash
pip install pytest pytest-asyncio
pytest tests/ -v
```

# 🙏 Спасибо!
**Спасибо за интерес к Dialect! 🌟**