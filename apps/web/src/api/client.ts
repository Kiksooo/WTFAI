const API_URL_KEY = 'wtfai_api_url';

function getApiBase(): string {
  if (typeof window === 'undefined') return import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api');
  if (fromQuery) {
    try {
      const url = new URL(fromQuery);
      localStorage.setItem(API_URL_KEY, url.origin);
      return url.origin;
    } catch {
      /* ignore */
    }
  }
  const fromStorage = localStorage.getItem(API_URL_KEY);
  if (fromStorage) return fromStorage;
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
}

function getInitData(): string {
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
  const raw = tg?.initData ?? '';
  return typeof raw === 'string' ? raw : '';
}

/** Ждёт появления initData от Telegram (до maxMs), затем резолвит. Если не появился — резолвит пустую строку. */
export function waitForTelegramInitData(maxMs = 2500): Promise<string> {
  return new Promise((resolve) => {
    const data = getInitData();
    if (data.length > 0) {
      resolve(data);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => {
      const now = getInitData();
      if (now.length > 0) {
        clearInterval(t);
        resolve(now);
        return;
      }
      if (Date.now() - start >= maxMs) {
        clearInterval(t);
        resolve('');
      }
    }, 150);
  });
}

/** Сообщение, если нет данных Telegram (приложение открыто не из бота). */
export const NO_TELEGRAM_MSG =
  'Открой приложение через кнопку меню бота в Telegram (не по прямой ссылке в браузере).';

/** Реферальный код из start_param (ссылка друга). Передаётся в /me для начисления кредитов пригласившему. */
function getStartParam(): string | null {
  const tg = (window as unknown as {
    Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } };
  }).Telegram?.WebApp;
  const param = tg?.initDataUnsafe?.start_param;
  return param && param.trim() ? param.trim() : null;
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const apiBase = getApiBase();
  const { body, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getInitData(),
    ...(rest.headers as Record<string, string>),
  };
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'Load failed' || msg === 'Failed to fetch' || msg.includes('NetworkError')) {
      throw new Error(
        'Сервер недоступен. Проверь, что в настройках web-сервиса (Railway) задана переменная VITE_API_URL и сделан Redeploy.'
      );
    }
    throw e;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const body = err as { error?: string; code?: string };
    if (res.status === 401) {
      const code = body.code;
      const msg =
        code === 'missing_init_data'
          ? 'Открой приложение через кнопку меню бота в Telegram (не по прямой ссылке в браузере).'
          : code === 'invalid_init_data' || code === 'invalid_user' || code === 'no_user'
            ? 'Сессия не распознана. Закрой Mini App и снова открой его из меню бота в Telegram.'
            : 'Ошибка входа. Открой приложение из Telegram.';
      throw new Error(msg);
    }
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getFeed: (offset = 0, limit = 10) =>
    request<import('../types').FeedResponse>(`/feed?offset=${offset}&limit=${limit}`),

  getMe: async () => {
    const data = await waitForTelegramInitData(2500);
    if (!data.length) return Promise.reject(new Error(NO_TELEGRAM_MSG));
    const ref = getStartParam();
    const path = ref ? `/me?ref=${encodeURIComponent(ref)}` : '/me';
    return request<import('../types').MeResponse>(path);
  },

  generate: (prompt: string) =>
    request<import('../types').GenerateResponse>('/generate', {
      method: 'POST',
      body: { prompt },
    }),

  createPaymentInvoice: (prompt: string) =>
    request<import('../types').PaymentInvoiceResponse>('/payment/create-invoice', {
      method: 'POST',
      body: { prompt },
    }),

  createSubscriptionInvoice: (plan: 'basic' | 'vip') =>
    request<import('../types').SubscriptionInvoiceResponse>('/payment/create-subscription-invoice', {
      method: 'POST',
      body: { plan },
    }),

  getJob: (jobId: string) =>
    request<import('../types').JobResponse>(`/job/${jobId}`),

  getMyVideos: () =>
    request<{ items: import('../types').VideoItem[] }>('/my-videos'),

  like: (videoId: string) =>
    request<import('../types').LikeResponse>('/like', {
      method: 'POST',
      body: { videoId },
    }),

  getTipOptions: () =>
    request<{ amountStars: number[] }>('/tip/options'),

  createTipInvoice: (videoId: string, amountStars: number) =>
    request<import('../types').TipInvoiceResponse>('/tip', {
      method: 'POST',
      body: { videoId, amountStars },
    }),

  sendFeedback: (message: string) =>
    request<{ ok: boolean }>('/feedback', {
      method: 'POST',
      body: { message },
    }),
};
