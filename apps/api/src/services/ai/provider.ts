import type { IAiProvider, Scene } from './types.js';
import { generateScript as genScript } from './script-generator.js';
import { generateSceneImage as genImage } from './scene-generator.js';

export const aiProvider: IAiProvider = {
  async generateScript(prompt: string): Promise<Scene[]> {
    return genScript(prompt);
  },
  async generateSceneImage(scenePrompt: string): Promise<Buffer> {
    return genImage(scenePrompt);
  },
};
