import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { config } from '../config.js';
import { createInvoiceLink } from '../services/telegram-payment.js';

const bodySchema = z.object({
  prompt: z.string().min(1).max(500),
});

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  /** Создать инвойс на оплату звёздами за одну генерацию. Джоб создаётся в awaiting_payment; после успешной оплаты webhook поставит его в очередь. */
  app.post<{ Body: z.infer<typeof bodySchema> }>('/create-invoice', async (request, reply) => {
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
      }

      const job = await prisma.generationJob.create({
        data: {
          userId: BigInt(user.id),
          prompt: body.prompt,
          status: 'awaiting_payment',
        },
      });

      const invoiceUrl = await createInvoiceLink(
        job.id,
        config.paymentStarsPerGeneration,
        '1 video generation',
        `AI video: ${body.prompt.slice(0, 100)}`
      );

      return reply.send({
        jobId: job.id,
        invoiceUrl,
        starsAmount: config.paymentStarsPerGeneration,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Invalid prompt' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to create invoice' });
    }
  });
};
