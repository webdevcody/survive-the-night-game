import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";

interface ZombieLivesPanelSettings extends PanelSettings {
  x: number;
  y: number;
  font: string;
  labelFont: string;
  textColor: string;
  livesColor: string;
}

export class ZombieLivesPanel extends Panel {
  private livesSettings: ZombieLivesPanelSettings;

  constructor(settings: ZombieLivesPanelSettings) {
    super(settings);
    this.livesSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // Only render if zombie lives state exists (infection mode)
    if (!gameState.zombieLivesState) {
      return;
    }

    this.resetTransform(ctx);

    const { x, y } = this.livesSettings;
    const { current } = gameState.zombieLivesState;

    ctx.save();

    // Single line text
    ctx.font = this.livesSettings.font;
    const livesText = `${current} zombie lives left`;
    const textMetrics = ctx.measureText(livesText);

    // Calculate dimensions
    const containerWidth = textMetrics.width + this.settings.padding * 2;
    const textHeight = parseInt(this.livesSettings.font);
    const containerHeight = textHeight + this.settings.padding * 2;

    // Draw background with border
    this.drawPanelBackground(ctx, x, y, containerWidth, containerHeight);

    // Draw lives text with glow effect
    ctx.fillStyle = this.livesSettings.livesColor;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.shadowColor = this.livesSettings.livesColor;
    ctx.shadowBlur = 8;
    ctx.fillText(livesText, x + containerWidth / 2, y + this.settings.padding);

    // Stronger glow
    ctx.shadowBlur = 16;
    ctx.fillText(livesText, x + containerWidth / 2, y + this.settings.padding);

    ctx.restore();

    this.restoreContext(ctx);
  }

  public getWidth(ctx: CanvasRenderingContext2D, gameState: GameState): number {
    if (!gameState.zombieLivesState) {
      return 0;
    }

    ctx.save();
    ctx.font = this.livesSettings.font;
    const livesText = `${gameState.zombieLivesState.current} zombie lives left`;
    const textWidth = ctx.measureText(livesText).width;
    ctx.restore();

    return textWidth + this.settings.padding * 2;
  }

  public getHeight(): number {
    const textHeight = parseInt(this.livesSettings.font);
    return textHeight + this.settings.padding * 2;
  }

  public setPosition(x: number, y: number): void {
    this.livesSettings.x = x;
    this.livesSettings.y = y;
  }
}
