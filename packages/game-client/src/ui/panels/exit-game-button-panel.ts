import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { scaleHudValue } from "@/util/hud-scale";
import { RPG_BORDER_GOLD, RPG_TITLE_CREAM } from "../rpg-hud-theme";

export interface ExitGameButtonPanelSettings extends PanelSettings {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ExitGameButtonConfig {
  baseWidth: number;
  baseHeight: number;
  baseLeft: number;
  baseTop: number;
  background: string;
  borderColor: string;
  borderWidth: number;
}

/** Door frame + right arrow, scaled to the button (vector, matches RPG HUD colors). */
function drawExitIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const pad = Math.max(2, Math.min(w, h) * 0.18);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const doorW = innerW * 0.42;
  const doorLeft = x + pad;
  const doorTop = y + pad;

  const lineW = Math.max(1.5, Math.min(w, h) * 0.1);
  ctx.strokeStyle = RPG_BORDER_GOLD;
  ctx.lineWidth = lineW;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Open doorway (three sides)
  ctx.beginPath();
  ctx.moveTo(doorLeft + doorW, doorTop);
  ctx.lineTo(doorLeft, doorTop);
  ctx.lineTo(doorLeft, doorTop + innerH);
  ctx.lineTo(doorLeft + doorW, doorTop + innerH);
  ctx.stroke();

  const ax0 = doorLeft + doorW + innerW * 0.06;
  const midY = y + h / 2;
  const stemW = innerW * 0.38;
  const stemH = Math.max(2, innerH * 0.14);
  const headW = innerW * 0.2;
  const headH = innerH * 0.36;

  ctx.fillStyle = RPG_TITLE_CREAM;
  ctx.strokeStyle = RPG_BORDER_GOLD;
  ctx.lineWidth = Math.max(1, lineW * 0.75);

  ctx.beginPath();
  ctx.moveTo(ax0, midY - stemH / 2);
  ctx.lineTo(ax0 + stemW, midY - stemH / 2);
  ctx.lineTo(ax0 + stemW, midY - headH / 2);
  ctx.lineTo(ax0 + stemW + headW, midY);
  ctx.lineTo(ax0 + stemW, midY + headH / 2);
  ctx.lineTo(ax0 + stemW, midY + stemH / 2);
  ctx.lineTo(ax0, midY + stemH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export class ExitGameButtonPanel extends Panel {
  private buttonSettings: ExitGameButtonPanelSettings;
  private config: ExitGameButtonConfig;
  private onExit: () => void;

  constructor(
    settings: ExitGameButtonPanelSettings,
    config: ExitGameButtonConfig,
    onExit: () => void
  ) {
    super(settings);
    this.buttonSettings = settings;
    this.config = config;
    this.onExit = onExit;
  }

  public updatePosition(canvasWidth: number, canvasHeight: number): void {
    const w = scaleHudValue(this.config.baseWidth, canvasWidth, canvasHeight);
    const h = scaleHudValue(this.config.baseHeight, canvasWidth, canvasHeight);
    this.buttonSettings.left = scaleHudValue(this.config.baseLeft, canvasWidth, canvasHeight);
    this.buttonSettings.top = scaleHudValue(this.config.baseTop, canvasWidth, canvasHeight);
    this.buttonSettings.width = w;
    this.buttonSettings.height = h;
  }

  /** Pixel layout after `updatePosition` (screen coordinates). */
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

    const x = this.buttonSettings.left;
    const y = this.buttonSettings.top;

    ctx.fillStyle = this.buttonSettings.background;
    ctx.fillRect(x, y, this.buttonSettings.width, this.buttonSettings.height);

    ctx.strokeStyle = this.buttonSettings.borderColor;
    ctx.lineWidth = this.buttonSettings.borderWidth;
    ctx.strokeRect(x, y, this.buttonSettings.width, this.buttonSettings.height);

    drawExitIcon(ctx, x, y, this.buttonSettings.width, this.buttonSettings.height);

    this.restoreContext(ctx);
  }

  public handleClick(x: number, y: number): boolean {
    const bx = this.buttonSettings.left;
    const by = this.buttonSettings.top;

    if (
      x >= bx &&
      x <= bx + this.buttonSettings.width &&
      y >= by &&
      y <= by + this.buttonSettings.height
    ) {
      this.onExit();
      return true;
    }
    return false;
  }

  public isMouseOver(x: number, y: number): boolean {
    const bx = this.buttonSettings.left;
    const by = this.buttonSettings.top;
    return (
      x >= bx &&
      x <= bx + this.buttonSettings.width &&
      y >= by &&
      y <= by + this.buttonSettings.height
    );
  }
}
