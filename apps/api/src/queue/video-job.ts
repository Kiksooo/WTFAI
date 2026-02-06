import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../db/index.js';
import { aiProvider } from '../services/ai/provider.js';
import { composeVideo } from '../services/video/composer.js';
import { saveBuffer, getPublicUrl } from '../services/storage.js';
import { config } from '../config.js';

export interface VideoJobPayload {
  jobId: string;
  userId: string;
  prompt: string;
}

const queue: VideoJobPayload[] = [];
let processing = false;

export function enqueueVideoJob(payload: VideoJobPayload): void {
  queue.push(payload);
  processNext();
}

async function processNext(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;
  const payload = queue.shift()!;
  try {
    await processVideoJob(payload);
  } catch (err) {
    console.error('Video job failed:', payload.jobId, err);
    await prisma.generationJob.update({
      where: { id: payload.jobId },
      data: { status: 'failed', error: String(err) },
    });
  } finally {
    processing = false;
    if (queue.length > 0) processNext();
  }
}

async function processVideoJob(payload: VideoJobPayload): Promise<void> {
  await prisma.generationJob.update({
    where: { id: payload.jobId },
    data: { status: 'processing' },
  });

  const scenes = await aiProvider.generateScript(payload.prompt);
  const sceneImages: { path: string }[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const imageBuffer = await aiProvider.generateSceneImage(scenes[i].visual);
    const relPath = await saveBuffer(imageBuffer, 'scenes', '.png');
    sceneImages.push({ path: relPath });
  }

  const videoRelPath = `videos/${payload.jobId}.mp4`;
  await composeVideo({
    sceneImages,
    scenes,
    outputRelativePath: videoRelPath,
  });

  const videoUrl = getPublicUrl(videoRelPath);
  const previewUrl = sceneImages[0] ? getPublicUrl(sceneImages[0].path) : null;

  const video = await prisma.video.create({
    data: {
      prompt: payload.prompt,
      videoUrl,
      previewUrl,
      createdById: BigInt(payload.userId),
    },
  });

  await prisma.generationJob.update({
    where: { id: payload.jobId },
    data: { status: 'done', videoId: video.id },
  });
}
