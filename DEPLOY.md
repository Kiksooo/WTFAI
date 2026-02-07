# Как задеплоить и открыть Mini App в Telegram

Сделай по шагам: сначала API, потом фронт, потом BotFather.

---

## Шаг 1. Деплой API (Railway или Render)

### Вариант A: Railway

1. Зайди на [railway.app](https://railway.app), войди через GitHub.
2. **New Project** → **Deploy from GitHub repo** → выбери репозиторий WTFAI.
3. В проекте нажми **Add Service** → **GitHub Repo** → тот же репозиторий.
4. У созданного сервиса **api** открой **Settings** и задай **вручную** (иначе будет "No workspaces found"):
   - **Root Directory:** `apps/api` (обязательно).
   - **Build Command:** `npm install && npm run build` (именно так, без `--workspace=api`).
   - **Start Command:** `node dist/index.js`.
5. **Variables** — добавь переменные из своего `apps/api/.env`:
   - `DATABASE_URL` = `file:./data/dev.db` (для Railway лучше потом перейти на PostgreSQL)
   - `TELEGRAM_BOT_TOKEN` = твой токен от BotFather
   - `OPENAI_API_KEY` = (по желанию; если нет — можно использовать бесплатные ключи ниже)
   - `GROQ_API_KEY` = (опционально, бесплатный тир: [console.groq.com](https://console.groq.com) — для сценариев)
   - `REPLICATE_API_TOKEN` = (опционально, бесплатный старт: [replicate.com](https://replicate.com) — для картинок)
   - `BASE_URL` = **сюда потом подставишь URL этого сервиса** (например `https://wtfai-api-production.up.railway.app`)
   - `PAYMENT_STARS_PER_GENERATION` = (опционально, по умолчанию 5 — сколько звёзд за одну генерацию)
   - `TELEGRAM_WEBHOOK_SECRET` = (опционально, секрет для проверки webhook; задай при настройке setWebhook)
6. Сохрани и дождись деплоя. Скопируй **публичный URL** сервиса — он будет вида **`https://имя-сервиса.up.railway.app`** (например `https://wtfai-api-production.up.railway.app`). Это твой **API URL**.
7. **Оплата звёздами:** чтобы пользователи могли платить за генерации, настрой webhook для бота (см. раздел «Оплата звёздами» ниже).

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

## Админка

Админка доступна по адресу **URL фронта** + `/admin` (например `https://wtfai-xxx.vercel.app/admin`).

1. В **API** (Railway/Render) добавь переменную **ADMIN_SECRET** — любой длинный секретный ключ (например сгенерируй: `openssl rand -hex 24`).
2. Открой в браузере `https://твой-фронт.vercel.app/admin`.
3. Введи **URL API** — если API на Railway, это адрес вида `https://твой-сервис.up.railway.app` — и **ключ админки** (значение `ADMIN_SECRET`).
4. Нажми «Войти». В админке отображаются: сводка (пользователи, видео, джобы, платежи, звёзды), таблицы пользователей, видео, джобов и платежей.

Без переменной **ADMIN_SECRET** админка отключена (API возвращает 503 на запросы к `/admin/*`).

---

## Шаг 4. Открыть продукт в Telegram

1. Открой своего бота в Telegram.
2. Нажми кнопку меню (слева от поля ввода) или кнопку **Open App**.
3. Откроется твоя Mini App — можно смотреть ленту, создавать видео, профиль.

---

## Оплата звёздами (Telegram Stars)

Когда у пользователя заканчивается бесплатный лимит генераций, он может оплатить звёздами и создать ещё одно видео.

1. После деплоя API вызови **setWebhook**, чтобы Telegram присылал события оплаты на твой сервер:
   ```bash
   curl -X POST "https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://ТВОЙ_API_URL/webhook/telegram"}'
   ```
   Вместо `<ТВОЙ_ТОКЕН>` и `https://ТВОЙ_API_URL` подставь токен бота и URL API (из шага 1).
2. Опционально: задай секрет, чтобы только твой сервер принимал webhook:
   - В Variables API добавь `TELEGRAM_WEBHOOK_SECRET` = случайная строка.
   - В setWebhook добавь в JSON: `"secret_token":"та_же_строка"`.
3. Цена за одну генерацию задаётся в `PAYMENT_STARS_PER_GENERATION` (по умолчанию 5 звёзд).

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

---

## Ошибка "No workspaces found" на Railway

Если у **api** или **web** в логах сборки видно `npm error No workspaces found: --workspace=api` (или `--workspace=web`), значит Railway собирает с корня репо и использует workspace-команду. Нужно собирать из папки сервиса:

1. Открой сервис (**api** или **web**) → **Settings**.
2. Заполни:
   - **Root Directory:** для api — `apps/api`, для web — `apps/web`.
   - **Build Command:** `npm install && npm run build` (без `--workspace=...`).
   - **Start Command:** для api — `node dist/index.js`; для web (статический сайт) — например `npx serve dist` или настрой отдачу папки `dist`.
3. Сохрани и сделай **Redeploy** (Deployments → три точки у последнего деплоя → Redeploy).

---

## Internal Server Error (500) на API

Чаще всего 500 даёт **база данных**: на Railway у сервиса **api** не задан или неверный **DATABASE_URL**.

1. Открой сервис **api** в Railway → **Variables**.
2. Добавь переменную **DATABASE_URL**:
   - **SQLite (данные не сохраняются между деплоями):**  
     `file:/tmp/data.db`
   - **Постоянная база:** подключи **PostgreSQL** в проекте (Add Plugin → PostgreSQL), скопируй **DATABASE_URL** из настроек плагина и вставь в Variables сервиса api.
3. Сохрани и сделай **Redeploy** сервиса api.

Чтобы увидеть точную причину 500: в Railway открой сервис **api** → **Deployments** → последний деплой → **View Logs** (Deploy Logs / Runtime). В логах будет стек ошибки (например `PrismaClientInitializationError` или `Cannot write to file`).

**Ошибка «The table 'main.Video' does not exist»:** таблицы в БД не созданы. Команда старта API теперь выполняет `prisma db push` перед запуском сервера — при следующем деплое таблицы создадутся автоматически. Закоммить изменения, запушить и дождаться Redeploy (или сделать Redeploy вручную).

---

## Ошибка "spawn ffmpeg ENOENT" при генерации видео

Означает, что на сервере (Railway) не установлен FFmpeg. В проекте уже есть файл **`apps/api/nixpacks.toml`** — он подключает FFmpeg к сборке. После пуша и **Redeploy** сервиса api FFmpeg появится в контейнере и генерация видео должна заработать.

Если ошибка остаётся: в Railway у сервиса **api** в **Variables** добавь переменную **RAILPACK_PACKAGES** = `ffmpeg` (если Railway использует Railpack), сохрани и сделай Redeploy.
