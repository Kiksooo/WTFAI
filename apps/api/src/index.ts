import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import { config } from './config.js';
import { telegramAuth } from './middleware/telegram-auth.js';
import { feedRoutes } from './routes/feed.js';
import { generateRoutes } from './routes/generate.js';
import { likeRoutes } from './routes/like.js';
import { meRoutes } from './routes/me.js';
import { myVideosRoutes } from './routes/my-videos.js';
import { jobRoutes } from './routes/job.js';
import { paymentRoutes } from './routes/payment.js';
import { tipRoutes } from './routes/tip.js';
import { feedbackRoutes } from './routes/feedback.js';
import { webhookTelegramRoutes } from './routes/webhook-telegram.js';
import { adminRoutes } from './routes/admin.js';

// Применить схему БД при старте (создать таблицы, если их нет)
try {
  execSync('npx prisma db push', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch (err) {
  console.error('Prisma db push failed. Check DATABASE_URL.', err);
  process.exit(1);
}

const app = Fastify({ logger: true });

// Проверка FFmpeg при старте (для отладки генерации видео)
try {
  execSync('ffmpeg -version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  app.log.info('FFmpeg: OK');
  console.log('FFmpeg: OK');
} catch {
  app.log.warn('FFmpeg: not found in PATH — генерация видео будет падать с ENOENT');
  console.warn('FFmpeg: not found in PATH — генерация видео будет падать с ENOENT');
}

app.setErrorHandler((err, request, reply) => {
  request.log.error(err);
  reply.status(err.statusCode ?? 500).send({
    error: err.statusCode === 500 ? 'Internal Server Error' : err.message,
  });
});

await app.register(cors, {
  origin: true,
  allowedHeaders: ['Content-Type', 'X-Telegram-Init-Data', 'X-Admin-Key'],
});
const staticRoot = path.resolve(process.cwd(), config.storagePath);
await fs.mkdir(staticRoot, { recursive: true });
await app.register(fastifyStatic, {
  root: staticRoot,
  prefix: '/static/',
  setHeaders: (res) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  },
});
await app.register(telegramAuth);
await app.register(feedRoutes, { prefix: '/feed' });
await app.register(generateRoutes, { prefix: '/generate' });
await app.register(likeRoutes, { prefix: '/like' });
await app.register(myVideosRoutes, { prefix: '/my-videos' });
await app.register(meRoutes, { prefix: '/me' });
await app.register(jobRoutes, { prefix: '/job' });
await app.register(paymentRoutes, { prefix: '/payment' });
await app.register(tipRoutes, { prefix: '/tip' });
await app.register(feedbackRoutes, { prefix: '/feedback' });
await app.register(webhookTelegramRoutes, { prefix: '/webhook' });
await app.register(adminRoutes, { prefix: '/admin' });

app.get('/health', async () => ({ ok: true }));

app.get('/', async (_request, reply) => {
  return reply.send({
    name: 'WTFAI API',
    health: '/health',
    admin: '/admin/* (X-Admin-Key required)',
  });
});

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
