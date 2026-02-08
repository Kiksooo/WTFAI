import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { config } from '../config.js';
import { createInvoiceLink } from '../services/telegram-payment.js';

const TIP_PAYLOAD_PREFIX = 'tip:';
const bodySchema = z.object({
  videoId: z.string().min(1),
  amountStars: z.number().int().min(1).max(500),
});

export const tipRoutes: FastifyPluginAsync = async (app) => {
  /** Создать инвойс на донат звёздами автору видео. */
  app.post<{ Body: z.infer<typeof bodySchema> }>('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const body = bodySchema.parse(request.body ?? {});

      const allowedAmounts = config.tipStarsOptions.length > 0 ? config.tipStarsOptions : [5, 10, 25];
      if (!allowedAmounts.includes(body.amountStars)) {
        return reply.status(400).send({
          error: `Invalid amount. Allowed: ${allowedAmounts.join(', ')} stars`,
          allowedAmounts,
        });
      }

      const video = await prisma.video.findUnique({
        where: { id: body.videoId },
        include: { createdBy: { select: { id: true, firstName: true } } },
      });
      if (!video) return reply.status(404).send({ error: 'Video not found' });

      const authorId = String(video.createdById);
      if (authorId === String(user.id)) {
        return reply.status(400).send({ error: 'Cannot tip your own video' });
      }

      const payload = `${TIP_PAYLOAD_PREFIX}${body.videoId}:${authorId}`.slice(0, 128);
      const invoiceUrl = await createInvoiceLink(
        payload,
        body.amountStars,
        'Donate to author',
        `Tip ${body.amountStars} stars for video`
      );

      return reply.send({
        invoiceUrl,
        starsAmount: body.amountStars,
        videoId: body.videoId,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Invalid body' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to create tip invoice' });
    }
  });

  /** Список допустимых сумм доната (для UI). */
  app.get('/options', async (_request, reply) => {
    const options = config.tipStarsOptions.length > 0 ? config.tipStarsOptions : [5, 10, 25];
    return reply.send({ amountStars: options });
  });
};
