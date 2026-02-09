import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import type { Scene } from '../ai/types.js';
import { getAbsolutePath } from '../storage.js';

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, (err, _stdout, stderr) => {
      if (err) {
        const msg = stderr && String(stderr).trim() ? `${err.message}\n${String(stderr)}` : err.message;
        reject(new Error(msg));
      } else {
        resolve();
      }
    });
  });
}

const W = 1080;
const H = 1920;

export interface ComposeInput {
  sceneImages: { path: string }[];
  scenes: Scene[];
  outputRelativePath: string;
  /** Пути к аудиофайлам озвучки по одной на сцену (опционально). */
  sceneAudios?: { path: string }[];
}

export async function composeVideo(input: ComposeInput): Promise<string> {
  const fullOutputPath = getAbsolutePath(input.outputRelativePath);
  const outputDir = path.dirname(fullOutputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const absImages = input.sceneImages.map((img) => getAbsolutePath(img.path));
  const durations = input.scenes.map((s) => s.durationSec);

  const hasAudio =
    input.sceneAudios &&
    input.sceneAudios.length === input.scenes.length &&
    input.sceneAudios.every((a) => a.path);

  if (hasAudio) {
    const absAudios = input.sceneAudios!.map((a) => getAbsolutePath(a.path));
    try {
      await composeVideoWithAudio(absImages, absAudios, durations, fullOutputPath);
    } catch (err) {
      console.warn('Compose with audio failed, falling back to silent video:', err instanceof Error ? err.message : err);
      await composeSilentVideo(absImages, durations, fullOutputPath);
    }
  } else {
    await composeSilentVideo(absImages, durations, fullOutputPath);
  }

  return input.outputRelativePath;
}

/** Сборка видео без звука. Для одной сцены — без concat (совместимость с FFmpeg в контейнере). */
async function composeSilentVideo(
  absPaths: string[],
  durations: number[],
  outputPath: string
): Promise<void> {
  if (absPaths.length === 1) {
    const D = durations[0];
    // scale+pad без выражений (pad без x,y центрирует) — совместимость с FFmpeg в контейнере
    await runFfmpeg([
      '-y',
      '-loop', '1',
      '-t', String(D),
      '-i', absPaths[0],
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H},format=yuv420p`,
      '-c:v', 'libx264',
      '-r', '30',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ]);
    return;
  }

  const filterParts: string[] = [];
  for (let i = 0; i < absPaths.length; i++) {
    filterParts.push(
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v${i}]`
    );
  }
  const concatInputs = absPaths.map((_, i) => `[v${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};${concatInputs}concat=n=${absPaths.length}:v=1:a=0[outv]`;

  const inputs: string[] = [];
  for (let i = 0; i < absPaths.length; i++) {
    inputs.push('-loop', '1', '-t', String(durations[i]), '-i', absPaths[i]);
  }
  await runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[outv]',
    '-c:v',
    'libx264',
    '-r',
    '30',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ]);
}

/** Сборка видео с озвучкой: для каждой сцены сегмент (картинка + аудио), затем конкатенация. */
async function composeVideoWithAudio(
  absImages: string[],
  absAudios: string[],
  durations: number[],
  outputPath: string
): Promise<void> {
  const segmentDir = path.join(path.dirname(outputPath), `_seg_${Date.now()}`);
  await fs.mkdir(segmentDir, { recursive: true });

  try {
    for (let i = 0; i < absImages.length; i++) {
      const segPath = path.join(segmentDir, `seg_${i}.mp4`);
      const D = durations[i];
      // Картинка D сек + аудио: atrim до D, затем apad до D сек. aresample для совместимости с aac.
      const filterComplex =
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v];` +
        `[1:a]aresample=44100,atrim=0:${D},apad=whole_dur=${D}[a]`;
      const args = [
        '-y',
        '-loop',
        '1',
        '-t',
        String(D),
        '-i',
        absImages[i],
        '-i',
        absAudios[i],
        '-filter_complex',
        filterComplex,
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        'libx264',
        '-r',
        '30',
        '-c:a',
        'aac',
        '-t',
        String(D),
        segPath,
      ];
      await runFfmpeg(args);
    }

    const listPath = path.join(segmentDir, 'list.txt');
    const listContent = absImages
      .map((_, i) => {
        const segPath = path.join(segmentDir, `seg_${i}.mp4`);
        const escaped = segPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `file '${escaped}'`;
      })
      .join('\n');
    await fs.writeFile(listPath, listContent, 'utf8');

    await runFfmpeg([
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c',
      'copy',
      outputPath,
    ]);
  } finally {
    await fs.rm(segmentDir, { recursive: true, force: true });
  }
}
