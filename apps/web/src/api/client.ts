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
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData: string } } }).Telegram?.WebApp;
  return tg?.initData ?? '';
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
    const msg = (err as { error?: string }).error ?? res.statusText;
    if (res.status === 401) throw new Error('Ошибка входа. Открой приложение из Telegram.');
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getFeed: (offset = 0, limit = 10) =>
    request<import('../types').FeedResponse>(`/feed?offset=${offset}&limit=${limit}`),

  getMe: () => request<import('../types').MeResponse>('/me'),

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
};
