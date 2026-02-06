import { useEffect, useRef } from 'react';
import type { VideoItem } from '@/types';

interface VideoPlayerProps {
  video: VideoItem;
  isActive: boolean;
}

export function VideoPlayer({ video, isActive }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive]);

  return (
    <video
      ref={ref}
      src={video.videoUrl}
      poster={video.previewUrl ?? undefined}
      muted
      playsInline
      loop
      className="video-player"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
