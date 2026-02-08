import { useState } from 'react';
import type { VideoItem } from '@/types';

const DEFAULT_TIP_AMOUNTS = [5, 10, 25];

interface FeedActionsProps {
  video: VideoItem;
  liked: boolean;
  onLike: () => void;
  onShare: () => void;
  onGenerate: () => void;
  onTip: (video: VideoItem, amountStars: number) => void;
}

export function FeedActions({
  video,
  liked,
  onLike,
  onShare,
  onGenerate,
  onTip,
}: FeedActionsProps) {
  const [tipOpen, setTipOpen] = useState(false);

  return (
    <div className="feed-actions">
      <button
        type="button"
        className="feed-action-btn"
        onClick={onLike}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <span className="feed-action-icon">{liked ? '❤️' : '🤍'}</span>
        <span className="feed-action-count">{video.likesCount}</span>
      </button>
      <button
        type="button"
        className="feed-action-btn"
        onClick={() => setTipOpen((o) => !o)}
        aria-label="Donate stars"
        title="Подарить звёзды автору"
      >
        <span className="feed-action-icon">⭐</span>
      </button>
      {tipOpen && (
        <div className="feed-tip-popover">
          <span className="feed-tip-label">Подарить звёзды</span>
          <div className="feed-tip-amounts">
            {DEFAULT_TIP_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="feed-tip-amount-btn"
                onClick={() => {
                  onTip(video, amount);
                  setTipOpen(false);
                }}
              >
                {amount} ⭐
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className="feed-action-btn"
        onClick={onShare}
        aria-label="Share"
      >
        <span className="feed-action-icon">📤</span>
      </button>
      <button
        type="button"
        className="feed-action-btn"
        onClick={onGenerate}
        aria-label="Generate my own"
      >
        <span className="feed-action-icon">✨</span>
      </button>
    </div>
  );
}
