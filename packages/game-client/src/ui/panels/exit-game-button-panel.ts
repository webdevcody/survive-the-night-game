import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { scaleHudValue } from "@/util/hud-scale";
import { RPG_TITLE_CREAM } from "../rpg-hud-theme";

export interface ExitGameButtonPanelSettings extends PanelSettings {
  left: number;
  top: number;
  width: number;
  height: number;
  font: string;
}

export interface ExitGameButtonConfig {
  baseWidth: number;
  baseHeight: number;
  baseFont: number;
  baseLeft: number;
  baseTop: number;
  background: string;
  borderColor: string;
  borderWidth: number;
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
    const fontPx = scaleHudValue(this.config.baseFont, canvasWidth, canvasHeight);
    this.buttonSettings.left = scaleHudValue(this.config.baseLeft, canvasWidth, canvasHeight);
    this.buttonSettings.top = scaleHudValue(this.config.baseTop, canvasWidth, canvasHeight);
    this.buttonSettings.width = w;
    this.buttonSettings.height = h;
    this.buttonSettings.font = `${fontPx}px Arial`;
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

    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.font = this.buttonSettings.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Exit",
      x + this.buttonSettings.width / 2,
      y + this.buttonSettings.height / 2
    );

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
