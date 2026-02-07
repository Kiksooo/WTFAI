import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';
import type { Scene } from '../ai/types.js';
import { getAbsolutePath } from '../storage.js';

const exec = promisify(execFile);

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
    await composeVideoWithAudio(absImages, absAudios, durations, fullOutputPath);
  } else {
    await composeSilentVideo(absImages, durations, fullOutputPath);
  }

  return input.outputRelativePath;
}

/** Сборка видео без звука (как раньше). */
async function composeSilentVideo(
  absPaths: string[],
  durations: number[],
  outputPath: string
): Promise<void> {
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
  await exec('ffmpeg', [
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
      // Картинка D сек + аудио (обрезать/дополнить тишиной до D)
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
        `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v];[1:a]atrim=0:${D},apad=whole_dur=${D}[a]`,
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
      await exec('ffmpeg', args);
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

    await exec('ffmpeg', [
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
