import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/index.js';

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { jobId: string } }>('/:jobId', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const job = await prisma.generationJob.findFirst({
      where: {
        id: request.params.jobId,
        userId: BigInt(user.id),
      },
    });

    if (!job) return reply.status(404).send({ error: 'Job not found' });

    return reply.send({
      jobId: job.id,
      status: job.status,
      videoId: job.videoId ?? undefined,
      error: job.error ?? undefined,
    });
  });
};
