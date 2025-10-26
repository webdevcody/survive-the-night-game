import type { Scene } from "./scene";
import type { AssetManager } from "@/managers/asset";
import type { SoundManager } from "@/managers/sound-manager";

export class SceneManager {
  private currentScene: Scene | null = null;
  private canvas: HTMLCanvasElement;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  // Shared resources across scenes
  private sharedAssetManager?: AssetManager;
  private sharedSoundManager?: SoundManager;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Set shared asset manager (loaded in LoadingScene)
   */
  public setAssetManager(assetManager: AssetManager): void {
    this.sharedAssetManager = assetManager;
  }

  /**
   * Get shared asset manager
   */
  public getAssetManager(): AssetManager | undefined {
    return this.sharedAssetManager;
  }

  /**
   * Set shared sound manager (loaded in LoadingScene)
   */
  public setSoundManager(soundManager: SoundManager): void {
    this.sharedSoundManager = soundManager;
  }

  /**
   * Get shared sound manager
   */
  public getSoundManager(): SoundManager | undefined {
    return this.sharedSoundManager;
  }

  /**
   * Switch to a new scene
   */
  public async switchScene(SceneClass: new (canvas: HTMLCanvasElement, sceneManager?: SceneManager) => Scene): Promise<void> {
    // Cleanup current scene
    if (this.currentScene) {
      this.currentScene.cleanup();
    }

    // Create and initialize new scene
    this.currentScene = new SceneClass(this.canvas, this);
    await this.currentScene.init();

    // Start the game loop if not already running
    // Note: GameScene manages its own loop, so we check the scene type
    if (!this.isRunning && this.currentScene.constructor.name !== 'GameScene') {
      this.start();
    } else if (this.currentScene.constructor.name === 'GameScene') {
      // Stop our loop for GameScene since it manages its own
      this.stop();
    }
  }

  /**
   * Start the game loop
   */
  private start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop
   */
  private gameLoop = (): void => {
    if (!this.isRunning || !this.currentScene) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    // Update and render current scene
    this.currentScene.update(deltaTime);
    this.currentScene.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  /**
   * Get the current scene
   */
  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Cleanup and destroy the scene manager
   */
  public destroy(): void {
    this.stop();
    if (this.currentScene) {
      this.currentScene.cleanup();
      this.currentScene = null;
    }
  }
}
