import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import type { VideoItem, MeResponse } from '@/types';

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payPrompt, setPayPrompt] = useState('');
  const [paying, setPaying] = useState(false);
  const [payJobId, setPayJobId] = useState<string | null>(null);
  const [subPaying, setSubPaying] = useState<'basic' | 'vip' | null>(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getMyVideos()])
      .then(([meData, videosRes]) => {
        setMe(meData);
        setItems(videosRes.items);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!payJobId) return;
    const t = setInterval(() => {
      api.getJob(payJobId).then((job) => {
        if (job.status === 'done' || job.status === 'failed') {
          setPayJobId(null);
          setPaying(false);
          if (job.status === 'done') api.getMyVideos().then((r) => setItems(r.items));
        }
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [payJobId]);

  const handleSubscriptionPay = async (plan: 'basic' | 'vip') => {
    setSubPaying(plan);
    setError(null);
    try {
      const res = await api.createSubscriptionInvoice(plan);
      const tg = (window as unknown as { Telegram?: { WebApp?: { openInvoice: (url: string) => void } } }).Telegram?.WebApp;
      if (tg?.openInvoice) tg.openInvoice(res.invoiceUrl);
      else window.open(res.invoiceUrl, '_blank');
      setTimeout(() => {
        api.getMe().then(setMe).catch(() => {});
        setSubPaying(null);
      }, 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setSubPaying(null);
    }
  };

  const handlePayStars = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = payPrompt.trim() || 'Креативное видео';
    setPaying(true);
    setError(null);
    try {
      const res = await api.createPaymentInvoice(prompt);
      setPayJobId(res.jobId);
      const tg = (window as unknown as { Telegram?: { WebApp?: { openInvoice: (url: string) => void } } }).Telegram?.WebApp;
      if (tg?.openInvoice) tg.openInvoice(res.invoiceUrl);
      else window.open(res.invoiceUrl, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setPaying(false);
    }
  };

  const displayName = me ? (me.firstName || me.username || `User ${me.id.slice(-6)}`) : '';

  return (
    <div className="profile-screen">
      <header className="screen-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1 className="screen-title">Профиль</h1>
      </header>

      {loading && <p className="profile-loading">Загрузка…</p>}
      {error && <p className="profile-error">{error}</p>}

      {!loading && me && (
        <>
          <section className="profile-card-block">
            <div className="profile-avatar">👤</div>
            <h2 className="profile-name">{displayName}</h2>
            {me.isPremium && <span className="profile-badge">Premium</span>}
            {(me.subscriptionPlan === 'basic' || me.subscriptionPlan === 'vip') && me.subscriptionExpiresAt && (
              <span className="profile-badge profile-badge-sub">
                {me.subscriptionPlan === 'vip' ? 'VIP' : 'Basic'} до {new Date(me.subscriptionExpiresAt).toLocaleDateString()}
              </span>
            )}
            <p className="profile-stats">
              {me.monthlyLimit != null
                ? `Видео в этом месяце: ${me.monthlyGenerationsUsed ?? 0} / ${me.monthlyLimit}`
                : `Генераций сегодня: ${me.dailyGenerationsUsed} / ${me.dailyLimit}`}
            </p>
          </section>

          {me.subscriptionPlans && (
            <section className="profile-subscription-section">
              <h3 className="profile-section-title">Подписки</h3>
              <div className="profile-sub-cards">
                <div className="profile-sub-card">
                  <h4>Basic — $9.99/мес</h4>
                  <ul>
                    <li>50–100 видео в месяц</li>
                    <li>Без watermark</li>
                    <li>Приоритетная очередь</li>
                    <li>Эксклюзивные шаблоны</li>
                  </ul>
                  <button
                    type="button"
                    className="btn-primary profile-sub-btn"
                    disabled={!!subPaying}
                    onClick={() => handleSubscriptionPay('basic')}
                  >
                    {subPaying === 'basic' ? 'Открываем оплату…' : `Оплатить ${me.subscriptionPlans.basic.priceStars} звёзд`}
                  </button>
                </div>
                <div className="profile-sub-card profile-sub-card-vip">
                  <h4>VIP — $19.99/мес</h4>
                  <ul>
                    <li>300 видео в месяц</li>
                    <li>Максимальное качество</li>
                    <li>Приватные генерации</li>
                    <li>Early access к форматам</li>
                  </ul>
                  <button
                    type="button"
                    className="btn-primary profile-sub-btn"
                    disabled={!!subPaying}
                    onClick={() => handleSubscriptionPay('vip')}
                  >
                    {subPaying === 'vip' ? 'Открываем оплату…' : `Оплатить ${me.subscriptionPlans.vip.priceStars} звёзд`}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="profile-stars-section">
            <h3 className="profile-section-title">Оплата звёздами Telegram</h3>
            <p className="profile-stars-desc">
              Купи дополнительную генерацию за {me.starsPerGeneration ?? 5} звёзд. После оплаты видео создаётся автоматически.
            </p>
            <form className="profile-pay-form" onSubmit={handlePayStars}>
              <input
                type="text"
                className="profile-pay-input"
                placeholder="О чём видео? (или оставь пустым)"
                value={payPrompt}
                onChange={(e) => setPayPrompt(e.target.value)}
                disabled={paying}
                maxLength={200}
              />
              <button
                type="submit"
                className="btn-primary profile-pay-btn"
                disabled={paying}
              >
                {paying ? (payJobId ? 'Ожидаем оплату…' : 'Создаём инвойс…') : `Оплатить ${me.starsPerGeneration ?? 5} звёзд`}
              </button>
            </form>
          </section>

          <section className="profile-videos-section">
            <h3 className="profile-section-title">Мои видео</h3>
            {items.length === 0 && (
              <p className="profile-empty">Пока нет видео. Создай первое в разделе «Создать» или оплати звёздами выше.</p>
            )}
            {items.length > 0 && (
              <div className="profile-grid">
                {items.map((video) => (
                  <a
                    key={video.id}
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-card"
                  >
                    <video
                      src={video.videoUrl}
                      poster={video.previewUrl ?? undefined}
                      muted
                      playsInline
                      preload="metadata"
                      className="profile-card-video"
                    />
                    <div className="profile-card-stats">
                      <span>❤️ {video.likesCount}</span>
                      <span>👁 {video.viewsCount}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
