# AI Reels — Telegram Mini App

Telegram Mini App с бесконечной вертикальной лентой коротких AI-видео (7–15 сек) в формате «What if…».

## Стек

- **Frontend**: React, TypeScript, Vite, Telegram Web App SDK
- **Backend**: Node.js, Fastify, Prisma, SQLite (MVP)
- **AI**: OpenAI (сценарий + изображения), FFmpeg (сборка видео 9:16)

## Быстрый старт

### 1. Backend (API)

```bash
cd apps/api
cp .env.example .env
# Заполни TELEGRAM_BOT_TOKEN и OPENAI_API_KEY (опционально для моков)
npm install
npx prisma generate
npx prisma db push
npm run dev
```

API: `http://localhost:3000`

- Установи [FFmpeg](https://ffmpeg.org/) для генерации видео.
- Без `OPENAI_API_KEY` работают мок-сценарии и плейсхолдер-картинки.

### 2. Frontend (Mini App)

```bash
cd apps/web
cp .env.example .env
# VITE_API_URL=http://localhost:3000 (или URL твоего API)
npm install
npm run dev
```

**Деплой и открытие Mini App в Telegram:** пошаговая инструкция в [DEPLOY.md](./DEPLOY.md).

Собери статику и задеплой на хостинг (Vercel, Netlify и т.д.):

```bash
npm run build
```

URL приложения укажи в [BotFather](https://t.me/BotFather) → Edit Bot → Menu Button / Web App.

### 3. Проверка в Telegram

- Создай бота через BotFather, получи токен.
- В настройках бота задай URL Mini App (например `https://your-app.vercel.app`).
- Открой бота в Telegram и запусти Mini App.

## API (MVP)

| Method | Path        | Описание                    |
|--------|-------------|-----------------------------|
| GET    | `/feed`     | Лента видео (offset, limit) |
| GET    | `/me`       | Текущий пользователь, лимиты |
| POST   | `/generate`| Запуск генерации (body: `{ prompt }`) |
| GET    | `/job/:id`  | Статус задачи генерации     |
| GET    | `/my-videos`| Мои видео                   |
| POST   | `/like`     | Лайк (body: `{ videoId }`)  |

Все запросы (кроме `/health`) требуют заголовок `X-Telegram-Init-Data` (Mini App передаёт его автоматически).

## Лимиты

- Без подписки: 2 генерации в день (настраивается `DAILY_LIMIT_FREE`).
- С подпиской: 20 в день (`DAILY_LIMIT_PREMIUM`).
- Просмотр ленты — без лимита.

## AI-промпты (расширение)

Сценарий генерируется в `apps/api/src/services/ai/script-generator.ts`:

- Системный промпт задаёт формат: 3–5 сцен, поле `text` (субтитр), `durationSec`, `visual` (описание для картинки).
- Пользовательский ввод — идея вида «If cats ruled the world».

Визуал — в `scene-generator.ts`: к `visual` добавляется суффикс «, vertical 9:16, …». Можно заменить провайдер (DALL·E, Stability, Runway и т.д.) через интерфейс `IAiProvider` в `services/ai/types.ts`.

## Структура проекта

```
WTFAI/
├── apps/
│   ├── api/          # Fastify, Prisma, очередь, AI, FFmpeg
│   │   ├── prisma/
│   │   └── src/
│   │       ├── routes/
│   │       ├── services/ai/
│   │       ├── services/video/
│   │       ├── queue/
│   │       └── middleware/
│   └── web/          # React Mini App
│       └── src/
│           ├── components/Feed|Generate|Profile
│           ├── hooks/
│           └── api/
├── package.json      # workspace root
└── README.md
```

## Как расширять

- **Смена AI**: реализовать новый класс по `IAiProvider` и подключать через конфиг.
- **Масштабирование генерации**: вынести воркер в отдельный процесс, использовать Redis + BullMQ вместо in-memory очереди.
- **S3**: заменить `services/storage.ts` на запись в S3 и отдавать публичные URL.
- **Подписка**: интеграция с Telegram Stars или платёжкой, флаг `User.isPremium` уже есть.
- **Субтитры в видео**: в composer добавить слой с текстом поверх кадров (FFmpeg drawtext или burn-in SRT).

## Лицензия

MIT
