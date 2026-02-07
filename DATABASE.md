# База данных WTFAI

В проекте используется **Prisma** и одна база данных (по умолчанию **SQLite**; на проде можно использовать **PostgreSQL**).

---

## Таблицы (схема)

- **User** — пользователи Telegram: id, username, firstName, isPremium, дневной лимит генераций и дата сброса. Профиль создаётся при первом запросе к `/me` или `/generate`.
- **Video** — видео: prompt, videoUrl, previewUrl, счётчики лайков/просмотров, связь с создателем (User).
- **Like** — лайки: связь пользователь–видео (userId + videoId).
- **GenerationJob** — джобы генерации: prompt, status (awaiting_payment | queued | processing | done | failed), videoId при успехе, error при ошибке.
- **Payment** — оплаты звёздами Telegram: userId, jobId, amountStars, telegramPaymentChargeId (уникальный), createdAt. Записывается при успешной оплате в webhook.

---

## Локально (SQLite)

По умолчанию в `apps/api/.env`:

```env
DATABASE_URL="file:./dev.db"
```

При старте API выполняется `npx prisma db push` — таблицы создаются/обновляются автоматически. Файл `dev.db` появляется в `apps/api/` (или в каталоге из пути в `DATABASE_URL`).

---

## Прод (Railway / Render)

### Вариант 1: SQLite на диске

На Railway можно оставить SQLite и положить файл в постоянный том, например:

```env
DATABASE_URL="file:/tmp/data/dev.db"
```

Учти, что при перезапуске сервиса данные могут теряться, если том не привязан к постоянному хранилищу.

### Вариант 2: PostgreSQL (рекомендуется для прода)

1. В Railway: **New** → **Database** → **PostgreSQL**. Дождись создания и скопируй **DATABASE_URL** (формат `postgresql://user:pass@host:port/dbname?sslmode=require`).
2. В настройках сервиса **API** добавь переменную:
   ```env
   DATABASE_URL=<скопированный URL>
   ```
3. В `apps/api/prisma/schema.prisma` смени провайдер на PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Выполни миграции (один раз, с машины, где есть доступ к этой БД):
   ```bash
   cd apps/api && npx prisma db push
   ```
   Или настрой в Railway команду деплоя так, чтобы после сборки выполнялся `npx prisma db push` (если в деплое есть доступ к `DATABASE_URL`).

После этого API будет использовать PostgreSQL; таблицы User, Video, Like, GenerationJob, Payment те же.

---

## Полезные команды

```bash
cd apps/api

# Применить схему к БД (создать/обновить таблицы)
npx prisma db push

# Сгенерировать Prisma Client (обычно делается при сборке)
npx prisma generate

# Открыть Prisma Studio (просмотр данных)
npx prisma studio
```
