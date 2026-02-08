import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/index.js';

export const feedbackRoutes: FastifyPluginAsync = async (app) => {
  /** Отправить обратную связь (авторизованный пользователь). */
  app.post<{ Body: { message?: string } }>('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const message = typeof request.body?.message === 'string'
      ? request.body.message.trim()
      : '';
    if (!message || message.length > 2000) {
      return reply.status(400).send({ error: 'Message required (max 2000 chars)' });
    }

    await prisma.feedback.create({
      data: {
        userId: BigInt(user.id),
        message,
      },
    });
    return reply.send({ ok: true });
  });
};
