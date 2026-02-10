import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db/index.js';
import { deleteFile, ensurePublicUrl } from '../services/storage.js';

function extractRelativeFromUrl(url: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf('/static/');
  if (i === -1) return null;
  return url.slice(i + '/static/'.length);
}

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
      videoUrl: ensurePublicUrl(v.videoUrl) ?? v.videoUrl,
      previewUrl: ensurePublicUrl(v.previewUrl) ?? v.previewUrl,
      likesCount: v.likesCount,
      viewsCount: v.viewsCount,
      createdAt: v.createdAt.toISOString(),
    }));

    return reply.send({ items });
  });

  // Удалить своё видео + файлы
  app.delete<{ Params: { videoId: string } }>('/:videoId', async (request, reply) => {
    const user = request.telegramUser;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const video = await prisma.video.findFirst({
      where: { id: request.params.videoId, createdById: BigInt(user.id) },
    });
    if (!video) return reply.status(404).send({ error: 'Video not found' });

    const relVideo = extractRelativeFromUrl(video.videoUrl);
    const relPreview = extractRelativeFromUrl(video.previewUrl);

    await Promise.all([deleteFile(relVideo), deleteFile(relPreview)]);

    await prisma.video.delete({ where: { id: video.id } });

    return reply.send({ ok: true });
  });
};
