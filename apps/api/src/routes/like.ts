import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';

const bodySchema = z.object({
  videoId: z.string().min(1),
});

export const likeRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: z.infer<typeof bodySchema> }>('/', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = bodySchema.parse(request.body ?? {});

    const video = await prisma.video.findUnique({
      where: { id: body.videoId },
    });
    if (!video) return reply.status(404).send({ error: 'Video not found' });

    const userId = BigInt(user.id);
    const existing = await prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId: body.videoId } },
    });

    if (existing) {
      await prisma.like.delete({
        where: { userId_videoId: { userId, videoId: body.videoId } },
      });
      const updated = await prisma.video.update({
        where: { id: body.videoId },
        data: { likesCount: { decrement: 1 } },
      });
      return reply.send({ likesCount: updated.likesCount, liked: false });
    } else {
      await prisma.like.create({
        data: { userId, videoId: body.videoId },
      });
      const updated = await prisma.video.update({
        where: { id: body.videoId },
        data: { likesCount: { increment: 1 } },
      });
      return reply.send({ likesCount: updated.likesCount, liked: true });
    }
  });
};
