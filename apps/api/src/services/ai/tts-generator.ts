import OpenAI from 'openai';
import Replicate from 'replicate';
import { config, isOpenAIKeyValid, isReplicateTokenValid } from '../../config.js';
import { isQuotaOrAuthError } from './errors.js';

/** Максимум символов на один запрос TTS (лимиты API) */
const MAX_TTS_CHARS = 4000;

/** Генерирует аудио для одной реплики. Возвращает Buffer (MP3/WAV) или null при недоступности TTS. */
export async function generateSceneAudio(text: string): Promise<Buffer | null> {
  const trimmed = text.trim().slice(0, MAX_TTS_CHARS);
  if (!trimmed) return null;

  if (isOpenAIKeyValid()) {
    try {
      const openai = new OpenAI({ apiKey: config.openaiApiKey });
      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: trimmed,
      });
      const buffer = Buffer.from(await speech.arrayBuffer());
      if (buffer.length > 0) return buffer;
    } catch (err: unknown) {
      if (!isQuotaOrAuthError(err)) throw err;
    }
  }

  if (isReplicateTokenValid()) {
    try {
      const replicate = new Replicate({ auth: config.replicateApiToken });
      const output = (await replicate.run('ttsds/bark', {
        input: { text: trimmed },
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

  return null;
}
