import { useState, useCallback, useEffect } from 'react';
import { api } from '@/api/client';
import type { VideoItem } from '@/types';

export function useFeed() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.getFeed(offset, limit);
      setItems((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
      setOffset((prev) => prev + res.items.length);
      setHasMore(res.nextOffset !== undefined);
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [offset, loading, hasMore]);

  useEffect(() => {
    loadMore();
  }, []);

  const refresh = useCallback(() => {
    setOffset(0);
    setItems([]);
    setHasMore(true);
  }, []);

  const prependVideo = useCallback((video: VideoItem) => {
    setItems((prev) => [video, ...prev]);
  }, []);

  return { items, loadMore, loading, hasMore, refresh, prependVideo };
}
