export abstract class Scene {
  protected ctx: CanvasRenderingContext2D;
  protected canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D rendering context");
    }
    this.ctx = ctx;
  }

  /**
   * Called when the scene is first initialized
   */
  abstract init(): Promise<void>;

  /**
   * Called every frame to update scene logic
   */
  abstract update(deltaTime: number): void;

  /**
   * Called every frame to render the scene
   */
  abstract render(): void;

  /**
   * Called when the scene is being destroyed/cleaned up
   */
  abstract cleanup(): void;

  /**
   * Get the canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get the rendering context
   */
  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
