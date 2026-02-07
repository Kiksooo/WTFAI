import { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import type { MeResponse, JobResponse } from '@/types';

interface GenerateScreenProps {
  onBack: () => void;
  onGenerated?: (jobId: string) => void;
}

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 120;

export function GenerateScreen({ onBack, onGenerated }: GenerateScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobResponse['status'] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api
      .getMe()
      .then(setMe)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let attempts = 0;
    const poll = () => {
      attempts += 1;
      api
        .getJob(jobId)
        .then((job: JobResponse) => {
          setJobStatus(job.status);
          if (job.status === 'done' && job.videoId) {
            if (pollRef.current) clearInterval(pollRef.current);
            onGenerated?.(jobId);
            onBack();
          } else if (job.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setError(job.error ?? 'Генерация не удалась');
            setJobId(null);
            setSubmitting(false);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (attempts >= POLL_MAX_ATTEMPTS && pollRef.current) {
            clearInterval(pollRef.current);
            setError('Время ожидания истекло. Проверь ленту позже.');
            setJobId(null);
            setSubmitting(false);
          }
        });
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, onBack, onGenerated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || submitting) return;
    const limitReached = me && me.dailyGenerationsUsed >= me.dailyLimit;

    if (limitReached) {
      setSubmitting(true);
      setError(null);
      setJobStatus(null);
      try {
        const res = await api.createPaymentInvoice(prompt.trim());
        setJobId(res.jobId);
        const tg = (window as unknown as { Telegram?: { WebApp?: { openInvoice: (url: string) => void } } }).Telegram?.WebApp;
        if (tg?.openInvoice) {
          tg.openInvoice(res.invoiceUrl);
        } else {
          window.open(res.invoiceUrl, '_blank');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setError(null);
    setJobStatus(null);
    try {
      const res = await api.generate(prompt.trim());
      setJobId(res.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSubmitting(false);
    }
  };

  const limitReached = me && me.dailyGenerationsUsed >= me.dailyLimit;
  const starsAmount = me?.starsPerGeneration ?? 5;

  return (
    <div className="generate-screen">
      <header className="screen-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Create video</h1>
      </header>

      <form className="generate-form" onSubmit={handleSubmit}>
        <label className="generate-label" htmlFor="prompt">
          Create a video about…
        </label>
        <input
          id="prompt"
          type="text"
          className="generate-input"
          placeholder="If cats ruled the world…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!!limitReached}
          maxLength={500}
          autoFocus
        />
        {me && (
          <p className="generate-limit">
            {me.dailyGenerationsUsed} / {me.dailyLimit} today
          </p>
        )}
        {limitReached && (
          <p className="generate-limit-warn">
            Лимит на сегодня исчерпан. Оплати {starsAmount} звёзд и создай ещё одно видео.
          </p>
        )}
        {error && <p className="generate-error">{error}</p>}
        {jobId && jobStatus && (
          <p className="generate-status">
            {jobStatus === 'awaiting_payment' && 'Ожидаем оплату…'}
            {jobStatus === 'queued' && 'В очереди…'}
            {jobStatus === 'processing' && 'Генерируем видео…'}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary generate-btn"
          disabled={!prompt.trim() || submitting}
        >
          {limitReached
            ? submitting && !jobId
              ? 'Создаём инвойс…'
              : submitting
                ? 'Генерация…'
                : `Оплатить ${starsAmount} звёзд и создать`
            : submitting && !jobId
              ? 'Отправка…'
              : submitting
                ? 'Генерация…'
                : 'Create video'}
        </button>
      </form>
    </div>
  );
}
