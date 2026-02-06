import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { config } from '../config.js';
import { enqueueVideoJob } from '../queue/video-job.js';

const bodySchema = z.object({
  prompt: z.string().min(1).max(500),
});

export const generateRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: z.infer<typeof bodySchema> }>('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = bodySchema.parse(request.body ?? {});

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

    if (dbUser.dailyGenerationsUsed >= dailyLimit) {
      return reply.status(429).send({
        error: 'Daily limit reached',
        dailyGenerationsUsed: dbUser.dailyGenerationsUsed,
        dailyLimit,
      });
    }

    const job = await prisma.generationJob.create({
      data: {
        userId: BigInt(user.id),
        prompt: body.prompt,
        status: 'queued',
      },
    });

    await prisma.user.update({
      where: { id: BigInt(user.id) },
      data: { dailyGenerationsUsed: dbUser.dailyGenerationsUsed + 1 },
    });

    enqueueVideoJob({
      jobId: job.id,
      userId: String(user.id),
      prompt: body.prompt,
    });

    return reply.send({
      jobId: job.id,
      status: 'queued',
    });
  });
};
