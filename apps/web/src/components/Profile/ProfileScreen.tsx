import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import type { VideoItem } from '@/types';

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMyVideos()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="profile-screen">
      <header className="screen-header">
        <button type="button" className="back-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">My videos</h1>
      </header>

      {loading && <p className="profile-loading">Loading…</p>}
      {error && <p className="profile-error">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="profile-empty">No videos yet. Create one!</p>
      )}
      {!loading && !error && items.length > 0 && (
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
    </div>
  );
}
