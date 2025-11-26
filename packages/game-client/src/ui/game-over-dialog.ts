import { GameState } from "@/state";

export interface GameOverData {
  message: string;
  winnerName: string | null;
  winnerId: number | null;
}

export class GameOverDialogUI {
  private gameOver: boolean = false;
  private gameOverData: GameOverData = {
    message: "Game Over",
    winnerName: null,
    winnerId: null,
  };

  constructor() {}

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.gameOver) {
      return;
    }

    // Save current transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const mainText = this.gameOverData.message;
    const subText = "Match will restart soon...";
    const padding = 30;
    const lineHeight = 35;

    // Measure text for sizing
    ctx.font = "bold 28px Arial";
    const mainMetrics = ctx.measureText(mainText);
    ctx.font = "18px Arial";
    const subMetrics = ctx.measureText(subText);

    const maxTextWidth = Math.max(mainMetrics.width, subMetrics.width);

    // Calculate panel dimensions
    const panelWidth = maxTextWidth + padding * 2;
    const panelHeight = 100;
    const x = (ctx.canvas.width - panelWidth) / 2;
    const y = (ctx.canvas.height - panelHeight) / 2;

    // Draw semi-transparent black background
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(x, y, panelWidth, panelHeight);

    // Draw border
    ctx.strokeStyle = this.gameOverData.winnerName ? "#FFD700" : "#FF4444";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    // Draw main text (winner message or game over)
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = this.gameOverData.winnerName ? "#FFD700" : "#FF4444";
    ctx.textAlign = "center";
    ctx.fillText(mainText, ctx.canvas.width / 2, y + 40);

    // Draw sub text
    ctx.font = "18px Arial";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText(subText, ctx.canvas.width / 2, y + 75);

    // Restore transform
    ctx.restore();
  }

  public show(data?: GameOverData): void {
    this.gameOver = true;
    if (data) {
      this.gameOverData = data;
    }
  }

  public hide(): void {
    this.gameOver = false;
    this.gameOverData = {
      message: "Game Over",
      winnerName: null,
      winnerId: null,
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }
}
