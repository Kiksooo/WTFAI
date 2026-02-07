import OpenAI from 'openai';
import Replicate from 'replicate';
import { config, isOpenAIKeyValid, isReplicateTokenValid } from '../../config.js';
import { isQuotaOrAuthError } from './errors.js';
import fs from 'fs';
import path from 'path';

const SDXL_MODEL = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

export async function generateSceneImage(scenePrompt: string): Promise<Buffer> {
  const fullPrompt = `${scenePrompt}, vertical aspect ratio 9:16, cinematic lighting, single scene, no text`;

  if (isOpenAIKeyValid()) {
    try {
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
      if (b64) return Buffer.from(b64, 'base64');
    } catch (err: unknown) {
      if (!isQuotaOrAuthError(err)) throw err;
    }
  }

  if (isReplicateTokenValid()) {
    try {
      const replicate = new Replicate({ auth: config.replicateApiToken });
      const output = (await replicate.run(SDXL_MODEL, {
        input: { prompt: fullPrompt },
      })) as string | string[];
      const url = Array.isArray(output) ? output[0] : output;
      if (url && typeof url === 'string') {
        const res = await fetch(url);
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      }
    } catch (err: unknown) {
      if (!isQuotaOrAuthError(err)) throw err;
    }
  }

  return getPlaceholderImage();
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
