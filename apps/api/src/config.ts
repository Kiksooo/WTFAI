import { config as loadEnv } from 'dotenv';

loadEnv();

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  storagePath: process.env.STORAGE_PATH ?? './uploads',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  dailyLimitFree: parseInt(process.env.DAILY_LIMIT_FREE ?? '2', 10),
  dailyLimitPremium: parseInt(process.env.DAILY_LIMIT_PREMIUM ?? '20', 10),
  /** В dev: пропускать проверку Telegram, подставлять тестового пользователя (только для локальной разработки) */
  devSkipTelegramAuth: process.env.DEV_SKIP_TELEGRAM_AUTH === 'true',
} as const;
