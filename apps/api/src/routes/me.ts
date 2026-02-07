import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/index.js';
import { config } from '../config.js';

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let dbUser = await prisma.user.findUnique({
        where: { id: BigInt(user.id) },
      });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            id: BigInt(user.id),
            username: user.username ?? null,
            firstName: user.first_name ?? null,
            isPremium: !!user.is_premium,
            dailyGenerationsUsed: 0,
            lastGenerationResetAt: today,
          },
        });
      } else {
        const lastReset = dbUser.lastGenerationResetAt
          ? new Date(dbUser.lastGenerationResetAt)
          : null;
        const resetDate = lastReset ? new Date(lastReset) : null;
        resetDate?.setHours(0, 0, 0, 0);
        if (!resetDate || resetDate.getTime() < today.getTime()) {
          dbUser = await prisma.user.update({
            where: { id: BigInt(user.id) },
            data: {
              dailyGenerationsUsed: 0,
              lastGenerationResetAt: today,
            },
          });
        }
      }

      const dailyLimit = dbUser.isPremium
        ? config.dailyLimitPremium
        : config.dailyLimitFree;

      return reply.send({
        id: String(dbUser.id),
        firstName: dbUser.firstName ?? null,
        username: dbUser.username ?? null,
        isPremium: dbUser.isPremium,
        dailyGenerationsUsed: dbUser.dailyGenerationsUsed,
        dailyLimit,
        starsPerGeneration: config.paymentStarsPerGeneration,
      });
    } catch (err: unknown) {
      request.log.error(err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Database error';
      return reply.status(500).send({
        error: msg.includes('table') || msg.includes('P2021')
          ? 'Таблицы не созданы. Проверь, что DATABASE_URL задан и сервис перезапущен.'
          : msg,
      });
    }
  });
};
