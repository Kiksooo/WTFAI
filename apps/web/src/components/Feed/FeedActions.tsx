import type { VideoItem } from '@/types';

interface FeedActionsProps {
  video: VideoItem;
  liked: boolean;
  onLike: () => void;
  onShare: () => void;
  onGenerate: () => void;
}

export function FeedActions({
  video,
  liked,
  onLike,
  onShare,
  onGenerate,
}: FeedActionsProps) {
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
