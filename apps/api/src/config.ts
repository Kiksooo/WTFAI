import { config as loadEnv } from 'dotenv';

loadEnv();

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  /** Groq — бесплатный тир для сценариев (Llama). Опционально, если нет OpenAI. */
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  /** Replicate — бесплатный старт для картинок (SDXL). Опционально, если нет OpenAI. */
  replicateApiToken: process.env.REPLICATE_API_TOKEN ?? '',
  /** В production (Railway и т.д.) по умолчанию /tmp/uploads — образ часто read-only, кроме /tmp */
  storagePath: process.env.STORAGE_PATH ?? (process.env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads'),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  dailyLimitFree: parseInt(process.env.DAILY_LIMIT_FREE ?? '2', 10),
  dailyLimitPremium: parseInt(process.env.DAILY_LIMIT_PREMIUM ?? '20', 10),
  /** Оплата звёздами: сколько звёзд за одну генерацию (Telegram Stars, XTR) */
  paymentStarsPerGeneration: parseInt(process.env.PAYMENT_STARS_PER_GENERATION ?? '5', 10),
  /** Подписка Basic ($2.99/мес): 32 видео/мес — при полном использовании маржа ~24% (себестоимость ~$0.05/видео) */
  basicMonthlyVideos: parseInt(process.env.BASIC_MONTHLY_VIDEOS ?? '32', 10),
  basicPriceStars: parseInt(process.env.BASIC_PRICE_STARS ?? '230', 10),
  /** Подписка VIP ($9.99/мес): 100 видео/мес — при полном использовании маржа ~28% */
  vipMonthlyVideos: parseInt(process.env.VIP_MONTHLY_VIDEOS ?? '100', 10),
  vipPriceStars: parseInt(process.env.VIP_PRICE_STARS ?? '770', 10),
  /** Секрет для проверки webhook от Telegram (X-Telegram-Bot-Api-Secret-Token). Задай при настройке setWebhook. */
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
  /** В dev: пропускать проверку Telegram, подставлять тестового пользователя (только для локальной разработки) */
  devSkipTelegramAuth: process.env.DEV_SKIP_TELEGRAM_AUTH === 'true',
  /** Секрет для доступа к админке (заголовок X-Admin-Key). Если пусто — админка отключена. */
  adminSecret: process.env.ADMIN_SECRET ?? '',
  /** Варианты сумм доната звёздами за видео (через запятую). */
  tipStarsOptions: (process.env.TIP_STARS_OPTIONS ?? '5,10,25').split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n > 0),
} as const;

/** Использовать OpenAI только если ключ задан и не плейсхолдер (your_openai_key и т.п.) */
export function isOpenAIKeyValid(): boolean {
  const k = (config.openaiApiKey ?? '').trim();
  return k.length > 20 && !/^your_ope|^sk-xxx|placeholder/i.test(k);
}

/** Groq — бесплатный тир; использовать для сценариев, если нет OpenAI */
export function isGroqKeyValid(): boolean {
  const k = (config.groqApiKey ?? '').trim();
  return k.length > 10 && !/^your_|placeholder/i.test(k);
}

/** Replicate — бесплатный старт; использовать для картинок, если нет OpenAI */
export function isReplicateTokenValid(): boolean {
  const t = (config.replicateApiToken ?? '').trim();
  return t.length > 20 && !/^r8_xxx|placeholder/i.test(t);
}
