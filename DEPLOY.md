# Как задеплоить и открыть Mini App в Telegram

Сделай по шагам: сначала API, потом фронт, потом BotFather.

---

## Шаг 1. Деплой API (Railway или Render)

### Вариант A: Railway

1. Зайди на [railway.app](https://railway.app), войди через GitHub.
2. **New Project** → **Deploy from GitHub repo** → выбери репозиторий WTFAI.
3. В проекте нажми **Add Service** → **GitHub Repo** → тот же репозиторий.
4. У созданного сервиса открой **Settings**:
   - **Root Directory:** укажи `apps/api`.
   - **Build Command:** оставь по умолчанию (Railway сам запустит `npm run build` из корня сервиса). Если нужно явно: `npm install && prisma generate && npx tsc`.
   - **Start Command:** `node dist/index.js`.
5. **Variables** — добавь переменные из своего `apps/api/.env`:
   - `DATABASE_URL` = `file:./data/dev.db` (для Railway лучше потом перейти на PostgreSQL)
   - `TELEGRAM_BOT_TOKEN` = твой токен от BotFather
   - `OPENAI_API_KEY` = (по желанию)
   - `BASE_URL` = **сюда потом подставишь URL этого сервиса** (например `https://wtfai-api-production.up.railway.app`)
6. Сохрани и дождись деплоя. Скопируй **публичный URL** сервиса (например `https://xxx.up.railway.app`). Это твой **API URL**.

### Вариант B: Render

1. Зайди на [render.com](https://render.com), войди через GitHub.
2. **New** → **Web Service** → подключи репозиторий WTFAI.
3. Настройки:
   - **Root Directory:** `apps/api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/index.js`
4. **Environment** — добавь те же переменные, что выше. `BASE_URL` = URL этого же сервиса (Render покажет его после деплоя).
5. Создай сервис, дождись деплоя, скопируй **API URL**.

---

## Шаг 2. Деплой фронта (Vercel)

1. Зайди на [vercel.com](https://vercel.com), войди через GitHub.
2. **Add New** → **Project** → импортируй репозиторий WTFAI.
3. Настройки проекта:
   - **Root Directory:** нажми **Edit** и выбери папку `apps/web` (не корень репозитория).
   - **Framework Preset:** Vite (подставится сам).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** — добавь:
   - Имя: `VITE_API_URL`  
   - Значение: **API URL из шага 1** (например `https://wtfai-api-production.up.railway.app`)
5. Нажми **Deploy**. Дождись сборки и скопируй **URL проекта** (например `https://wtfai-xxx.vercel.app`). Это **URL Mini App**.

---

## Шаг 3. BotFather — привязать Mini App

1. Открой [@BotFather](https://t.me/BotFather) в Telegram.
2. Отправь `/mybots` → выбери своего бота.
3. **Bot Settings** → **Menu Button** → **Configure menu button**.
4. **Type:** выбери **Web app**.
5. **Text:** например `Open App` или `Открыть`.
6. **URL:** вставь **URL Mini App из шага 2** (Vercel), например `https://wtfai-xxx.vercel.app`.
7. Сохрани.

---

## Шаг 4. Открыть продукт в Telegram

1. Открой своего бота в Telegram.
2. Нажми кнопку меню (слева от поля ввода) или кнопку **Open App**.
3. Откроется твоя Mini App — можно смотреть ленту, создавать видео, профиль.

---

## Важно

- В **API** в переменной `BASE_URL` должен быть именно URL твоего API (из Railway/Render), чтобы ссылки на видео и статику были правильные.
- В **фронте** переменная `VITE_API_URL` должна совпадать с этим же API URL (она подставляется при сборке).
- В проде **не включай** `DEV_SKIP_TELEGRAM_AUTH` — в `.env` на сервере этой переменной быть не должно (или она не `true`).

---

## Локальный тест через ngrok (без деплоя)

Если хочешь проверить Mini App в Telegram до деплоя:

1. Установи ngrok: [ngrok.com](https://ngrok.com) или `brew install ngrok`.
2. Запусти API и фронт локально (два терминала):
   ```bash
   cd apps/api && npm run dev
   cd apps/web && npm run dev
   ```
3. В третьем терминале: `npx ngrok http 5173` — скопируй **HTTPS-URL** (это URL для фронта).
4. В четвёртом: `npx ngrok http 3000` — скопируй **HTTPS-URL** для API.
5. В `apps/web/.env` пропиши `VITE_API_URL=<URL API из ngrok>`, перезапусти фронт (`npm run dev`).
6. В BotFather в Menu Button укажи **URL фронта из ngrok** (шаг 3).
7. Открой бота в Telegram и нажми кнопку меню — откроется твоя Mini App по ngrok.

После проверки можно перейти на деплой по шагам 1–4 выше.
