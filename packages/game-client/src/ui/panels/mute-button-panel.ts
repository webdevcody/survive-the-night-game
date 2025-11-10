import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { SoundManager } from "@/managers/sound-manager";

export interface MuteButtonPanelSettings extends PanelSettings {
  left: number;
  bottom: number;
  width: number;
  height: number;
  font: string;
  hoverBackground: string;
}

export class MuteButtonPanel extends Panel {
  private buttonSettings: MuteButtonPanelSettings;
  private soundManager: SoundManager;

  constructor(settings: MuteButtonPanelSettings, soundManager: SoundManager) {
    super(settings);
    this.buttonSettings = settings;
    this.soundManager = soundManager;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const isMuted = this.soundManager.getMuteState();
    const { height } = ctx.canvas;

    // Calculate button position (to the right of minimap)
    const x = this.buttonSettings.left;
    const y = height - this.buttonSettings.bottom - this.buttonSettings.height;

    // Draw button background
    ctx.fillStyle = this.buttonSettings.background;
    ctx.fillRect(x, y, this.buttonSettings.width, this.buttonSettings.height);

    // Draw border
    ctx.strokeStyle = this.buttonSettings.borderColor;
    ctx.lineWidth = this.buttonSettings.borderWidth;
    ctx.strokeRect(x, y, this.buttonSettings.width, this.buttonSettings.height);

    // Draw icon (speaker symbol)
    ctx.fillStyle = "white";
    ctx.font = this.buttonSettings.font;
    const icon = isMuted ? "🔇" : "🔊";
    const iconMetrics = ctx.measureText(icon);
    const iconX = x + (this.buttonSettings.width - iconMetrics.width) / 2;
    const iconY = y + this.buttonSettings.height / 2 + 14; // Adjust for vertical centering

    ctx.fillText(icon, iconX, iconY);

    this.restoreContext(ctx);
  }

  public handleClick(x: number, y: number, canvasHeight: number): boolean {
    const buttonX = this.buttonSettings.left;
    const buttonY = canvasHeight - this.buttonSettings.bottom - this.buttonSettings.height;

    if (
      x >= buttonX &&
      x <= buttonX + this.buttonSettings.width &&
      y >= buttonY &&
      y <= buttonY + this.buttonSettings.height
    ) {
      this.soundManager.toggleMute();
      return true;
    }

    return false;
  }
}
