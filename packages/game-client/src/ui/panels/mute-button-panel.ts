import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { SoundManager } from "@/managers/sound-manager";
import { scaleHudValue } from "@/util/hud-scale";

export interface MuteButtonPanelSettings extends PanelSettings {
  left: number;
  bottom: number;
  width: number;
  height: number;
  font: string;
  hoverBackground: string;
}

export interface MuteButtonConfig {
  baseWidth: number;
  baseHeight: number;
  baseFont: number;
  background: string;
  borderColor: string;
  borderWidth: number;
  hoverBackground: string;
}

export class MuteButtonPanel extends Panel {
  private buttonSettings: MuteButtonPanelSettings;
  private soundManager: SoundManager;
  private config: MuteButtonConfig;

  constructor(
    settings: MuteButtonPanelSettings,
    soundManager: SoundManager,
    config: MuteButtonConfig
  ) {
    super(settings);
    this.buttonSettings = settings;
    this.soundManager = soundManager;
    this.config = config;
  }

  /**
   * Update button position and size based on screen dimensions
   */
  public updatePosition(canvasWidth: number, canvasHeight: number): void {
    const muteWidth = scaleHudValue(this.config.baseWidth, canvasWidth, canvasHeight);
    const muteHeight = scaleHudValue(this.config.baseHeight, canvasWidth, canvasHeight);
    const muteFont = scaleHudValue(this.config.baseFont, canvasWidth, canvasHeight);
    const muteLeft = scaleHudValue(20, canvasWidth, canvasHeight); // 20px from left edge
    const muteBottom = scaleHudValue(20, canvasWidth, canvasHeight); // 40px from bottom edge

    this.buttonSettings.left = muteLeft;
    this.buttonSettings.bottom = muteBottom;
    this.buttonSettings.width = muteWidth;
    this.buttonSettings.height = muteHeight;
    this.buttonSettings.font = `${muteFont}px Arial`;
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
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const icon = isMuted ? "🔇" : "🔊";
    const iconX = x + this.buttonSettings.width / 2;
    const iconY = y + this.buttonSettings.height / 2;

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
