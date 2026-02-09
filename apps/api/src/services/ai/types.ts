export interface Scene {
  text: string;
  durationSec: number;
  visual: string;
}

export interface IAiProvider {
  generateScript(prompt: string, options?: { fast?: boolean }): Promise<Scene[]>;
  generateSceneImage(scenePrompt: string): Promise<Buffer>;
  /** Озвучка текста сцены. Возвращает Buffer (MP3/WAV) или null, если TTS недоступен. */
  generateSceneAudio(text: string): Promise<Buffer | null>;
}
