const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function getInitData(): string {
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData: string } } }).Telegram?.WebApp;
  return tg?.initData ?? '';
}

async function request<T>(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getInitData(),
    ...(rest.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
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
