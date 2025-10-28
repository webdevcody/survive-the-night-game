import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";

interface StatPanelSettings extends PanelSettings {
  x: number;
  y: number;
  icon: string;
  font: string;
  iconSize: number;
  spacing: number;
}

export class StatPanel extends Panel {
  private statSettings: StatPanelSettings;
  private getValue: (gameState: GameState) => string;

  constructor(settings: StatPanelSettings, getValue: (gameState: GameState) => string) {
    super(settings);
    this.statSettings = settings;
    this.getValue = getValue;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const { x, y } = this.statSettings;
    const text = this.getValue(gameState);

    ctx.save();
    ctx.font = this.statSettings.font;

    // Measure text
    const textMetrics = ctx.measureText(text);
    const iconMetrics = ctx.measureText(this.statSettings.icon);

    // Calculate dimensions
    const contentWidth = iconMetrics.width + this.statSettings.spacing + textMetrics.width;
    const containerWidth = contentWidth + this.settings.padding * 2;
    const containerHeight = this.statSettings.iconSize + this.settings.padding * 2;

    // Draw background with border
    this.drawPanelBackground(ctx, x, y, containerWidth, containerHeight);

    // Draw icon
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    const iconX = x + this.settings.padding;
    const iconY = y + containerHeight / 2;
    ctx.fillText(this.statSettings.icon, iconX, iconY);

    // Draw text
    const textX = iconX + iconMetrics.width + this.statSettings.spacing;
    ctx.fillText(text, textX, iconY);

    ctx.restore();

    this.restoreContext(ctx);
  }

  /**
   * Returns the height of the panel for layout purposes
   */
  public getHeight(ctx: CanvasRenderingContext2D): number {
    return this.statSettings.iconSize + this.settings.padding * 2;
  }
}
