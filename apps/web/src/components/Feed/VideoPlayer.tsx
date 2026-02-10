import { useEffect, useRef, useState } from 'react';
import type { VideoItem } from '@/types';

interface VideoPlayerProps {
  video: VideoItem;
  isActive: boolean;
}

export function VideoPlayer({ video, isActive }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [video.videoUrl]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive]);

  const url = video.videoUrl?.trim();
  if (!url) {
    return (
      <div className="video-player video-player--empty">
        <span>Нет ссылки на видео</span>
      </div>
    );
  }

  return (
    <>
      <video
        key={url}
        ref={ref}
        src={url}
        poster={video.previewUrl ?? undefined}
        muted
        playsInline
        loop
        preload="auto"
        crossOrigin="anonymous"
        className="video-player"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: error ? 'none' : undefined,
        }}
        onError={() => setError(true)}
      />
      {error && (
        <div className="video-player video-player--error">
          <span>Видео недоступно</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="video-player__link">
            Открыть в браузере
          </a>
        </div>
      )}
    </>
  );
}
