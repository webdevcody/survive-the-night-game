import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { getPlayer } from "@/util/get-player";

export interface DeathScreenPanelSettings extends PanelSettings {
  font: string;
  textColor: string;
  overlayBackground: string;
  panelBackground: string;
  text: string;
}

export class DeathScreenPanel extends Panel {
  private deathSettings: DeathScreenPanelSettings;

  constructor(settings: DeathScreenPanelSettings) {
    super(settings);
    this.deathSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player || !player.isDead()) {
      return;
    }

    this.resetTransform(ctx);

    ctx.font = this.deathSettings.font;
    const metrics = ctx.measureText(this.deathSettings.text);
    const padding = 30;

    // Calculate centered position
    const panelWidth = metrics.width + padding * 2;
    const panelHeight = 100;
    const x = (ctx.canvas.width - panelWidth) / 2;
    const y = (ctx.canvas.height - panelHeight) / 2;

    // Draw semi-transparent background overlay
    ctx.fillStyle = this.deathSettings.overlayBackground;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw panel background
    ctx.fillStyle = this.deathSettings.panelBackground;
    ctx.fillRect(x, y, panelWidth, panelHeight);

    // Draw text
    ctx.fillStyle = this.deathSettings.textColor;
    ctx.fillText(this.deathSettings.text, x + padding, y + 65);

    this.restoreContext(ctx);
  }
}
