import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/index.js';

export const myVideosRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const videos = await prisma.video.findMany({
      where: { createdById: BigInt(user.id) },
      orderBy: { createdAt: 'desc' },
    });

    const items = videos.map((v) => ({
      id: v.id,
      prompt: v.prompt,
      videoUrl: v.videoUrl,
      previewUrl: v.previewUrl,
      likesCount: v.likesCount,
      viewsCount: v.viewsCount,
      createdAt: v.createdAt.toISOString(),
    }));

    return reply.send({ items });
  });
};
