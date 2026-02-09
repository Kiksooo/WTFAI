import OpenAI from 'openai';
import { config, isOpenAIKeyValid, isGroqKeyValid } from '../../config.js';

type OpenAIConstructor = new (opts: { apiKey: string; baseURL?: string }) => OpenAI;
import { isQuotaOrAuthError } from './errors.js';
import type { Scene } from './types.js';

const SYSTEM_PROMPT = `You are a writer for short funny "What if" video clips (7–15 seconds total).
Given a user idea, output a JSON array of 3–5 scenes. Each scene must have:
- "text": one short line of dialogue or narration (max 8 words), funny or absurd
- "durationSec": 2 or 3
- "visual": one sentence description for image generation (scene, characters, style)
Total duration must be 7–15 seconds. Tone: light, humorous, no preaching.
Output ONLY valid JSON array, no markdown, no code block.`;

const SYSTEM_PROMPT_FAST = `You write ONE short scene for a 5–6 second "What if" video. Output a JSON array with exactly ONE object:
- "text": one short funny line (max 6 words)
- "durationSec": 5 or 6
- "visual": one sentence for image (scene, style, 9:16 vertical)
Output ONLY valid JSON array, no markdown.`;

function parseScriptResponse(content: string): Scene[] {
  const json = content.replace(/^```\w*\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Script must be an array');
  return parsed.map((s: Record<string, unknown>) => ({
    text: String(s.text ?? ''),
    durationSec: Number(s.durationSec ?? 2),
    visual: String(s.visual ?? ''),
  })) as Scene[];
}

export async function generateScript(prompt: string, options?: { fast?: boolean }): Promise<Scene[]> {
  const fast = options?.fast ?? false;
  const systemPrompt = fast ? SYSTEM_PROMPT_FAST : SYSTEM_PROMPT;

  if (isOpenAIKeyValid()) {
    try {
      const openai = new (OpenAI as OpenAIConstructor)({ apiKey: config.openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) return parseScriptResponse(content);
    } catch (err: unknown) {
      if (!isQuotaOrAuthError(err)) throw err;
    }
  }

  if (isGroqKeyValid()) {
    try {
      const groq = new (OpenAI as OpenAIConstructor)({
        apiKey: config.groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) return parseScriptResponse(content);
    } catch (err: unknown) {
      if (!isQuotaOrAuthError(err)) throw err;
    }
  }

  return fast ? getMockScenesFast(prompt) : getMockScenes(prompt);
}

function getMockScenes(prompt: string): Scene[] {
  return [
    { text: 'What if...', durationSec: 2, visual: `Scene: ${prompt}, cartoon style, 9:16` },
    { text: 'The end.', durationSec: 2, visual: `Final: ${prompt}, comedy, vertical` },
  ];
}

function getMockScenesFast(prompt: string): Scene[] {
  return [
    { text: 'What if...', durationSec: 6, visual: `${prompt}, cartoon style, 9:16 vertical` },
  ];
}
