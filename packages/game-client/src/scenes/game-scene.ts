import { Scene } from "./scene";
import { GameClient } from "@/client";
import type { SceneManager } from "./scene-manager";

export class GameScene extends Scene {
  private gameClient: GameClient;
  private serverUrl: string;

  constructor(canvas: HTMLCanvasElement, sceneManager?: SceneManager) {
    super(canvas);

    // Get server URL from environment
    this.serverUrl = import.meta.env.VITE_WSS_URL;

    // Get loaded asset and sound managers from scene manager
    const assetManager = sceneManager?.getAssetManager();
    const soundManager = sceneManager?.getSoundManager();

    if (!assetManager || !soundManager) {
      throw new Error("Assets not loaded! Make sure to go through LoadingScene first.");
    }

    // Create game client with pre-loaded managers
    this.gameClient = new GameClient(canvas, assetManager, soundManager);
  }

  async init(): Promise<void> {
    // Connect to server
    this.gameClient.connectToServer(this.serverUrl);

    // Start the game
    this.gameClient.start();
  }

  update(_deltaTime: number): void {
    // GameClient handles its own update loop
    // This scene's update is not used since GameClient manages its own RAF loop
  }

  render(): void {
    // GameClient handles its own rendering
    // This scene's render is not used since GameClient manages its own RAF loop
  }

  cleanup(): void {
    // Cleanup game client
    this.gameClient.unmount();
  }

  /**
   * Get the game client instance (for React integration)
   */
  public getGameClient(): GameClient {
    return this.gameClient;
  }
}
