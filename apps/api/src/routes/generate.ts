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

    try {
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

    const now = new Date();
    const hasActiveSubscription =
      dbUser.subscriptionExpiresAt && new Date(dbUser.subscriptionExpiresAt) > now
      && (dbUser.subscriptionPlan === 'basic' || dbUser.subscriptionPlan === 'vip');

    let limit: number;
    let used: number;
    let updateData: { dailyGenerationsUsed?: number; monthlyGenerationsUsed?: number };

    if (hasActiveSubscription) {
      limit = dbUser.subscriptionPlan === 'vip' ? config.vipMonthlyVideos : config.basicMonthlyVideos;
      used = dbUser.monthlyGenerationsUsed;
      if (used >= limit) {
        return reply.status(429).send({
          error: 'Monthly subscription limit reached',
          monthlyGenerationsUsed: used,
          monthlyLimit: limit,
          subscriptionPlan: dbUser.subscriptionPlan,
        });
      }
      updateData = { monthlyGenerationsUsed: dbUser.monthlyGenerationsUsed + 1 };
    } else {
      limit = dbUser.isPremium ? config.dailyLimitPremium : config.dailyLimitFree;
      used = dbUser.dailyGenerationsUsed;
      if (used >= limit) {
        return reply.status(429).send({
          error: 'Daily limit reached',
          dailyGenerationsUsed: dbUser.dailyGenerationsUsed,
          dailyLimit: limit,
          requiresPayment: true,
          starsAmount: config.paymentStarsPerGeneration,
        });
      }
      updateData = { dailyGenerationsUsed: dbUser.dailyGenerationsUsed + 1 };
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
      data: updateData,
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
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Invalid prompt' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to start generation' });
    }
  });
};
