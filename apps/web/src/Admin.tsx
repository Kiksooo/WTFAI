import { useState, useEffect, useCallback } from 'react';
import './Admin.css';

const ADMIN_KEY_STORAGE = 'wtfai_admin_key';
const ADMIN_API_STORAGE = 'wtfai_admin_api';

interface Stats {
  usersCount: number;
  videosCount: number;
  jobsCount: number;
  paymentsCount: number;
  tipsCount: number;
  totalStars: number;
  totalStarsPayments?: number;
  totalStarsTips?: number;
  jobsByStatus: Record<string, number>;
  recentVideos: Array<{
    id: string;
    prompt: string;
    videoUrl: string;
    likesCount: number;
    createdAt: string;
    createdBy: { id: string; username: string | null; firstName: string | null } | null;
  }>;
  recentPayments: Array<{
    id: string;
    userId: string;
    jobId: string;
    amountStars: number;
    createdAt: string;
  }>;
  recentTips?: Array<{
    id: string;
    videoId: string;
    fromUserId: string;
    fromUser: { id: string; username: string | null; firstName: string | null } | null;
    toUserId: string;
    toUser: { id: string; username: string | null; firstName: string | null } | null;
    amountStars: number;
    createdAt: string;
  }>;
}

function useAdminApi(apiBase: string, adminKey: string) {
  const get = useCallback(
    async (path: string): Promise<unknown> => {
      const res = await fetch(`${apiBase}${path}`, {
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      return res.json();
    },
    [apiBase, adminKey]
  );
  const post = useCallback(
    async (path: string): Promise<unknown> => {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      return res.json();
    },
    [apiBase, adminKey]
  );
  const del = useCallback(
    async (path: string): Promise<unknown> => {
      const res = await fetch(`${apiBase}${path}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      return res.json();
    },
    [apiBase, adminKey]
  );
  return { request: get, requestPost: post, requestDelete: del };
}

export default function Admin() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem(ADMIN_API_STORAGE) ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000');
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? '');
  const [keyInput, setKeyInput] = useState('');
  const [apiInput, setApiInput] = useState(apiBase);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<{ items: unknown[]; total: number } | null>(null);
  const [videos, setVideos] = useState<{ items: unknown[]; total: number } | null>(null);
  const [jobs, setJobs] = useState<{ items: unknown[]; total: number } | null>(null);
  const [payments, setPayments] = useState<{ items: unknown[]; total: number } | null>(null);
  const [tips, setTips] = useState<{ items: unknown[]; total: number } | null>(null);
  const [feedback, setFeedback] = useState<{ items: unknown[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundingJobId, setRefundingJobId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [tab, setTab] = useState<'stats' | 'users' | 'videos' | 'jobs' | 'payments' | 'tips' | 'feedback'>('stats');

  const { request, requestPost, requestDelete } = useAdminApi(apiBase, adminKey);

  const loadStats = useCallback(() => {
    if (!adminKey) return;
    request('/admin/stats')
      .then((d) => setStats(d as Stats))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  const loadUsers = useCallback(() => {
    if (!adminKey) return;
    request('/admin/users?limit=50')
      .then((d) => setUsers(d as { items: unknown[]; total: number }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  const loadVideos = useCallback(() => {
    if (!adminKey) return;
    request('/admin/videos?limit=50')
      .then((d) => setVideos(d as { items: unknown[]; total: number }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  const loadJobs = useCallback(() => {
    if (!adminKey) return;
    request('/admin/jobs?limit=50')
      .then((d) => setJobs(d as { items: unknown[]; total: number }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  const loadPayments = useCallback(() => {
    if (!adminKey) return;
    request('/admin/payments?limit=50')
      .then((d) => setPayments(d as { items: unknown[]; total: number }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  const loadTips = useCallback(() => {
    if (!adminKey) return;
    request('/admin/tips?limit=50')
      .then((d) => setTips(d as { items: unknown[]; total: number }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  const loadFeedback = useCallback(() => {
    if (!adminKey) return;
    request('/admin/feedback?limit=50')
      .then((d) => setFeedback(d as { items: unknown[]; total: number }))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [adminKey, request]);

  useEffect(() => {
    if (!adminKey) return;
    setError(null);
    loadStats();
  }, [adminKey, loadStats]);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'videos') loadVideos();
    if (tab === 'jobs') loadJobs();
    if (tab === 'payments') loadPayments();
    if (tab === 'tips') loadTips();
    if (tab === 'feedback') loadFeedback();
  }, [tab, loadUsers, loadVideos, loadJobs, loadPayments, loadTips, loadFeedback]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    const api = apiInput.trim().replace(/\/$/, '');
    if (!key) {
      setError('Введите ключ админки');
      return;
    }
    sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
    localStorage.setItem(ADMIN_API_STORAGE, api);
    setAdminKey(key);
    setApiBase(api);
    setError(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey('');
    setKeyInput('');
    setStats(null);
    setUsers(null);
    setVideos(null);
    setJobs(null);
    setPayments(null);
    setTips(null);
  };

  if (!adminKey) {
    return (
      <div className="admin">
        <div className="admin-login">
          <h1>WTFAI — Админка</h1>
          <form onSubmit={handleLogin}>
            <label>
              URL API
              <input
                type="url"
                value={apiInput}
                onChange={(e) => setApiInput(e.target.value)}
                placeholder="https://твой-сервис.up.railway.app"
              />
            </label>
            <label>
              Ключ админки (X-Admin-Key)
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="ADMIN_SECRET из .env"
              />
            </label>
            {error && <p className="admin-error">{error}</p>}
            <button type="submit" className="admin-btn">Войти</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <h1>WTFAI — Админка</h1>
        <button type="button" className="admin-logout" onClick={handleLogout}>Выйти</button>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <nav className="admin-tabs">
        {(['stats', 'users', 'videos', 'jobs', 'payments', 'tips', 'feedback'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t === 'stats' && 'Сводка'}
            {t === 'users' && 'Пользователи'}
            {t === 'videos' && 'Видео'}
            {t === 'jobs' && 'Джобы'}
            {t === 'payments' && 'Платежи'}
            {t === 'tips' && 'Донаты'}
            {t === 'feedback' && 'Обратная связь'}
          </button>
        ))}
      </nav>

      {tab === 'stats' && stats && (
        <section className="admin-section">
          <h2>Сводка по проекту</h2>
          <div className="admin-cards">
            <div className="admin-card">
              <span className="admin-card-value">{stats.usersCount}</span>
              <span className="admin-card-label">Пользователей</span>
            </div>
            <div className="admin-card">
              <span className="admin-card-value">{stats.videosCount}</span>
              <span className="admin-card-label">Видео</span>
            </div>
            <div className="admin-card">
              <span className="admin-card-value">{stats.jobsCount}</span>
              <span className="admin-card-label">Джобов</span>
            </div>
            <div className="admin-card">
              <span className="admin-card-value">{stats.paymentsCount}</span>
              <span className="admin-card-label">Платежей</span>
            </div>
            <div className="admin-card">
              <span className="admin-card-value">⭐ {stats.totalStars}</span>
              <span className="admin-card-label">Звёзд всего</span>
            </div>
            <div className="admin-card">
              <span className="admin-card-value">{stats.tipsCount ?? 0}</span>
              <span className="admin-card-label">Донатов</span>
            </div>
          </div>
          {(stats.totalStarsPayments != null || stats.totalStarsTips != null) && (
            <p className="admin-stats-breakdown">
              Платежи за генерации: ⭐ {stats.totalStarsPayments ?? 0} · Донаты авторам: ⭐ {stats.totalStarsTips ?? 0}
            </p>
          )}
          <h3>Джобы по статусу</h3>
          <pre className="admin-pre">{JSON.stringify(stats.jobsByStatus, null, 2)}</pre>
          <h3>Последние видео</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Prompt</th>
                  <th>Лайки</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentVideos.map((v) => (
                  <tr key={v.id}>
                    <td><code>{v.id.slice(0, 8)}</code></td>
                    <td>{v.prompt.slice(0, 40)}…</td>
                    <td>{v.likesCount}</td>
                    <td>{new Date(v.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Последние платежи</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Job ID</th>
                  <th>Звёзды</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.userId}</code></td>
                    <td><code>{p.jobId.slice(0, 8)}</code></td>
                    <td>⭐ {p.amountStars}</td>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="admin-section">
          <h2>Пользователи</h2>
          {users && (
            <>
              <p>Всего: {users.total}</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Имя</th>
                      <th>Premium</th>
                      <th>Генераций сегодня</th>
                      <th>Видео</th>
                      <th>Создан</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users.items as Array<{ id: string; username: string | null; firstName: string | null; isPremium: boolean; dailyGenerationsUsed: number; videosCount: number; createdAt: string }>).map((u) => (
                      <tr key={u.id}>
                        <td><code>{u.id}</code></td>
                        <td>{u.username ?? '—'}</td>
                        <td>{u.firstName ?? '—'}</td>
                        <td>{u.isPremium ? '✓' : '—'}</td>
                        <td>{u.dailyGenerationsUsed}</td>
                        <td>{u.videosCount}</td>
                        <td>{new Date(u.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'videos' && (
        <section className="admin-section">
          <h2>Видео</h2>
          {videos && (
            <>
              <p>Всего: {videos.total}</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Prompt</th>
                      <th>Лайки</th>
                      <th>Просмотры</th>
                      <th>Создан</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(videos.items as Array<{ id: string; prompt: string; likesCount: number; viewsCount: number; createdAt: string }>).map((v) => (
                      <tr key={v.id}>
                        <td><code>{v.id.slice(0, 8)}</code></td>
                        <td>{v.prompt.slice(0, 50)}…</td>
                        <td>{v.likesCount}</td>
                        <td>{v.viewsCount}</td>
                        <td>{new Date(v.createdAt).toLocaleString()}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-small admin-btn-danger"
                            onClick={() => {
                              if (!window.confirm('Удалить это видео без возможности восстановления?')) return;
                              requestDelete(`/admin/videos/${v.id}`)
                                .then(() => loadVideos())
                                .catch((e) => setError(e instanceof Error ? e.message : String(e)));
                            }}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'jobs' && (
        <section className="admin-section">
          <h2>Джобы генерации</h2>
          {refundError && <p className="admin-error">Возврат: {refundError}</p>}
          {jobs && (
            <>
              <p>Всего: {jobs.total}</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User ID</th>
                      <th>Prompt</th>
                      <th>Статус</th>
                      <th>Ошибка</th>
                      <th>Video ID</th>
                      <th>Создан</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jobs.items as Array<{ id: string; userId: string; prompt: string; status: string; videoId: string | null; error: string | null; createdAt: string }>).map((j) => (
                      <tr key={j.id}>
                        <td><code>{j.id.slice(0, 8)}</code></td>
                        <td><code>{j.userId}</code></td>
                        <td>{j.prompt.slice(0, 30)}…</td>
                        <td>
                          <span className={`admin-status admin-status-${j.status}`}>{j.status}</span>
                          {j.status === 'failed' && j.error && (
                            <div className="admin-job-error-inline" title={j.error}>
                              {j.error}
                            </div>
                          )}
                        </td>
                        <td className={j.error ? 'admin-job-error-cell' : ''} title={j.error ?? ''}>
                          {j.error ? <code className="admin-job-error">{j.error.length > 80 ? j.error.slice(0, 80) + '…' : j.error}</code> : '—'}
                        </td>
                        <td>{j.videoId ? <code>{j.videoId.slice(0, 8)}</code> : '—'}</td>
                        <td>{new Date(j.createdAt).toLocaleString()}</td>
                        <td>
                          {j.status === 'failed' && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-small"
                              disabled={refundingJobId !== null}
                              onClick={() => {
                                setRefundError(null);
                                setRefundingJobId(j.id);
                                requestPost(`/admin/jobs/${j.id}/refund`)
                                  .then(() => {
                                    loadJobs();
                                    setRefundingJobId(null);
                                  })
                                  .catch((e) => {
                                    setRefundError(e instanceof Error ? e.message : String(e));
                                    setRefundingJobId(null);
                                  });
                              }}
                            >
                              {refundingJobId === j.id ? '…' : 'Вернуть звёзды'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'tips' && (
        <section className="admin-section">
          <h2>Донаты (звёзды авторам)</h2>
          {tips && (
            <>
              <p>Всего: {tips.total}</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>От</th>
                      <th>Кому</th>
                      <th>Video ID</th>
                      <th>⭐</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tips.items as Array<{ id: string; fromUser: { firstName: string | null; username: string | null } | null; toUser: { firstName: string | null; username: string | null } | null; fromUserId: string; toUserId: string; videoId: string; amountStars: number; createdAt: string }>).map((t) => (
                      <tr key={t.id}>
                        <td>{t.fromUser?.firstName ?? t.fromUser?.username ?? t.fromUserId}</td>
                        <td>{t.toUser?.firstName ?? t.toUser?.username ?? t.toUserId}</td>
                        <td><code>{t.videoId.slice(0, 8)}</code></td>
                        <td>⭐ {t.amountStars}</td>
                        <td>{new Date(t.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'payments' && (
        <section className="admin-section">
          <h2>Платежи (звёзды за генерации)</h2>
          {payments && (
            <>
              <p>Всего: {payments.total}</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User ID</th>
                      <th>Job ID</th>
                      <th>Звёзды</th>
                      <th>Charge ID</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payments.items as Array<{ id: string; userId: string; jobId: string; amountStars: number; telegramPaymentChargeId: string; createdAt: string }>).map((p) => (
                      <tr key={p.id}>
                        <td><code>{p.id.slice(0, 8)}</code></td>
                        <td><code>{p.userId}</code></td>
                        <td><code>{p.jobId.slice(0, 8)}</code></td>
                        <td>⭐ {p.amountStars}</td>
                        <td><code className="admin-code-small">{p.telegramPaymentChargeId.slice(0, 16)}…</code></td>
                        <td>{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'feedback' && (
        <section className="admin-section">
          <h2>Обратная связь</h2>
          {feedback && (
            <>
              <p>Всего: {feedback.total}</p>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Сообщение</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(feedback.items as Array<{ id: string; userId: string; message: string; createdAt: string }>).map((f) => (
                      <tr key={f.id}>
                        <td><code>{f.userId}</code></td>
                        <td className="admin-feedback-msg">{f.message}</td>
                        <td>{new Date(f.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
