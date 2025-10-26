import { Scene } from "./scene";
import { AssetManager } from "@/managers/asset";
import { SoundManager } from "@/managers/sound-manager";
import { SceneManager } from "./scene-manager";
import { NameEntryScene } from "./name-entry-scene";
import { GameScene } from "./game-scene";

export class LoadingScene extends Scene {
  private assetManager: AssetManager;
  private soundManager: SoundManager;
  private sceneManager: SceneManager;

  private totalSteps: number = 0;
  private currentStep: number = 0;
  private currentStage: string = "Initializing...";
  private isComplete: boolean = false;

  constructor(canvas: HTMLCanvasElement, sceneManager?: SceneManager) {
    super(canvas);
    this.sceneManager = sceneManager || (window as any).__sceneManager;
    this.assetManager = new AssetManager();
    this.soundManager = new SoundManager();
  }

  async init(): Promise<void> {
    // Start loading assets
    this.loadAllAssets();
  }

  private async loadAllAssets(): Promise<void> {
    try {
      // Load sprite sheets
      await this.assetManager.load((progress, total, stage) => {
        this.currentStep = progress;
        this.totalSteps = total + 11; // 3 sprite sheets + ~11 sounds
        this.currentStage = stage;
      });

      // Load sounds
      await this.soundManager.preloadSounds((progress, total, soundName) => {
        this.currentStep = 3 + progress; // After the 3 sprite sheets
        this.totalSteps = 3 + total;
        this.currentStage = `Loading sound: ${soundName}`;
      });

      this.isComplete = true;
      this.currentStage = "Complete!";

      // Store loaded managers in scene manager for other scenes to use
      this.sceneManager.setAssetManager(this.assetManager);
      this.sceneManager.setSoundManager(this.soundManager);

      // Wait a brief moment to show completion
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check if user already has a display name from the HTML form
      const displayName = localStorage.getItem("displayName");

      if (displayName) {
        // User already entered name, go straight to game
        await this.sceneManager.switchScene(GameScene);
      } else {
        // No name yet, show name entry scene
        await this.sceneManager.switchScene(NameEntryScene);
      }
    } catch (error) {
      console.error("Failed to load assets:", error);
      this.currentStage = "Error loading assets";
    }
  }

  update(_deltaTime: number): void {
    // No update logic needed for loading scene
  }

  render(): void {
    const { width, height } = this.canvas;

    // Clear screen
    this.ctx.fillStyle = "#1a1a2e";
    this.ctx.fillRect(0, 0, width, height);

    // Draw title
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("Survive the Night", width / 2, height / 2 - 100);

    // Draw loading bar background
    const barWidth = 400;
    const barHeight = 30;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    this.ctx.fillStyle = "#16213e";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Draw loading bar progress
    const progress = this.totalSteps > 0 ? this.currentStep / this.totalSteps : 0;
    const progressWidth = barWidth * progress;

    this.ctx.fillStyle = this.isComplete ? "#4CAF50" : "#0f3460";
    this.ctx.fillRect(barX, barY, progressWidth, barHeight);

    // Draw loading bar border
    this.ctx.strokeStyle = "#e94560";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Draw progress text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "20px Arial";
    const percentage = Math.round(progress * 100);
    this.ctx.fillText(`${percentage}%`, width / 2, barY + barHeight / 2);

    // Draw current stage
    this.ctx.fillStyle = "#a0a0a0";
    this.ctx.font = "16px Arial";
    this.ctx.fillText(this.currentStage, width / 2, barY + barHeight + 30);
  }

  cleanup(): void {
    // No cleanup needed
  }

  /**
   * Get the loaded asset manager (for next scene)
   */
  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  /**
   * Get the loaded sound manager (for next scene)
   */
  public getSoundManager(): SoundManager {
    return this.soundManager;
  }
}
