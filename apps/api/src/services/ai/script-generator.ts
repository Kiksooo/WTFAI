import OpenAI from 'openai';
import { config } from '../../config.js';
import type { Scene } from './types.js';

const SYSTEM_PROMPT = `You are a writer for short funny "What if" video clips (7–15 seconds total).
Given a user idea, output a JSON array of 3–5 scenes. Each scene must have:
- "text": one short line of dialogue or narration (max 8 words), funny or absurd
- "durationSec": 2 or 3
- "visual": one sentence description for image generation (scene, characters, style)
Total duration must be 7–15 seconds. Tone: light, humorous, no preaching.
Output ONLY valid JSON array, no markdown, no code block.`;

export async function generateScript(prompt: string): Promise<Scene[]> {
  if (!config.openaiApiKey) {
    return getMockScenes(prompt);
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty script response');

  const json = content.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Script must be an array');

  return parsed.map((s: Record<string, unknown>) => ({
    text: String(s.text ?? ''),
    durationSec: Number(s.durationSec ?? 2),
    visual: String(s.visual ?? ''),
  })) as Scene[];
}

function getMockScenes(prompt: string): Scene[] {
  return [
    { text: 'What if...', durationSec: 2, visual: `Scene about: ${prompt}, cartoon style, 9:16` },
    { text: 'Exactly this.', durationSec: 2, visual: `Continuation: ${prompt}, bright, vertical` },
    { text: 'The end.', durationSec: 2, visual: `Final scene: ${prompt}, comedy` },
  ];
}
