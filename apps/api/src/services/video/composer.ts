import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';
import type { Scene } from '../ai/types.js';
import { getAbsolutePath } from '../storage.js';

const exec = promisify(execFile);

export interface ComposeInput {
  sceneImages: { path: string }[];
  scenes: Scene[];
  outputRelativePath: string;
}

export async function composeVideo(input: ComposeInput): Promise<string> {
  const fullOutputPath = getAbsolutePath(input.outputRelativePath);
  const outputDir = path.dirname(fullOutputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const absPaths = input.sceneImages.map((img) => getAbsolutePath(img.path));
  const durations = input.scenes.map((s) => s.durationSec);

  const filterParts: string[] = [];
  for (let i = 0; i < absPaths.length; i++) {
    filterParts.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v${i}]`
    );
  }
  const concatInputs = absPaths.map((_, i) => `[v${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};${concatInputs}concat=n=${absPaths.length}:v=1:a=0[outv]`;

  const ffmpegArgs = buildFfmpegArgs(absPaths, durations, filterComplex, fullOutputPath);
  await exec('ffmpeg', ffmpegArgs);

  return input.outputRelativePath;
}

function buildFfmpegArgs(
  absPaths: string[],
  durations: number[],
  filterComplex: string,
  outputPath: string
): string[] {
  const inputs: string[] = [];
  for (let i = 0; i < absPaths.length; i++) {
    inputs.push('-loop', '1', '-t', String(durations[i]), '-i', absPaths[i]);
  }
  return [
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
  ];
}
