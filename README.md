# X Mobile Site

Проект на `Node.js + static frontend` с:
- публичным сайтом (`index.html`, `shop.html`)
- личным кабинетом клиента (`account.html`)
- админ-панелью (`admin.html`)
- API и хранением данных в `server-data/database.json`
- Telegram-интеграцией (привязка аккаунта, уведомления, управление статусами через webhook бота)

## Запуск локально

1. Установите Node.js 18+.
2. Откройте папку `F:\site`.
3. Запустите:

```bash
npm start
```

4. Откройте:

```text
http://localhost:8080
```

## Основные страницы

- Главная: `/`
- Магазин: `/shop.html`
- Личный кабинет: `/account.html`
- Вход в админку: `/admin-login.html`
- Админка: `/admin.html`

## Переменные окружения

Обязательные:
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`

Опциональные:
- `MANAGER_LOGIN`
- `MANAGER_PASSWORD`
- `ADMIN_SESSION_TTL_MS`
- `USER_SESSION_TTL_MS`
- `APP_BASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ADMIN_CHAT_IDS` (через запятую)
- `TELEGRAM_MANAGER_CHAT_IDS` (через запятую)
- `EMAIL_WEBHOOK_URL`

Пример `.env`:

```env
ADMIN_LOGIN=admin
ADMIN_PASSWORD=change_me
MANAGER_LOGIN=manager
MANAGER_PASSWORD=change_manager_password
ADMIN_SESSION_TTL_MS=43200000
USER_SESSION_TTL_MS=1209600000
APP_BASE_URL=http://localhost:8080
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ADMIN_CHAT_IDS=
TELEGRAM_MANAGER_CHAT_IDS=
EMAIL_WEBHOOK_URL=
```

## API (ключевые точки)

Публичные/клиентские:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET/PATCH /api/me/profile`
- `POST /api/me/change-password`
- `POST /api/me/telegram/link-code`
- `POST /api/me/telegram/unlink`
- `GET /api/me/orders`
- `GET /api/me/requests`
- `GET /api/me/returns`
- `POST /api/me/returns`
- `POST /api/applications` (legacy-совместимый приём заявок с сайта)

Админские:
- `POST /api/admin/login`
- `GET /api/admin/session`
- `GET /api/applications`
- `PATCH /api/applications/:id/status`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/returns`
- `PATCH /api/admin/returns/:id/status`

Telegram:
- `POST /api/telegram/webhook`

## Хранилище данных

Серверное хранилище:
- `server-data/database.json`
- `server-data/uploads/` (вложения возвратов)

Legacy-файл `server-data/applications.json` используется для безопасной миграции при первом запуске.

## Важно

- Для работы статусов, личного кабинета и Telegram нужен backend (Node.js), статический хостинг без сервера не подойдёт.
- Привязка Telegram выполняется безопасно через одноразовый код (`/start link_<CODE>` в боте).
