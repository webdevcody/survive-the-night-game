import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { SoundManager } from "@/managers/sound-manager";
import { scaleHudValue } from "@/util/hud-scale";

export interface MuteButtonPanelSettings extends PanelSettings {
  left: number;
  top: number;
  width: number;
  height: number;
  font: string;
  hoverBackground: string;
}

export interface MuteButtonConfig {
  baseWidth: number;
  baseHeight: number;
  baseFont: number;
  /** Horizontal gap between exit button right edge and mute (base px, scaled). */
  baseGapFromExit: number;
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
   * Top row: immediately to the right of the exit anchor (same `top` as exit).
   */
  public updatePosition(
    canvasWidth: number,
    canvasHeight: number,
    exitAnchor: { left: number; top: number; width: number; height: number }
  ): void {
    const muteWidth = scaleHudValue(this.config.baseWidth, canvasWidth, canvasHeight);
    const muteHeight = scaleHudValue(this.config.baseHeight, canvasWidth, canvasHeight);
    const muteFont = scaleHudValue(this.config.baseFont, canvasWidth, canvasHeight);
    const gap = scaleHudValue(this.config.baseGapFromExit, canvasWidth, canvasHeight);

    this.buttonSettings.left = exitAnchor.left + exitAnchor.width + gap;
    this.buttonSettings.top = exitAnchor.top + (exitAnchor.height - muteHeight) / 2;
    this.buttonSettings.width = muteWidth;
    this.buttonSettings.height = muteHeight;
    this.buttonSettings.font = `${muteFont}px Arial`;
  }

  /** Pixel layout after `updatePosition`. */
  public getLayout(): { left: number; top: number; width: number; height: number } {
    return {
      left: this.buttonSettings.left,
      top: this.buttonSettings.top,
      width: this.buttonSettings.width,
      height: this.buttonSettings.height,
    };
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const isMuted = this.soundManager.getMuteState();
    const x = this.buttonSettings.left;
    const y = this.buttonSettings.top;

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

  public handleClick(x: number, y: number, _canvasHeight: number): boolean {
    const buttonX = this.buttonSettings.left;
    const buttonY = this.buttonSettings.top;

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

  public isMouseOver(x: number, y: number, _canvasHeight: number): boolean {
    const buttonX = this.buttonSettings.left;
    const buttonY = this.buttonSettings.top;

    return (
      x >= buttonX &&
      x <= buttonX + this.buttonSettings.width &&
      y >= buttonY &&
      y <= buttonY + this.buttonSettings.height
    );
  }
}
