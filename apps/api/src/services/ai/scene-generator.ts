import OpenAI from 'openai';
import { config } from '../../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateSceneImage(scenePrompt: string): Promise<Buffer> {
  const fullPrompt = `${scenePrompt}, vertical aspect ratio 9:16, cinematic lighting, single scene, no text`;

  if (!config.openaiApiKey) {
    return getPlaceholderImage();
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: fullPrompt,
    n: 1,
    size: '1024x1792',
    response_format: 'b64_json',
  });

  const first = response.data?.[0];
  const b64 = first?.b64_json;
  if (!b64) throw new Error('No image in response');
  return Buffer.from(b64, 'base64');
}

function getPlaceholderImage(): Buffer {
  const placeholderPath = path.join(process.cwd(), 'placeholder.png');
  if (fs.existsSync(placeholderPath)) {
    return fs.readFileSync(placeholderPath);
  }
  // Minimal 1x1 PNG (transparent) so FFmpeg can read it when no OPENAI_API_KEY
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  return minimalPng;
}
