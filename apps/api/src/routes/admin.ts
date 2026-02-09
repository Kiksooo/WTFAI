import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db/index.js';

function getAdminKey(headers: Record<string, string | string[] | undefined>): string {
  const v = headers['x-admin-key'] ?? headers['x-admin-key'.toLowerCase()];
  return Array.isArray(v) ? v[0] ?? '' : v ?? '';
}

function checkAdmin(request: { headers: Record<string, string | string[] | undefined> }, reply: { status: (code: number) => { send: (body: object) => void } }): boolean {
  if (!config.adminSecret) {
    reply.status(503).send({ error: 'Admin panel disabled (ADMIN_SECRET not set)' });
    return true;
  }
  const key = getAdminKey(request.headers);
  if (key !== config.adminSecret) {
    reply.status(401).send({ error: 'Invalid or missing X-Admin-Key' });
    return true;
  }
  return false;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (checkAdmin(request, reply)) return;
  });

  /** Сводка по проекту */
  app.get('/stats', async (_request, reply) => {
    try {
      const [usersCount, videosCount, jobsCount, paymentsCount, tipsCount] = await Promise.all([
        prisma.user.count(),
        prisma.video.count(),
        prisma.generationJob.count(),
        prisma.payment.count(),
        prisma.tip.count(),
      ]);

      const jobsByStatus = await prisma.generationJob.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      const [totalStarsPayments, totalStarsTips] = await Promise.all([
        prisma.payment.aggregate({ _sum: { amountStars: true } }),
        prisma.tip.aggregate({ _sum: { amountStars: true } }),
      ]);

      const recentVideos = await prisma.video.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, username: true, firstName: true } } },
      });

      const recentPayments = await prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      const recentTips = await prisma.tip.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { id: true, username: true, firstName: true } },
          toUser: { select: { id: true, username: true, firstName: true } },
        },
      });

      return reply.send({
        usersCount,
        videosCount,
        jobsCount,
        paymentsCount,
        tipsCount,
        totalStars: (totalStarsPayments._sum.amountStars ?? 0) + (totalStarsTips._sum.amountStars ?? 0),
        totalStarsPayments: totalStarsPayments._sum.amountStars ?? 0,
        totalStarsTips: totalStarsTips._sum.amountStars ?? 0,
        jobsByStatus: Object.fromEntries(jobsByStatus.map((s) => [s.status, s._count.id])),
        recentVideos: recentVideos.map((v) => ({
          id: v.id,
          prompt: v.prompt,
          videoUrl: v.videoUrl,
          likesCount: v.likesCount,
          createdAt: v.createdAt.toISOString(),
          createdBy: v.createdBy ? { id: String(v.createdBy.id), username: v.createdBy.username, firstName: v.createdBy.firstName } : null,
        })),
        recentPayments: recentPayments.map((p) => ({
          id: p.id,
          userId: String(p.userId),
          jobId: p.jobId,
          amountStars: p.amountStars,
          createdAt: p.createdAt.toISOString(),
        })),
        recentTips: recentTips.map((t) => ({
          id: t.id,
          videoId: t.videoId,
          fromUserId: String(t.fromUserId),
          fromUser: t.fromUser ? { id: String(t.fromUser.id), username: t.fromUser.username, firstName: t.fromUser.firstName } : null,
          toUserId: String(t.toUserId),
          toUser: t.toUser ? { id: String(t.toUser.id), username: t.toUser.username, firstName: t.toUser.firstName } : null,
          amountStars: t.amountStars,
          createdAt: t.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load stats' });
    }
  });

  /** Список пользователей */
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/users', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { videos: true } } },
        }),
        prisma.user.count(),
      ]);
      return reply.send({
        items: users.map((u) => ({
          id: String(u.id),
          username: u.username,
          firstName: u.firstName,
          isPremium: u.isPremium,
          dailyGenerationsUsed: u.dailyGenerationsUsed,
          videosCount: u._count.videos,
          createdAt: u.createdAt.toISOString(),
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load users' });
    }
  });

  /** Список видео */
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/videos', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, username: true, firstName: true } } },
        }),
        prisma.video.count(),
      ]);
      return reply.send({
        items: videos.map((v) => ({
          id: v.id,
          prompt: v.prompt,
          videoUrl: v.videoUrl,
          previewUrl: v.previewUrl,
          likesCount: v.likesCount,
          viewsCount: v.viewsCount,
          createdAt: v.createdAt.toISOString(),
          createdBy: v.createdBy ? { id: String(v.createdBy.id), username: v.createdBy.username, firstName: v.createdBy.firstName } : null,
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load videos' });
    }
  });

  /** Список джобов */
  app.get<{ Querystring: { limit?: string; offset?: string; status?: string } }>('/jobs', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
      const status = request.query.status?.trim() || undefined;
      const where = status ? { status } : {};
      const [jobs, total] = await Promise.all([
        prisma.generationJob.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.generationJob.count({ where }),
      ]);
      return reply.send({
        items: jobs.map((j) => ({
          id: j.id,
          userId: String(j.userId),
          prompt: j.prompt,
          status: j.status,
          videoId: j.videoId,
          error: j.error,
          createdAt: j.createdAt.toISOString(),
          updatedAt: j.updatedAt.toISOString(),
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load jobs' });
    }
  });

  /** Вручную вернуть звёзды за failed-джоб (если автовозврат не сработал). */
  app.post<{ Params: { jobId: string } }>('/jobs/:jobId/refund', async (request, reply) => {
    try {
      const { jobId } = request.params;
      const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
      if (!job) return reply.status(404).send({ error: 'Job not found' });
      if (job.status !== 'failed') return reply.status(400).send({ error: 'Refund only for failed jobs' });
      const payment = await prisma.payment.findFirst({ where: { jobId } });
      if (!payment) return reply.status(404).send({ error: 'No payment for this job' });
      const { refundStarsPayment } = await import('../services/telegram-payment.js');
      const ok = await refundStarsPayment(payment.userId, payment.telegramPaymentChargeId);
      if (!ok) return reply.status(502).send({ error: 'Telegram refund failed' });
      return reply.send({ ok: true, message: 'Stars refunded' });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Refund failed' });
    }
  });

  /** Список донатов (tips) */
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/tips', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
      const [tips, total] = await Promise.all([
        prisma.tip.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            fromUser: { select: { id: true, username: true, firstName: true } },
            toUser: { select: { id: true, username: true, firstName: true } },
          },
        }),
        prisma.tip.count(),
      ]);
      return reply.send({
        items: tips.map((t) => ({
          id: t.id,
          videoId: t.videoId,
          fromUserId: String(t.fromUserId),
          fromUser: t.fromUser ? { id: String(t.fromUser.id), username: t.fromUser.username, firstName: t.fromUser.firstName } : null,
          toUserId: String(t.toUserId),
          toUser: t.toUser ? { id: String(t.toUser.id), username: t.toUser.username, firstName: t.toUser.firstName } : null,
          amountStars: t.amountStars,
          createdAt: t.createdAt.toISOString(),
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load tips' });
    }
  });

  /** Список платежей */
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/payments', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.count(),
      ]);
      return reply.send({
        items: payments.map((p) => ({
          id: p.id,
          userId: String(p.userId),
          jobId: p.jobId,
          amountStars: p.amountStars,
          telegramPaymentChargeId: p.telegramPaymentChargeId,
          createdAt: p.createdAt.toISOString(),
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load payments' });
    }
  });

  /** Список обратной связи */
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/feedback', async (request, reply) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '50', 10)));
      const offset = Math.max(0, parseInt(request.query.offset ?? '0', 10));
      const [items, total] = await Promise.all([
        prisma.feedback.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.feedback.count(),
      ]);
      return reply.send({
        items: items.map((f) => ({
          id: f.id,
          userId: String(f.userId),
          message: f.message,
          createdAt: f.createdAt.toISOString(),
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to load feedback' });
    }
  });
};
