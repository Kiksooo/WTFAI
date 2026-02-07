import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db/index.js';
import { enqueueVideoJob } from '../queue/video-job.js';

const TELEGRAM_API = 'https://api.telegram.org';

interface PreCheckoutQuery {
  id: string;
  from: { id: number };
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id?: string;
}

interface Update {
  update_id: number;
  pre_checkout_query?: PreCheckoutQuery;
  message?: {
    message_id: number;
    from?: { id: number };
    successful_payment?: SuccessfulPayment;
  };
}

async function answerPreCheckoutQuery(queryId: string, ok: boolean, errorMessage?: string): Promise<void> {
  if (!config.botToken) return;
  const url = `${TELEGRAM_API}/bot${config.botToken}/answerPreCheckoutQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pre_checkout_query_id: queryId,
      ok,
      error_message: errorMessage ?? undefined,
    }),
  });
}

export const webhookTelegramRoutes: FastifyPluginAsync = async (app) => {
  app.post('/telegram', async (request, reply) => {
    if (config.webhookSecret) {
      const secret = request.headers['x-telegram-bot-api-secret-token'] as string | undefined;
      if (secret !== config.webhookSecret) {
        return reply.status(403).send({ error: 'Invalid webhook secret' });
      }
    }

    const body = request.body as Update;
    if (!body || typeof body.update_id !== 'number') {
      return reply.status(400).send({ error: 'Invalid update' });
    }

    if (body.pre_checkout_query) {
      const q = body.pre_checkout_query;
      const job = await prisma.generationJob.findFirst({
        where: { id: q.invoice_payload, status: 'awaiting_payment' },
      });
      if (!job) {
        await answerPreCheckoutQuery(q.id, false, 'This order is no longer valid. Please try again.');
        return reply.send({ ok: true });
      }
      await answerPreCheckoutQuery(q.id, true);
      return reply.send({ ok: true });
    }

    if (body.message?.successful_payment) {
      const pay = body.message.successful_payment;
      const jobId = pay.invoice_payload;
      const chargeId = pay.telegram_payment_charge_id ?? '';
      const amountStars = Number(pay.total_amount) || 1;

      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
      });
      if (!job || job.status !== 'awaiting_payment') {
        return reply.send({ ok: true });
      }

      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'queued' },
      });

      if (chargeId) {
        try {
          await prisma.payment.create({
            data: {
              userId: job.userId,
              jobId,
              amountStars,
              telegramPaymentChargeId: chargeId,
            },
          });
        } catch {
          // дубликат оплаты (уже есть запись с таким charge_id) — игнорируем
        }
      }

      const user = await prisma.user.findUnique({
        where: { id: job.userId },
      });
      if (user) {
        await prisma.user.update({
          where: { id: job.userId },
          data: { dailyGenerationsUsed: user.dailyGenerationsUsed + 1 },
        });
      }

      enqueueVideoJob({
        jobId,
        userId: String(job.userId),
        prompt: job.prompt,
      });
    }

    return reply.send({ ok: true });
  });
};
