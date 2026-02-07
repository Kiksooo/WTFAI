import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { config } from '../config.js';
import { createInvoiceLink } from '../services/telegram-payment.js';

const bodySchema = z.object({
  prompt: z.string().min(1).max(500),
});

const subscriptionSchema = z.object({
  plan: z.enum(['basic', 'vip']),
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

  /** Подписка на месяц: Basic или VIP. После оплаты webhook выставит plan и срок. */
  app.post<{ Body: z.infer<typeof subscriptionSchema> }>('/create-subscription-invoice', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const { plan } = subscriptionSchema.parse(request.body ?? {});

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
            lastGenerationResetAt: new Date(),
          },
        });
      }

      const starsAmount = plan === 'vip' ? config.vipPriceStars : config.basicPriceStars;
      const intent = await prisma.subscriptionIntent.create({
        data: { userId: BigInt(user.id), plan },
      });
      const payload = `sub:${intent.id}`;

      const title = plan === 'vip' ? 'VIP — 1 month' : 'Basic — 1 month';
      const desc = plan === 'vip'
        ? `VIP: 300 videos/month, max quality, private, early access`
        : `Basic: 75 videos/month, no watermark, priority, exclusive templates`;

      const invoiceUrl = await createInvoiceLink(payload, starsAmount, title, desc);

      return reply.send({
        intentId: intent.id,
        invoiceUrl,
        starsAmount,
        plan,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Invalid plan' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to create subscription invoice' });
    }
  });
};
