import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { randomUUID } from 'crypto';

export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(config.storagePath, { recursive: true });
}

export async function saveBuffer(
  buffer: Buffer,
  subdir: string,
  ext: string
): Promise<string> {
  await ensureStorageDir();
  const dir = path.join(config.storagePath, subdir);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);
  return path.join(subdir, filename);
}

export function getPublicUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  return `${config.baseUrl}/static/${normalized}`;
}

/** Всегда возвращает абсолютный путь, чтобы FFmpeg и другие процессы находили файлы при любом cwd. */
export function getAbsolutePath(relativePath: string): string {
  return path.resolve(config.storagePath, relativePath);
}
