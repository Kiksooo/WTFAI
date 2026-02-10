import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/index.js';
import { ensurePublicUrl } from '../services/storage.js';

const querySchema = z.object({
  offset: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export const feedRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Querystring: z.infer<typeof querySchema>;
  }>('/', async (request, reply) => {
    try {
      const q = querySchema.parse(request.query);
      const videos = await prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        skip: q.offset,
        take: q.limit,
        include: {
          createdBy: {
            select: { id: true, username: true, firstName: true },
          },
        },
      });
      const items = videos.map((v) => ({
        id: v.id,
        prompt: v.prompt,
        videoUrl: ensurePublicUrl(v.videoUrl) ?? v.videoUrl,
        previewUrl: ensurePublicUrl(v.previewUrl) ?? v.previewUrl,
        likesCount: v.likesCount,
        viewsCount: v.viewsCount,
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy
          ? {
              id: String(v.createdBy.id),
              username: v.createdBy.username,
              firstName: v.createdBy.firstName,
            }
          : undefined,
      }));
      const nextOffset = items.length === q.limit ? q.offset + q.limit : undefined;
      return reply.send({ items, nextOffset });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Invalid query' });
      }
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to load feed' });
    }
  });
};
