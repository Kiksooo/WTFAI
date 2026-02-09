import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../db/index.js';
import { aiProvider } from '../services/ai/provider.js';
import { composeVideo } from '../services/video/composer.js';
import { saveBuffer, getPublicUrl } from '../services/storage.js';
import { config } from '../config.js';
import { refundStarsPayment } from '../services/telegram-payment.js';

export interface VideoJobPayload {
  jobId: string;
  userId: string;
  prompt: string;
}

const queue: VideoJobPayload[] = [];
let processing = false;

export function enqueueVideoJob(payload: VideoJobPayload): void {
  queue.push(payload);
  processNext().catch((err) => {
    console.error('Video queue processNext error:', err);
  });
}

async function processNext(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;
  const payload = queue.shift()!;
  try {
    console.info('Video job starting:', payload.jobId);
    await processVideoJob(payload);
    console.info('Video job done:', payload.jobId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Video job failed:', payload.jobId, errMsg, err);
    const errorForDb = errMsg.slice(0, 2000);
    try {
      await prisma.generationJob.update({
        where: { id: payload.jobId },
        data: { status: 'failed', error: errorForDb },
      });
    } catch (updateErr) {
      console.error('Failed to update job status to failed:', payload.jobId, updateErr);
    }
    // Вернуть звёзды, если оплата была за этот джоб
    try {
      const payment = await prisma.payment.findFirst({
        where: { jobId: payload.jobId },
      });
      if (payment) {
        const refunded = await refundStarsPayment(payment.userId, payment.telegramPaymentChargeId);
        if (refunded) console.info('Stars refunded for failed job:', payload.jobId);
      }
    } catch (refundErr) {
      console.error('Refund failed for job:', payload.jobId, refundErr);
    }
  } finally {
    processing = false;
    if (queue.length > 0) processNext();
  }
}

async function setProgress(jobId: string, progress: number): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { progress },
  });
}

async function processVideoJob(payload: VideoJobPayload): Promise<void> {
  await prisma.generationJob.update({
    where: { id: payload.jobId },
    data: { status: 'processing', progress: 5 },
  });

  // Быстрый режим: 1 сцена 5–6 сек, параллельно картинка + озвучка
  const scenes = await aiProvider.generateScript(payload.prompt, { fast: true });
  await setProgress(payload.jobId, 20);

  const sceneImages: { path: string }[] = [];
  const sceneAudios: { path: string }[] = [];

  await Promise.all(
    scenes.map(async (scene, i) => {
      const [imageBuffer, audioBuffer] = await Promise.all([
        aiProvider.generateSceneImage(scene.visual),
        aiProvider.generateSceneAudio(scene.text),
      ]);
      const relPath = await saveBuffer(imageBuffer, 'scenes', '.png');
      sceneImages.push({ path: relPath });
      if (audioBuffer && audioBuffer.length > 0) {
        const audioPath = await saveBuffer(audioBuffer, 'audio', '.mp3');
        sceneAudios.push({ path: audioPath });
      } else {
        sceneAudios.push({ path: '' });
      }
    })
  );
  await setProgress(payload.jobId, 55);

  const videoRelPath = `videos/${payload.jobId}.mp4`;
  const audiosToUse =
    sceneAudios.every((a) => a.path) && sceneAudios.length === scenes.length
      ? sceneAudios
      : undefined;

  await setProgress(payload.jobId, 75);
  await composeVideo({
    sceneImages,
    scenes,
    outputRelativePath: videoRelPath,
    sceneAudios: audiosToUse,
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
    data: { status: 'done', videoId: video.id, progress: 100 },
  });
}
