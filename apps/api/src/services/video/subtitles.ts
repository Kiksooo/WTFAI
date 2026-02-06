import type { Scene } from '../ai/types.js';

export function generateSrt(scenes: Scene[]): string {
  let currentSec = 0;
  return scenes
    .map((scene, i) => {
      const start = formatSrtTime(currentSec);
      currentSec += scene.durationSec;
      const end = formatSrtTime(currentSec);
      return `${i + 1}\n${start} --> ${end}\n${scene.text}\n`;
    })
    .join('\n');
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function pad(n: number, len = 2): string {
  return n.toString().padStart(len, '0');
}
