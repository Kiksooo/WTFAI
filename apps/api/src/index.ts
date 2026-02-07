import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config.js';
import { telegramAuth } from './middleware/telegram-auth.js';
import { feedRoutes } from './routes/feed.js';
import { generateRoutes } from './routes/generate.js';
import { likeRoutes } from './routes/like.js';
import { meRoutes } from './routes/me.js';
import { myVideosRoutes } from './routes/my-videos.js';
import { jobRoutes } from './routes/job.js';

const app = Fastify({ logger: true });

app.setErrorHandler((err, request, reply) => {
  request.log.error(err);
  reply.status(err.statusCode ?? 500).send({
    error: err.statusCode === 500 ? 'Internal Server Error' : err.message,
  });
});

await app.register(cors, { origin: true });
await app.register(fastifyStatic, {
  root: path.resolve(process.cwd(), config.storagePath),
  prefix: '/static/',
});
await app.register(telegramAuth);
await app.register(feedRoutes, { prefix: '/feed' });
await app.register(generateRoutes, { prefix: '/generate' });
await app.register(likeRoutes, { prefix: '/like' });
await app.register(myVideosRoutes, { prefix: '/my-videos' });
await app.register(meRoutes, { prefix: '/me' });
await app.register(jobRoutes, { prefix: '/job' });

app.get('/health', async () => ({ ok: true }));

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
