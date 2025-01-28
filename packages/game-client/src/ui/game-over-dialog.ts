import { GameState } from "@/state";

export class GameOverDialogUI {
  private gameOver: boolean = false;
  constructor() {}

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.gameOver) {
      return;
    }

    ctx.font = "32px Arial";
    ctx.fillStyle = "white";

    // Save current transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const text = "You All Died! Match will restart soon";
    const metrics = ctx.measureText(text);
    const padding = 20;

    // Calculate centered position
    const panelWidth = metrics.width + padding * 2;
    const panelHeight = 60;
    const x = (ctx.canvas.width - panelWidth) / 2;
    const y = (ctx.canvas.height - panelHeight) / 2;

    // Draw white background panel
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, panelWidth, panelHeight);

    // Draw black text
    ctx.fillStyle = "black";
    ctx.fillText(text, x + padding, y + 40);

    // Restore transform
    ctx.restore();
  }

  public show(): void {
    this.gameOver = true;
  }

  public hide(): void {
    this.gameOver = false;
  }
}
