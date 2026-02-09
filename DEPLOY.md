# Как задеплоить и открыть Mini App в Telegram

Сделай по шагам: сначала API, потом фронт, потом BotFather.

---

## Шаг 1. Деплой API (Railway или Render)

### Вариант A: Railway

1. Зайди на [railway.app](https://railway.app), войди через GitHub.
2. **New Project** → **Deploy from GitHub repo** → выбери репозиторий WTFAI.
3. В проекте нажми **Add Service** → **GitHub Repo** → тот же репозиторий.
4. У созданного сервиса **api** открой **Settings** и задай:
   - **Root Directory:** **оставь пустым** (очисти поле, если там было `apps/api`). Сборка пойдёт из **корня** репо: Railway подхватит корневой **`railway.toml`** и **`Dockerfile`** — образ соберётся с FFmpeg, Builder будет Dockerfile. Если оставить Root Directory = `apps/api`, Railway может показывать «The value is set in apps/api/railway.toml» и не давать сменить Builder — тогда единственный надёжный вариант: собрать из корня (пустой Root Directory).
   - **Start Command** задан в корневом `railway.toml` (`node dist/index.js`); при сборке из корня менять ничего не нужно.
5. **Variables** — добавь переменные из своего `apps/api/.env`:
   - `DATABASE_URL` = `file:./data/dev.db` (для Railway лучше потом перейти на PostgreSQL)
   - `TELEGRAM_BOT_TOKEN` = твой токен от BotFather
   - `OPENAI_API_KEY` = (по желанию; если нет — можно использовать бесплатные ключи ниже)
   - `GROQ_API_KEY` = (опционально, бесплатный тир: [console.groq.com](https://console.groq.com) — для сценариев)
   - `REPLICATE_API_TOKEN` = (опционально, бесплатный старт: [replicate.com](https://replicate.com) — для картинок)
   - `BASE_URL` = **сюда потом подставишь URL этого сервиса** (например `https://wtfai-api-production.up.railway.app`)
   - `PAYMENT_STARS_PER_GENERATION` = (опционально, по умолчанию 5 — сколько звёзд за одну генерацию)
   - `TELEGRAM_WEBHOOK_SECRET` = (опционально, секрет для проверки webhook; задай при настройке setWebhook)
6. Сохрани и дождись деплоя. Открой **Deployments** → последний деплой → **View Logs** (Runtime): при старте должна появиться строка **`FFmpeg: OK`**. Если видишь **`FFmpeg: not found`** — образ собран без FFmpeg (вероятно, использовался Nixpacks); переключи Builder на Dockerfile и сделай **Redeploy**.
7. Скопируй **публичный URL** сервиса — он будет вида **`https://имя-сервиса.up.railway.app`**. Это твой **API URL**.
8. **Оплата звёздами:** чтобы пользователи могли платить за генерации, настрой webhook для бота (см. раздел «Оплата звёздами» ниже).

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

**Важно:** на Vercel деплоится только **фронт** (`apps/web`). API (`apps/api`) деплоится на Railway или Render (шаг 1). Если в настройках указать не ту папку, Vercel начнёт собирать API — сборка упадёт с ошибками TypeScript (например в `script-generator.ts`), т.к. API на Vercel не предназначен.

1. Зайди на [vercel.com](https://vercel.com), войди через GitHub.
2. **Add New** → **Project** → импортируй репозиторий WTFAI.
3. Настройки проекта:
   - **Root Directory:** нажми **Edit** и выбери папку **`apps/web`** (именно фронт; не корень и не `apps/api`).
   - **Framework Preset:** Vite (подставится сам).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** — добавь:
   - Имя: `VITE_API_URL`  
   - Значение: **API URL из шага 1** (например `https://wtfai-api-production.up.railway.app`)
   - Имя: `VITE_BOT_USERNAME`  
   - Значение: **имя твоего бота без @** (например `MyWtfAiBot`) — чтобы в профиле показывалась полная реферальная ссылка «+5 кредитов за друга».
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
4. Нажми «Войти». В админке: **Сводка** (пользователи, видео, джобы, платежи, донаты, звёзды), вкладки **Пользователи**, **Видео**, **Джобы**, **Платежи**, **Донаты**.

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

## Как вывести звёзды на свой счёт

Звёзды, которые пользователи оплатили в боте (генерации, подписки, донаты), накапливаются на балансе бота. Вывести их можно через официальный сервис **Fragment**.

**Готовая ссылка:**  
**https://fragment.com/stars**

**Что сделать:**

1. Открой **https://fragment.com/stars** и войди через свой аккаунт Telegram (тот, с которого создан бот).
2. На странице отобразятся баланс звёзд и возможность вывода. Звёзды конвертируются в криптовалюту **TON**.
3. Для вывода нужны:
   - **Минимум 1000 звёзд** на балансе (если меньше — накапливай);
   - **Двухфакторная аутентификация (2FA)** включена в настройках Telegram;
   - **TON-кошелёк** (например TonKeeper, TON Space в Telegram) — на него придёт TON после конвертации.
4. Деньги в рубли или другую валюту: выведи TON на биржу или обменник и обменяй на фиат.

**Альтернатива:** в приложении Telegram открой своего бота → меню бота (три полоски) → **Monetization** / **Монетизация** (если доступно) — там тоже можно перейти к выводу и статистике по звёздам.

---

## Ошибка «The bot didn't respond in time» при оплате звёздами

Означает: Telegram отправил запрос на твой API (pre_checkout или другое обновление), но ответ не пришёл вовремя или webhook не настроен.

**Что сделать:**

1. **Настроить webhook** — один раз вызвать setWebhook с **точным URL твоего API** (Railway):
   ```bash
   curl -X POST "https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://api-production-1345.up.railway.app/webhook/telegram"}'
   ```
   Подставь вместо `<ТВОЙ_ТОКЕН>` токен бота из BotFather. Если твой API на другом домене — подставь его вместо `https://api-production-1345.up.railway.app` (обязательно путь `/webhook/telegram`).

2. **Если задан TELEGRAM_WEBHOOK_SECRET** в Railway, в тот же запрос добавь секрет:
   ```bash
   -d '{"url":"https://ТВОЙ_API_URL/webhook/telegram","secret_token":"значение_TELEGRAM_WEBHOOK_SECRET"}'
   ```

3. Проверить, что webhook установлен:
   ```bash
   curl "https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/getWebhookInfo"
   ```
   В ответе должно быть `"url":"https://...up.railway.app/webhook/telegram"`.

4. После смены URL API (например новый деплой на Railway) вызови setWebhook **заново** с новым URL.

После этого снова попробуй оплатить генерацию звёздами в Mini App.

---

## Оплата прошла, но видео не сгенерировалось

Генерация выполняется **в том же процессе API** (очередь в памяти). Если после оплаты джоб так и остаётся в статусе «queued» или «processing», либо переходит в «failed», причину нужно смотреть в логах и в админке.

**Что сделать:**

1. **Проверить статус джоба в админке**
   - Открой **https://твой-фронт.vercel.app/admin** → вкладка **Джобы**.
   - Найди джоб по времени оплаты. В колонке **Статус** будет `queued`, `processing`, `done` или `failed`. Если **failed** — в колонке **Ошибка** (или в деталях) будет текст ошибки (например `spawn ffmpeg ENOENT`, `Invalid API key`, и т.п.).

2. **Посмотреть логи API на Railway**
   - Railway → проект → сервис **api** → **Deployments** → последний деплой → **View Logs** (Runtime Logs).
   - В логах при падении генерации будет строка вида **`Video job failed: <jobId> <текст ошибки>`**. По этому тексту можно понять причину.

3. **Типичные причины и что проверить**
   - **FFmpeg не найден** (`spawn ffmpeg ENOENT`): в репозитории должен быть **`apps/api/nixpacks.toml`** с `nixPkgs = ["...", "ffmpeg"]`. Закоммить, запушить, сделать **Redeploy** сервиса api на Railway. Если Railway использует не Nixpacks — в Variables добавить пакет ffmpeg по инструкции хостинга.
   - **Нет или неверные ключи AI**: в Railway у сервиса api в **Variables** должны быть заданы хотя бы один из: **OPENAI_API_KEY** (или **GROQ_API_KEY** для сценариев), **OPENAI_API_KEY** или **REPLICATE_API_TOKEN** для картинок. Без них генерация сценария или картинки падает.
   - **Ошибка записи/диска**: на Railway файловая система временная; большие файлы или нехватка места могут вызвать ошибку. Для продакшена лучше настроить **Volume** (см. раздел «База данных») и при необходимости вынести туда и папку для статики/видео, если она задаётся в API.

4. **Повторная попытка**
   - Исправив причину (FFmpeg, ключи, диск), сделай **Redeploy** сервиса api. Новые оплаты будут обрабатываться уже с исправленной конфигурацией. Старые джобы в статусе `failed` повторно не перезапускаются — пользователь может создать новую генерацию (и при необходимости снова оплатить).

5. **Возврат звёзд при падении**
   - Если джоб падает (ошибка генерации, FFmpeg, content filter и т.д.), звёзды за эту генерацию **возвращаются автоматически** через Telegram API (`refundStarPayment`). Пользователю не нужно ничего делать — звёзды снова появятся на балансе.
   - Для джобов, которые упали **до** деплоя автовозврата, можно вручную вернуть звёзды в админке: вкладка «Джобы» → у failed-джоба кнопка «Вернуть звёзды» (вызов `POST /admin/jobs/:jobId/refund`).

---

## База данных (сохранность)

По умолчанию используется **SQLite** (`DATABASE_URL=file:./data/dev.db`). При старте API выполняется `prisma db push` — таблицы создаются или обновляются автоматически.

**Важно:** на Railway и Render файловая система **временная**: при каждом редеплое данные SQLite теряются. Чтобы данные сохранялись:

- **Railway:** в сервисе API добавь **Volume** (Settings → Volumes → Add Volume, смонтируй в `/data`). В переменных задай `DATABASE_URL=file:/data/prod.db`. Тогда база будет храниться на томе и переживёт редеплой.
- **Render:** у Web Service нет постоянного диска для SQLite — при редеплое БД обнулится. Для продакшена лучше подключить **PostgreSQL** (Render → Dashboard → New → PostgreSQL), скопировать Internal Database URL и в проекте API сменить в `prisma/schema.prisma` провайдер на `postgresql` и задать `DATABASE_URL` из Render.

После смены `DATABASE_URL` (или провайдера) выполни один раз локально: `cd apps/api && npx prisma db push` (или `prisma migrate deploy` для PostgreSQL) и задеплой API заново.

---

## Важно

- В **API** в переменной `BASE_URL` должен быть именно URL твоего API (из Railway/Render), чтобы ссылки на видео и статику были правильные.
- В **фронте** переменная `VITE_API_URL` должна совпадать с этим же API URL (она подставляется при сборке).
- В **фронте** опционально задай `VITE_BOT_USERNAME` (имя бота без @) — тогда в профиле будет полная реферальная ссылка.
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

## Ошибка DEPLOYMENT_NOT_FOUND (Vercel)

Ошибка **404 DEPLOYMENT_NOT_FOUND** у Vercel значит: запрос идёт по URL (или по ID деплоя), которого уже не существует — деплой удалён или URL неверный.

**Что сделать:**

1. **Проверь актуальный URL проекта в Vercel**
   - Зайди в [vercel.com](https://vercel.com) → свой проект (фронт из `apps/web`).
   - В **Settings → Domains** или на главной проекта посмотри **Production URL** (например `https://wtfai-xxx.vercel.app` или кастомный домен).
   - Убедись, что по этому URL открывается приложение (не 404).

2. **Обнови URL Mini App в BotFather**
   - Если в Telegram открываешь приложение по кнопке меню и видишь DEPLOYMENT_NOT_FOUND, значит в BotFather указан **старый или превью-URL**.
   - @BotFather → **Bot Settings** → **Menu Button** → **Configure menu button** → в поле **URL** вставь **текущий Production URL** из Vercel (шаг 1).
   - Не используй URL вида `*-git-*-xxx.vercel.app` (превью деплои могут удаляться).

3. **Не удаляй деплои, на которые ещё есть ссылки**
   - Если где-то (бот, закладки, реферальные ссылки) прописан конкретный URL деплоя, после удаления этого деплоя в Vercel запросы дадут DEPLOYMENT_NOT_FOUND.
   - Для Mini App в BotFather всегда указывай **стабильный Production URL** проекта, а не URL одного конкретного деплоя.

4. **Если проект пересоздавали**
   - После удаления и повторного импорта проекта в Vercel все старые URL перестают работать. Обнови URL в BotFather и везде, где ты его использовал.

5. **Проверь Root Directory (монорепо)**
   - Vercel → проект фронта → **Settings** → **Build and Deployment** → **Root Directory**.
   - Должно быть указано **`apps/web`**, а не корень репозитория. Если указан корень, Vercel может не собрать приложение (Vite) и отдавать не тот контент или 404.
   - Нажми **Save**; изменения применятся при следующем деплое. После смены сделай **Redeploy**.

6. **«Skipping unaffected projects» (пропуск деплоя)**
   - В монорепо Vercel может не создавать деплой, если по его мнению изменились только файлы вне `apps/web`. Тогда старые ссылки ведут на уже несуществующий деплой → DEPLOYMENT_NOT_FOUND.
   - **Settings** → **Build and Deployment** → отключи **Skip deployment** для unaffected projects, сделай пуш и новый деплой. Если после этого всё заработало, можно снова включить опцию или оставить выключенной.

После смены URL в BotFather открой бота снова и нажми кнопку меню — должно открываться актуальное приложение.

---

## Видео так и не генерируются — пошаговый чеклист

Если оплата прошла, но видео не появляется, пройди по шагам ниже.

**1. Узнай причину по логам и админке**

- **Админка:** https://твой-фронт.vercel.app/admin → вкладка **Джобы**. Найди джоб по времени оплаты. Колонка **Статус**: `failed` — смотри колонку **Ошибка**; `queued` или `processing` — джоб ещё не обработан или процесс упал до обновления статуса.
- **Railway:** сервис **api** → **Deployments** → последний деплой → **View Logs** (Runtime). Ищи строки:
  - **`FFmpeg: OK`** при старте — FFmpeg найден; **`FFmpeg: not found`** — нет в PATH, генерация будет падать.
  - **`Video job starting: <id>`** — джоб начал обрабатываться.
  - **`Video job failed: <id> <текст>`** — причина падения (скопируй текст).

**2. Типичные причины и что сделать**

| Что видишь | Что сделать |
|------------|-------------|
| **Ошибка `spawn ffmpeg ENOENT`** или в логах **FFmpeg: not found** | В репо в `apps/api` есть **Dockerfile** с установкой FFmpeg. В Railway у сервиса api: **Settings** → **Build** → **Builder** выбери **Dockerfile** (не Nixpacks). Сохрани и сделай **Redeploy**. |
| **Ошибка про API key / 401 / invalid / quota** | В Railway у сервиса api в **Variables** задай хотя бы один вариант: **OPENAI_API_KEY** (сценарии + картинки + TTS) или **GROQ_API_KEY** (сценарии) + **REPLICATE_API_TOKEN** (картинки). Без ни одного рабочего ключа генерация сценария или картинки может упасть. Проверь, что ключи без опечаток и не истекли. |
| **Джоб в статусе `queued` или `processing` и не меняется** | Сервер мог перезапуститься во время обработки. В логах посмотри, есть ли **Video job starting** для этого id. Если после старта приложения новых записей «Video job starting» нет — возможно, webhook не вызвал очередь или запрос пришёл на другой инстанс. Создай **новую** генерацию (и при необходимости оплати снова); старые «зависшие» джобы можно не трогать. |
| **Ошибка записи файла / EACCES / ENOSPC** | На Railway диск временный. Убедись, что **STORAGE_PATH** (если задан) доступен для записи. Для продакшена можно подключить **Volume** и указать путь в нём. |

**3. После любых изменений**

- Сохрани переменные в Railway и сделай **Redeploy** сервиса api.
- Проверь генерацию заново (новая оплата или бесплатный лимит).

---

## Ошибка "spawn ffmpeg ENOENT" при генерации видео

Означает, что в образе API нет FFmpeg. В репозитории сборка должна идти через **Dockerfile** (`apps/api/Dockerfile`), в котором установлен FFmpeg. Если в **Build Logs** на Railway видишь **Nixpacks** (`nix-env`, `nix-collect-garbage`) вместо шагов Docker (`FROM node`, `RUN apt-get install ffmpeg`) — Railway собирает не из Dockerfile, и FFmpeg в образ не попадает.

**Что сделать:** У сервиса **api** в Railway: **Settings** → **Root Directory** = **`apps/api`**. Убедись, что в настройках сборки выбран **Dockerfile** (Builder: Dockerfile), а не Nixpacks. Сохрани и сделай **Redeploy**. В следующих Build Logs должны быть строки `RUN apt-get install ... ffmpeg` и т.п. После успешного деплоя в Runtime логах при старте появится **FFmpeg: OK**.

Раньше использовался **nixpacks.toml**; если по какой-то причине сборка идёт через Nixpacks, там должен быть `nixPkgs = ["...", "ffmpeg"]`. В Railway у сервиса api в **Variables** можно добавить **RAILPACK_PACKAGES** = `ffmpeg`, сохранить и сделать Redeploy.

---

## Всё ещё «spawn ffmpeg ENOENT» или Builder нельзя сменить с Nixpacks

Если в Railway пишет «The value is set in apps/api/railway.toml» и не даёт выбрать Dockerfile:

1. **Собери API из корня репо:** Railway → сервис **api** → **Settings** → **Root Directory** — **очисти поле** (оставь пустым). Сохрани и сделай **Redeploy**.
2. При пустом Root Directory Railway возьмёт конфиг из **корня**: **`railway.toml`** (builder = dockerfile) и **`Dockerfile`** — в образ попадёт FFmpeg.
3. В **Build Logs** после деплоя должны быть шаги с `apt-get install ffmpeg`. В **Deploy Logs** при старте — строка **FFmpeg: OK**.
