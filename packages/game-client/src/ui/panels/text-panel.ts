import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";

interface TextPanelSettings extends PanelSettings {
  x: number;
  y: number;
  text: string;
  font: string;
  textColor: string;
}

export class TextPanel extends Panel {
  private textSettings: TextPanelSettings;

  constructor(settings: TextPanelSettings) {
    super(settings);
    this.textSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const { x, y } = this.textSettings;

    ctx.save();
    ctx.font = this.textSettings.font;

    // Measure text
    const textMetrics = ctx.measureText(this.textSettings.text);

    // Calculate dimensions
    const containerWidth = textMetrics.width + this.settings.padding * 2;
    const containerHeight = parseInt(this.textSettings.font) + this.settings.padding * 2;

    // Draw background with border
    this.drawPanelBackground(ctx, x, y, containerWidth, containerHeight);

    // Draw text
    ctx.fillStyle = this.textSettings.textColor;
    ctx.textBaseline = "middle";
    const textX = x + this.settings.padding;
    const textY = y + containerHeight / 2;
    ctx.fillText(this.textSettings.text, textX, textY);

    ctx.restore();

    this.restoreContext(ctx);
  }

  /**
   * Update the text displayed in the panel
   */
  public setText(text: string): void {
    this.textSettings.text = text;
  }

  /**
   * Returns the height of the panel for layout purposes
   */
  public getHeight(): number {
    return parseInt(this.textSettings.font) + this.settings.padding * 2;
  }

  /**
   * Returns the width of the panel for layout purposes
   */
  public getWidth(ctx: CanvasRenderingContext2D): number {
    ctx.save();
    ctx.font = this.textSettings.font;
    const textMetrics = ctx.measureText(this.textSettings.text);
    ctx.restore();
    return textMetrics.width + this.settings.padding * 2;
  }
}
