import type { IAiProvider, Scene } from './types.js';
import { generateScript as genScript } from './script-generator.js';
import { generateSceneImage as genImage } from './scene-generator.js';
import { generateSceneAudio as genAudio } from './tts-generator.js';

export const aiProvider: IAiProvider = {
  async generateScript(prompt: string, options?: { fast?: boolean }): Promise<Scene[]> {
    return genScript(prompt, options);
  },
  async generateSceneImage(scenePrompt: string): Promise<Buffer> {
    return genImage(scenePrompt);
  },
  async generateSceneAudio(text: string): Promise<Buffer | null> {
    return genAudio(text);
  },
};
