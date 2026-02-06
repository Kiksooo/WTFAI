export interface Scene {
  text: string;
  durationSec: number;
  visual: string;
}

export interface IAiProvider {
  generateScript(prompt: string): Promise<Scene[]>;
  generateSceneImage(scenePrompt: string): Promise<Buffer>;
}
