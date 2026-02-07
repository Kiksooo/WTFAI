export interface VideoItem {
  id: string;
  prompt: string;
  videoUrl: string;
  previewUrl: string | null;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  createdBy?: {
    id: string;
    username: string | null;
    firstName: string | null;
  };
}

export interface FeedResponse {
  items: VideoItem[];
  nextOffset?: number;
}

export interface MeResponse {
  id: string;
  firstName: string | null;
  username: string | null;
  isPremium: boolean;
  dailyGenerationsUsed: number;
  dailyLimit: number;
  starsPerGeneration?: number;
}

export interface PaymentInvoiceResponse {
  jobId: string;
  invoiceUrl: string;
  starsAmount: number;
}

export interface GenerateResponse {
  jobId: string;
  status: string;
}

export interface JobResponse {
  jobId: string;
  status: 'awaiting_payment' | 'queued' | 'processing' | 'done' | 'failed';
  videoId?: string;
  error?: string;
}

export interface LikeResponse {
  likesCount: number;
  liked: boolean;
}
