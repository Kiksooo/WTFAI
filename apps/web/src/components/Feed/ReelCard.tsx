import { VideoPlayer } from './VideoPlayer';
import { FeedActions } from './FeedActions';
import type { VideoItem } from '@/types';

interface ReelCardProps {
  video: VideoItem;
  isActive: boolean;
  liked: boolean;
  onLike: () => void;
  onShare: () => void;
  onGenerate: () => void;
}

export function ReelCard({
  video,
  isActive,
  liked,
  onLike,
  onShare,
  onGenerate,
}: ReelCardProps) {
  return (
    <div className="reel-card">
      <VideoPlayer video={video} isActive={isActive} />
      <div className="reel-card-overlay">
        <FeedActions
          video={video}
          liked={liked}
          onLike={onLike}
          onShare={onShare}
          onGenerate={onGenerate}
        />
      </div>
    </div>
  );
}
