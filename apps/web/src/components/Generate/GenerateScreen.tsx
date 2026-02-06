import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import type { MeResponse } from '@/types';

interface GenerateScreenProps {
  onBack: () => void;
  onGenerated?: (jobId: string) => void;
}

export function GenerateScreen({ onBack, onGenerated }: GenerateScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then(setMe)
      .catch((e) => setError(e.message));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || submitting) return;
    if (me && me.dailyGenerationsUsed >= me.dailyLimit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.generate(prompt.trim());
      onGenerated?.(res.jobId);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const limitReached = me && me.dailyGenerationsUsed >= me.dailyLimit;

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
          <p className="generate-limit-warn">Come back tomorrow or upgrade</p>
        )}
        {error && <p className="generate-error">{error}</p>}
        <button
          type="submit"
          className="btn-primary generate-btn"
          disabled={!prompt.trim() || submitting || !!limitReached}
        >
          {submitting ? 'Generating…' : 'Generate video'}
        </button>
      </form>
    </div>
  );
}
