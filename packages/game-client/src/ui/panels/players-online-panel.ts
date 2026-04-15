import { GameState, getEntitiesByType } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { scaleHudValue } from "@/util/hud-scale";
import { Entities } from "@shared/constants";

export interface PlayersOnlinePanelSettings extends PanelSettings {
  textColor: string;
  baseFontPx: number;
  baseGapFromMute: number;
  basePadX: number;
}

export class PlayersOnlinePanel extends Panel {
  private readonly panelSettings: PlayersOnlinePanelSettings;
  private left = 0;
  private top = 0;
  private height = 0;
  private padX = 0;
  private font = "14px Arial";

  constructor(settings: PlayersOnlinePanelSettings) {
    super(settings);
    this.panelSettings = settings;
  }

  public updatePosition(
    canvasWidth: number,
    canvasHeight: number,
    muteLayout: { left: number; top: number; width: number; height: number }
  ): void {
    const gap = scaleHudValue(this.panelSettings.baseGapFromMute, canvasWidth, canvasHeight);
    this.padX = scaleHudValue(this.panelSettings.basePadX, canvasWidth, canvasHeight);
    const fontPx = scaleHudValue(this.panelSettings.baseFontPx, canvasWidth, canvasHeight);
    this.font = `${fontPx}px Arial`;
    this.left = muteLayout.left + muteLayout.width + gap;
    this.top = muteLayout.top;
    this.height = muteLayout.height;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const count = getEntitiesByType(gameState, Entities.PLAYER).length;
    const label = `Players online: ${count}`;
    ctx.font = this.font;
    const textWidth = ctx.measureText(label).width;
    const boxWidth = textWidth + this.padX * 2;
    const x = this.left;
    const y = this.top;

    this.drawPanelBackground(ctx, x, y, boxWidth, this.height);

    ctx.fillStyle = this.panelSettings.textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + boxWidth / 2, y + this.height / 2);

    this.restoreContext(ctx);
  }
}
