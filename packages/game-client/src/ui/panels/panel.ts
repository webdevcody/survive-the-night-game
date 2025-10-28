import { GameState } from "@/state";

export interface PanelSettings {
  padding: number;
  background: string;
  borderColor: string;
  borderWidth: number;
}

export abstract class Panel {
  protected settings: PanelSettings;

  constructor(settings: PanelSettings) {
    this.settings = settings;
  }

  /**
   * Renders the panel on the canvas
   * @param ctx - Canvas rendering context
   * @param gameState - Current game state
   */
  public abstract render(ctx: CanvasRenderingContext2D, gameState: GameState): void;

  /**
   * Draws a panel background with border
   * @param ctx - Canvas rendering context
   * @param x - X position
   * @param y - Y position
   * @param width - Panel width
   * @param height - Panel height
   */
  protected drawPanelBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Draw background
    ctx.fillStyle = this.settings.background;
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = this.settings.borderWidth;
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * Resets the canvas transform to work in pixel coordinates
   */
  protected resetTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * Restores the canvas context
   */
  protected restoreContext(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}
