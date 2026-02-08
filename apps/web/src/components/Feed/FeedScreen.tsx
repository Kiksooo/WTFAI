import { useState, useCallback, useRef, useEffect } from 'react';
import { ReelCard } from './ReelCard';
import { useFeed } from '@/hooks/useFeed';
import { useTelegram } from '@/hooks/useTelegram';
import { api } from '@/api/client';
import type { VideoItem } from '@/types';

interface FeedScreenProps {
  onNavigateGenerate: () => void;
  onNavigateProfile: () => void;
}

export function FeedScreen({
  onNavigateGenerate,
  onNavigateProfile: _onNavigateProfile,
}: FeedScreenProps) {
  const { items, loadMore, hasMore } = useFeed();
  const { tg } = useTelegram();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLike = useCallback(async (video: VideoItem) => {
    try {
      const res = await api.like(video.id);
      setLikedSet((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(video.id);
        else next.delete(video.id);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleTip = useCallback(
    async (v: VideoItem, amountStars: number) => {
      try {
        const res = await api.createTipInvoice(v.id, amountStars);
        tg?.openInvoice?.(res.invoiceUrl) ?? window.open(res.invoiceUrl, '_blank');
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : 'Ошибка';
        tg?.showPopup?.({ message: msg }) ?? window.alert(msg);
      }
    },
    [tg]
  );

  const handleShare = useCallback(
    (video: VideoItem) => {
      const url = `${window.location.origin}${window.location.pathname}?startapp=video_${video.id}`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(video.prompt)}`;
      tg?.openTelegramLink?.(shareUrl);
    },
    [tg]
  );

  const handleSwipe = useCallback(
    (direction: 'up' | 'down') => {
      if (direction === 'up' && currentIndex < items.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else if (direction === 'down' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else if (direction === 'up' && currentIndex === items.length - 1 && hasMore) {
        loadMore();
      }
    },
    [currentIndex, items.length, hasMore, loadMore]
  );

  useEffect(() => {
    let startY = 0;
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const dy = startY - endY;
      if (Math.abs(dy) > 50) {
        handleSwipe(dy > 0 ? 'up' : 'down');
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleSwipe]);

  if (items.length === 0) {
    return (
      <div className="feed-empty">
        <p>No videos yet</p>
        <button type="button" className="btn-primary" onClick={onNavigateGenerate}>
          Create first
        </button>
      </div>
    );
  }

  const currentVideo = items[currentIndex];

  return (
    <div ref={containerRef} className="feed-screen">
      <div
        className="feed-list"
        style={{
          transform: `translateY(-${currentIndex * 100}vh)`,
        }}
      >
        {items.map((video) => (
          <div key={video.id} className="feed-slide">
            <ReelCard
              video={video}
              isActive={video.id === currentVideo?.id}
              liked={likedSet.has(video.id)}
              onLike={() => handleLike(video)}
              onShare={() => handleShare(video)}
              onGenerate={onNavigateGenerate}
              onTip={handleTip}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
